// src/hooks/useDataChannel.ts
import { useState, useEffect, useRef, useCallback } from 'react';

export interface ChatMessage {
  text: string;
  sender: "me" | "other";
  timestamp: string;
}

/**
 * WebRTC 데이터 채널을 설정하고 채팅 메시지 송수신을 관리하는 훅입니다.
 * @param {React.MutableRefObject<RTCPeerConnection | null>} pcRef - usePeerConnection 훅에서 받은 পियरकানেকশন ref
 * @returns {{ messages: ChatMessage[], sendMessage: (message: string) => void }}
 */
export const useDataChannel = (pcRef: React.MutableRefObject<RTCPeerConnection | null>) => {
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  /**
   * 채팅 메시지를 상태 배열에 추가하는 함수입니다.
   */
  const addMessage = useCallback((text: string, sender: "me" | "other") => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMessages((prevMessages) => [
      ...prevMessages,
      { text, sender, timestamp },
    ]);
  }, []);

  // PeerConnection이 생성/변경될 때 데이터 채널을 설정합니다.
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc) return;

    // 발신자 측: 데이터 채널을 생성합니다.
    const dataChannel = pc.createDataChannel("chat");
    dataChannel.onmessage = (event) => addMessage(event.data, "other");
    dataChannelRef.current = dataChannel;

    // 수신자 측: 데이터 채널을 받았을 때의 이벤트 핸들러입니다.
    pc.ondatachannel = (event) => {
      const receiveChannel = event.channel;
      receiveChannel.onmessage = (event) => addMessage(event.data, "other");
      dataChannelRef.current = receiveChannel;
    };

    // 데이터 채널의 생명주기는 PeerConnection에 귀속되므로 별도의 클린업은 필요 없습니다.
  }, [pcRef, addMessage]);

  /**
   * 데이터 채널을 통해 메시지를 전송하는 함수입니다.
   * @param {string} message - 보낼 메시지
   */
  const sendMessage = (message: string) => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(message);
      addMessage(message, "me");
    } else {
      console.error("Data channel is not open.");
    }
  };

  return { messages, sendMessage };
};
