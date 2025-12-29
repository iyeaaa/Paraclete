// src/hooks/useDataChannel.ts
import { useState, useEffect, useRef, useCallback } from 'react';

export interface ChatMessage {
  text: string;
  sender: "me" | "other";
  timestamp: string;
}

export interface DataChannelMessage {
  type: 'chat'; // | 'remote-control'; // COMMENTED OUT: remote-control type disabled
  data: any;
}

/**
 * WebRTC 데이터 채널을 설정하고 채팅 메시지 송수신을 관리하는 훅입니다.
 * @param {React.MutableRefObject<RTCPeerConnection | null>} pcRef - usePeerConnection 훅에서 받은 피어커넥션 ref
 * @returns {{ messages: ChatMessage[], sendMessage: (message: string) => void, dataChannelRef: React.MutableRefObject<RTCDataChannel | null> }}
 */
export const useDataChannel = (pcRef: React.MutableRefObject<RTCPeerConnection | null>) => {
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dataChannelState, setDataChannelState] = useState<RTCDataChannelState>('closed');

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

  /**
   * 메시지를 파싱하고 타입에 따라 처리합니다.
   */
  const handleMessage = useCallback((message: string) => {
    try {
      const parsedMessage: DataChannelMessage = JSON.parse(message);
      
      if (parsedMessage.type === 'chat') {
        addMessage(parsedMessage.data, "other");
      }
      // COMMENTED OUT: remote-control message handling disabled
      /*
      else if (parsedMessage.type === 'remote-control') {
        // 원격제어 이벤트는 별도로 처리 (useRemoteControlReceiver에서 처리)
        console.debug('Remote control event received:', parsedMessage.data);
      }
      */
    } catch (error) {
      // 일반 텍스트 메시지로 처리
      addMessage(message, "other");
    }
  }, [addMessage]);

  // PeerConnection이 생성/변경될 때 데이터 채널을 설정합니다.
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc) {
      console.log('PeerConnection not available');
      setDataChannelState('closed');
      return;
    }

    console.log('Setting up data channel for PeerConnection:', pc.connectionState);

    // 발신자 측: 데이터 채널을 생성합니다.
    const dataChannel = pc.createDataChannel("chat", {
      ordered: true,
      maxRetransmits: 3
    });
    
    console.log('Data channel created:', dataChannel.label, 'State:', dataChannel.readyState);
    
    dataChannel.onopen = () => {
      console.log('Data channel opened');
      dataChannelRef.current = dataChannel;
      setDataChannelState(dataChannel.readyState);
    };
    
    dataChannel.onclose = () => {
      console.log('Data channel closed');
      dataChannelRef.current = null;
      setDataChannelState('closed');
    };
    
    dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      setDataChannelState('closed');
    };

    dataChannel.onmessage = (event) => handleMessage(event.data);

    // 수신자 측: 데이터 채널을 받았을 때의 이벤트 핸들러입니다.
    pc.ondatachannel = (event) => {
      console.log('Received data channel:', event.channel.label);
      const receiveChannel = event.channel;
      
      receiveChannel.onopen = () => {
        console.log('Received data channel opened');
        dataChannelRef.current = receiveChannel;
        setDataChannelState(receiveChannel.readyState);
      };
      
      receiveChannel.onclose = () => {
        console.log('Received data channel closed');
        dataChannelRef.current = null;
        setDataChannelState('closed');
      };
      
      receiveChannel.onerror = (error) => {
        console.error('Received data channel error:', error);
        setDataChannelState('closed');
      };

      receiveChannel.onmessage = (event) => handleMessage(event.data);
    };

    // 데이터 채널의 생명주기는 PeerConnection에 귀속되므로 별도의 클린업은 필요 없습니다.
  }, [pcRef, handleMessage]);

  /**
   * 데이터 채널을 통해 메시지를 전송하는 함수입니다.
   * @param {string} message - 보낼 메시지
   */
  const sendMessage = (message: string) => {
    if (dataChannelRef.current?.readyState === "open") {
      const chatMessage: DataChannelMessage = {
        type: 'chat',
        data: message
      };
      dataChannelRef.current.send(JSON.stringify(chatMessage));
      addMessage(message, "me");
    } else {
      console.error("Data channel is not open. Current state:", dataChannelRef.current?.readyState);
    }
  };

  return { messages, sendMessage, dataChannelRef, dataChannelState };
};
