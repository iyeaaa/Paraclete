// src/hooks/usePeerConnection.ts
import { useRef, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/**
 * RTCPeerConnection을 생성하고 관리하며, 시그널링 로직을 처리하는 훅입니다.
 * @param {string} roomId - 참여할 룸의 ID
 * @param {React.MutableRefObject<Socket | null>} socketRef - useSocket 훅에서 받은 소켓 ref
 * @returns {{ pcRef: React.MutableRefObject<RTCPeerConnection | null>, remoteStream: MediaStream | null, connectionState: RTCPeerConnectionState }}
 */
export const usePeerConnection = (roomId: string, socketRef: React.MutableRefObject<Socket | null>) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

  // Offer를 받았을 때의 처리 로직
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!pcRef.current || !socketRef.current) return;
    console.log("Received offer");
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);
    socketRef.current.emit("answer", answer, roomId);
  }, [roomId, socketRef]);

  // Answer를 받았을 때의 처리 로직
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!pcRef.current) return;
    console.log("Received answer");
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  // ICE Candidate를 받았을 때의 처리 로직
  const handleIceCandidate = useCallback(async (ice: RTCIceCandidateInit) => {
    if (!pcRef.current) return;
    console.log("Received ICE candidate");
    await pcRef.current.addIceCandidate(new RTCIceCandidate(ice));
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // 연결 상태 변경 이벤트 핸들러
    pc.onconnectionstatechange = () => {
      if (pcRef.current) {
        setConnectionState(pcRef.current.connectionState);
      }
    };

    // ICE Candidate 생성 이벤트 핸들러
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice", event.candidate, roomId);
      }
    };

    // 원격 스트림 수신 이벤트 핸들러
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // 소켓 이벤트 리스너 등록
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice", handleIceCandidate);

    // 클린업 함수
    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice", handleIceCandidate);
      pc.close();
    };
  }, [roomId, socketRef, handleOffer, handleAnswer, handleIceCandidate]);

  return { pcRef, remoteStream, connectionState };
};
