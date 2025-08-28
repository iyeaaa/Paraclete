// src/hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

const SIGNALING_SERVER_URL = "http://localhost:3000";

/**
 * 시그널링 서버와의 Socket.IO 연결을 관리하는 커스텀 훅입니다.
 * @param {string} roomId - 참여할 룸의 ID
 * @returns {React.MutableRefObject<Socket | null>} Socket.IO 클라이언트 인스턴스를 담은 ref 객체
 */
export const useSocket = (roomId: string) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 컴포넌트 마운트 시 소켓 연결을 생성합니다.
    socketRef.current = io(SIGNALING_SERVER_URL);
    const socket = socketRef.current;

    // 연결 성공 시 서버에 'join' 이벤트를 보냅니다.
    socket.on("connect", () => {
      console.log(`Socket connected and joining room: ${roomId}`);
      socket.emit("join", roomId);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // 컴포넌트 언마운트 시 소켓 연결을 해제합니다.
    return () => {
      console.log('Disconnecting socket');
      socket.disconnect();
    };
  }, [roomId]);

  return socketRef;
};
