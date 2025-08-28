// src/hooks/useScreenShare.ts
import { useState, useRef } from 'react';
import { Socket } from 'socket.io-client';

/**
 * 화면 공유 기능을 관리하는 커스텀 훅입니다.
 * @param {React.MutableRefObject<RTCPeerConnection | null>} pcRef - PeerConnection 참조
 * @param {React.MutableRefObject<Socket | null>} socketRef - 소켓 참조
 * @param {string} roomId - 룸 ID
 * @returns
 */
export const useScreenShare = (
  pcRef: React.MutableRefObject<RTCPeerConnection | null>,
  socketRef: React.MutableRefObject<Socket | null>,
  roomId: string
) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  // ROI 잘라내기 시 원본 스트림을 보존하기 위한 ref
  const originalStreamRef = useRef<MediaStream | null>(null);

  /**
   * 화면 공유를 시작합니다.
   */
  const startScreenShare = async () => {
    if (!pcRef.current || !socketRef.current) {
      console.error("PeerConnection or socket not initialized.");
      return;
    }
    try {
      // 사용자에게 화면 공유 권한을 요청합니다.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      originalStreamRef.current = stream; // 원본 스트림 저장
      setLocalStream(stream); // 화면에 표시할 스트림 업데이트

      // 스트림의 각 트랙을 PeerConnection에 추가합니다.
      stream.getTracks().forEach((track) => {
        pcRef.current?.addTrack(track, stream);
      });
      setIsSharing(true);

      // 트랙이 추가되었으므로, 재협상(re-negotiation)을 위해 새로운 Offer를 생성합니다.
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketRef.current.emit("offer", offer, roomId);

    } catch (error) {
      console.error("Failed to start screen share:", error);
      // 사용자가 화면 공유를 취소한 경우에도 에러가 발생할 수 있습니다.
    }
  };

  /**
   * 화면 공유를 중지합니다.
   */
  const stopScreenShare = () => {
    // 원본 스트림과 현재 로컬 스트림의 모든 트랙을 중지합니다.
    originalStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (localStream && localStream !== originalStreamRef.current) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    originalStreamRef.current = null;
    setIsSharing(false);

    // TODO: 상대방에게 스트림이 종료되었음을 알리고 PeerConnection의 트랙을 제거하는 로직 추가 필요
  };

  return { localStream, setLocalStream, isSharing, startScreenShare, stopScreenShare, originalStreamRef };
};
