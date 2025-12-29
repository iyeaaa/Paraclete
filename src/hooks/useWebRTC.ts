// src/hooks/useWebRTC.ts
import { useSocket } from "./useSocket";
import { usePeerConnection } from "./usePeerConnection";
import { useDataChannel, ChatMessage } from "./useDataChannel";
import { useScreenShare } from "./useScreenShare";
import { useROICropping } from "./useROICropping";
// import { useRemoteControlReceiver } from "./useRemoteControlReceiver";
import { useRef, useCallback, useEffect, useState } from "react";

// 다른 컴포넌트에서 ChatMessage 타입을 사용할 수 있도록 export 합니다.
export { type ChatMessage };

/**
 * WebRTC의 모든 기능을 조합하여 제공하는 메인 커스텀 훅입니다.
 * 여러 개의 작은 훅들(useSocket, usePeerConnection 등)을 사용하여 로직을 구성합니다.
 * @param {string} roomId - 참여할 WebRTC 룸의 ID
 */
export const useWebRTC = (roomId: string) => {
  // 1. 소켓 연결 관리
  const socketRef = useSocket(roomId);

  // 2. PeerConnection 및 시그널링 관리
  const { pcRef, remoteStream, connectionState } = usePeerConnection(
    roomId,
    socketRef,
  );

  // 3. 데이터 채널(채팅) 관리
  const { messages, sendMessage, dataChannelRef, dataChannelState } = useDataChannel(pcRef);

  // 4. 화면 공유 관리
  const {
    localStream,
    setLocalStream,
    isSharing,
    startScreenShare,
    stopScreenShare,
    originalStreamRef,
  } = useScreenShare(pcRef, socketRef, roomId);

  // 5. ROI 잘라내기 관리
  const { applyROICropping } = useROICropping(
    pcRef,
    originalStreamRef,
    setLocalStream,
  );

  // 6. 원격제어 수신자 관리 (기본적으로 비활성화) - COMMENTED OUT
  /*
  const { executeRemoteControlEvent } = useRemoteControlReceiver(
    dataChannelRef,
    {
      enabled: dataChannelState === 'open', // 데이터 채널이 열려있을 때만 활성화
      targetElement: null, // 컴포넌트에서 설정
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0
    }
  );
  */

  // 원격제어 수신 기능을 동적으로 활성화/비활성화하는 함수 - COMMENTED OUT
  /*
  const enableRemoteControl = useCallback((targetElement: HTMLElement | null, enabled: boolean = true) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      console.log('Remote control enabled:', enabled, 'for element:', targetElement);
      // 여기서 원격제어 수신자 설정을 업데이트할 수 있습니다
    } else {
      console.log('Cannot enable remote control: data channel not ready, state:', dataChannelRef.current?.readyState);
    }
  }, [dataChannelRef]);
  */

  // UI 컴포넌트에 필요한 모든 상태와 함수를 반환합니다.
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
    dataChannelRef,
    dataChannelState,
    // executeRemoteControlEvent,
    // enableRemoteControl,
  };
};
