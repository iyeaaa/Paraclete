// src/hooks/useWebRTC.ts
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import { ROIType } from "@/components/ROISelector/ROISelector";

const SIGNALING_SERVER_URL = "http://localhost:3000";

export interface ChatMessage {
  text: string;
  sender: "me" | "other";
  timestamp: string;
}

// --- Helper Functions for ROI Cropping ---

/**
 * 브라우저가 Insertable Streams API를 지원하는지 확인합니다.
 * 이 API는 MediaStreamTrack의 원시 미디어 데이터를 조작할 수 있게 해줍니다.
 * @returns {boolean} 지원 여부
 */
const checkInsertableStreamsSupport = (): boolean => {
  if (
    typeof MediaStreamTrackProcessor === "undefined" ||
    typeof MediaStreamTrackGenerator === "undefined"
  ) {
    alert("사용 중인 브라우저가 Insertable Streams API를 지원하지 않습니다.");
    return false;
  }
  return true;
};

/**
 * 원격 피어에게 전송되는 비디오 트랙을 새 트랙으로 교체합니다.
 * @param {RTCPeerConnection | null} pc - RTCPeerConnection 인스턴스
 * @param {MediaStreamTrack} newTrack - 교체할 새로운 MediaStreamTrack
 */
const replacePeerConnectionTrack = async (
  pc: RTCPeerConnection | null,
  newTrack: MediaStreamTrack,
) => {
  const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
  if (sender) {
    await sender.replaceTrack(newTrack);
    console.log("원격 트랙을 성공적으로 교체했습니다.");
  } else {
    console.error("비디오 송신자를 찾을 수 없습니다.");
  }
};

/**
 * 비디오 프레임 처리를 위한 웹 워커를 설정하고 스트림 파이프라인을 구성합니다.
 * @param {MediaStreamTrack} track - 처리할 원본 비디오 트랙
 * @param {any} cropInfo - 잘라내기 정보
 * @param {React.MutableRefObject<Worker | null>} workerRef - 워커 참조
 * @returns {MediaStreamTrack} 새로 생성된, 잘라내기 처리된 트랙
 */
const setupCroppingWorker = (
  track: MediaStreamTrack,
  cropInfo: any,
  workerRef: React.MutableRefObject<Worker | null>,
): MediaStreamTrack => {
  // 기존 워커가 있다면 성능을 위해 종료합니다.
  if (workerRef.current) {
    workerRef.current.terminate();
  }

  const processor = new MediaStreamTrackProcessor({ track });
  const generator = new MediaStreamTrackGenerator({ kind: "video" });

  const readable = processor.readable;
  const writable = generator.writable;
  const settings = track.getSettings();

  const worker = new Worker(
    new URL("../../workers/shapeClip.worker.ts", import.meta.url),
  );
  workerRef.current = worker;

  // 워커에 스트림과 메타데이터를 전송합니다.
  // 스트림은 Transferable Object로 전달되어 소유권이 이전됩니다.
  worker.postMessage(
    {
      readable,
      writable,
      cropInfo,
      width: settings.width,
      height: settings.height,
    },
    [readable, writable],
  );

  return generator;
};

/**
 * WebRTC 연결의 모든 로직을 캡슐화하는 커스텀 훅입니다.
 * 피어 연결, 시그널링, 데이터 채널(채팅), 화면 공유 및 ROI(관심 영역) 비디오 잘라내기 기능을 관리합니다.
 * @param {string} roomId - 참여할 WebRTC 룸의 ID
 */
export const useWebRTC = (roomId: string) => {
  // --- State and Refs ---
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState>("new");

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const roiWorkerRef = useRef<Worker | null>(null);
  const originalStreamRef = useRef<MediaStream | null>(null); // ROI 적용을 위한 원본 스트림 저장

  // --- Chat and Data Channel ---

  /**
   * 채팅 메시지를 상태에 추가합니다.
   * @param {string} text - 메시지 내용
   * @param {"me" | "other"} sender - 발신자
   */
  const addMessage = (text: string, sender: "me" | "other") => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMessages((prevMessages) => [
      ...prevMessages,
      { text, sender, timestamp },
    ]);
  };

  /**
   * WebRTC 데이터 채널을 설정합니다.
   * 이 채널은 채팅 메시지 등 임의의 데이터를 교환하는 데 사용됩니다.
   */
  const setupDataChannel = useCallback((pc: RTCPeerConnection) => {
    // 발신자 측에서 데이터 채널 생성
    const dataChannel = pc.createDataChannel("chat");
    dataChannel.onmessage = (event) => addMessage(event.data, "other");
    dataChannelRef.current = dataChannel;

    // 수신자 측에서 데이터 채널 수신
    pc.ondatachannel = (event) => {
      const receiveChannel = event.channel;
      receiveChannel.onmessage = (event) => addMessage(event.data, "other");
      dataChannelRef.current = receiveChannel;
    };
  }, []);

  /**
   * 채팅 메시지를 데이터 채널을 통해 전송합니다.
   * @param {string} message - 전송할 메시지
   */
  const sendMessage = (message: string) => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(message);
      addMessage(message, "me");
    } else {
      console.error("데이터 채널이 열려있지 않습니다.");
    }
  };

  // --- Peer Connection and Signaling ---

  /**
   * RTCPeerConnection 객체를 생성하고 이벤트 핸들러를 설정합니다.
   * @returns {RTCPeerConnection} 생성된 피어 연결 객체
   */
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      // STUN 서버: 피어가 자신의 공개 IP 주소를 발견하도록 돕습니다.
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // 연결 상태 변경 시 상태 업데이트
    pc.onconnectionstatechange = () => setConnectionState(pc.connectionState);

    // ICE 후보 생성 시 시그널링 서버를 통해 상대방에게 전달
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice", event.candidate, roomId);
      }
    };

    // 상대방의 미디어 트랙 수신 시 remoteStream 상태 업데이트
    pc.ontrack = (event) => setRemoteStream(event.streams[0]);

    setupDataChannel(pc);
    return pc;
  }, [roomId, setupDataChannel]);

  // WebRTC 시그널링 이벤트 핸들러
  const handleOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      if (!pcRef.current || !socketRef.current) return;
      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(offer),
      );
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socketRef.current.emit("answer", answer, roomId);
    },
    [roomId],
  );

  const handleAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(answer),
      );
    },
    [],
  );

  const handleIceCandidate = useCallback(async (ice: RTCIceCandidateInit) => {
    if (!pcRef.current) return;
    await pcRef.current.addIceCandidate(new RTCIceCandidate(ice));
  }, []);

  // 컴포넌트 마운트 시 소켓 및 WebRTC 피어 연결 초기화
  useEffect(() => {
    socketRef.current = io(SIGNALING_SERVER_URL);
    pcRef.current = createPeerConnection();
    const socket = socketRef.current;
    const pc = pcRef.current;

    socket.on("connect", () => socket.emit("join", roomId));
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice", handleIceCandidate);

    // 컴포넌트 언마운트 시 모든 연결 정리
    return () => {
      socket.disconnect();
      pc.close();
      roiWorkerRef.current?.terminate();
    };
  }, [
    roomId,
    createPeerConnection,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
  ]);

  // --- Screen Sharing and ROI ---

  /**
   * 화면 공유를 시작합니다.
   * Offer/Answer 교환을 시작하여 피어 간 통신을 개시합니다.
   */
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      originalStreamRef.current = stream; // 원본 스트림 저장
      setLocalStream(stream);
      stream.getTracks().forEach((track) => {
        pcRef.current?.addTrack(track, stream);
      });
      setIsSharing(true);

      // 새로운 트랙이 추가되었으므로, Offer를 생성하여 상대방에게 알립니다.
      const offer = await pcRef.current?.createOffer();
      await pcRef.current?.setLocalDescription(offer);
      socketRef.current?.emit("offer", offer, roomId);
    } catch (error) {
      console.error("화면 공유를 시작할 수 없습니다:", error);
    }
  };

  /**
   * 화면 공유를 중지합니다.
   */
  const stopScreenShare = () => {
    // 원본 스트림과 현재 스트림의 모든 트랙을 중지합니다.
    originalStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (localStream && localStream !== originalStreamRef.current) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    originalStreamRef.current = null;
    setIsSharing(false);
    // TODO: 연결 종료 또는 스트림 제거에 대한 시그널링 필요
  };

  /**
   * 선택된 ROI(관심 영역)에 따라 비디오 스트림을 잘라냅니다.
   * Insertable Streams API를 사용하여 비디오 파이프라인에 개입하고,
   * Web Worker를 통해 메인 스레드 부하 없이 프레임별 연산을 수행합니다.
   */
  const applyROICropping = useCallback(
    async (cropInfo: {
      roi: ROIType;
      renderWidth: number;
      renderHeight: number;
    }) => {
      const streamToProcess = originalStreamRef.current;
      if (!streamToProcess) {
        alert("먼저 화면 공유를 시작해주세요.");
        return;
      }
      if (!checkInsertableStreamsSupport()) return;

      const [rawTrack] = streamToProcess.getVideoTracks();

      const croppedTrack = setupCroppingWorker(
        rawTrack,
        cropInfo,
        roiWorkerRef,
      );

      const clippedStream = new MediaStream([croppedTrack]);
      setLocalStream(clippedStream); // 1. 로컬 미리보기를 잘린 스트림으로 교체

      await replacePeerConnectionTrack(pcRef.current, croppedTrack); // 2. 원격 피어에게 보낼 스트림을 잘린 트랙으로 교체
    },
    [],
  );

  return {
    localStream,
    remoteStream,
    messages,
    isSharing,
    connectionState,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    applyROICropping,
  };
};
