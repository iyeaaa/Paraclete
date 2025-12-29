// src/hooks/usePeerConnection.ts
import { useRef, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

// 로컬 네트워크 전용 설정 (STUN/TURN 서버 불필요)
const ICE_SERVERS = {
  iceServers: [],
  // 로컬 연결만 허용 (호스트 후보만 사용)
  iceCandidatePoolSize: 0,
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
    if (!socketRef.current) {
      console.log('Socket not available');
      return;
    }

    const socket = socketRef.current;
    console.log('Creating new RTCPeerConnection with ICE servers:', ICE_SERVERS);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // 연결 상태 변경 이벤트 핸들러
    pc.onconnectionstatechange = () => {
      if (pcRef.current) {
        const newState = pcRef.current.connectionState;
        console.log('🔗 PeerConnection state changed:', newState);
        console.log('🧊 ICE connection state:', pcRef.current.iceConnectionState);
        console.log('📡 Signaling state:', pcRef.current.signalingState);
        console.log('🔌 ICE gathering state:', pcRef.current.iceGatheringState);
        setConnectionState(newState);

        // 연결 실패 시 상세 정보 출력
        if (newState === 'failed') {
          console.error('❌ WebRTC connection failed!');
          console.error('ICE connection state:', pcRef.current.iceConnectionState);
          console.error('Signaling state:', pcRef.current.signalingState);
        }
      }
    };

    // ICE 연결 상태 변경 이벤트 핸들러
    pc.oniceconnectionstatechange = () => {
      if (pcRef.current) {
        const iceState = pcRef.current.iceConnectionState;
        console.log('🧊 ICE connection state changed:', iceState);
        
        if (iceState === 'failed') {
          console.error('❌ ICE connection failed! Trying to restart ICE...');
          pcRef.current.restartIce();
        }
      }
    };

    // ICE 수집 상태 변경 이벤트 핸들러
    pc.onicegatheringstatechange = () => {
      if (pcRef.current) {
        console.log('🔍 ICE gathering state:', pcRef.current.iceGatheringState);
      }
    };

    // ICE Candidate 생성 이벤트 핸들러
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        const candidate = event.candidate;
        console.log('📤 Sending ICE candidate:', {
          type: candidate.type,
          protocol: candidate.protocol,
          address: candidate.address,
          port: candidate.port,
          priority: candidate.priority,
          relatedAddress: candidate.relatedAddress,
          relatedPort: candidate.relatedPort,
        });
        socketRef.current.emit("ice", candidate, roomId);
      } else if (!event.candidate) {
        console.log('✅ ICE gathering completed');
      }
    };

    // ICE Candidate 오류 핸들러 (로컬 전용이므로 에러 무시)
    pc.onicecandidateerror = (event: RTCPeerConnectionIceErrorEvent) => {
      // 로컬 네트워크에서는 STUN/TURN 에러가 정상적으로 발생하므로 무시
      console.debug('ICE candidate error (ignored for local network):', event.errorCode);
    };

    // 원격 스트림 수신 이벤트 핸들러
    pc.ontrack = (event) => {
      console.log('📹 Received remote track:', event.track.kind);
      setRemoteStream(event.streams[0]);
    };

    // 데이터 채널 이벤트 핸들러
    pc.ondatachannel = (event) => {
      console.log('📨 Received data channel:', event.channel.label);
    };

    // 소켓 이벤트 리스너 등록
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice", handleIceCandidate);

    console.log('✅ PeerConnection setup complete, waiting for connection...');

    // 클린업 함수
    return () => {
      console.log('🧹 Cleaning up PeerConnection');
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice", handleIceCandidate);
      pc.close();
    };
  }, [roomId, socketRef, handleOffer, handleAnswer, handleIceCandidate]);

  return { pcRef, remoteStream, connectionState };
};
