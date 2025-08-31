// src/components/Chat/Chat.tsx
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import { ChatMessage } from '@/hooks/useWebRTC'; // 훅에서 정의한 타입 가져오기
import styles from './Chat.module.css';

// 컴포넌트가 받을 props 타입을 정의합니다.
interface ChatProps {
  messages: ChatMessage[];
  sendMessage: (message: string) => void;
}

export default function Chat({ messages, sendMessage }: ChatProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 추가될 때마다 스크롤을 맨 아래로 이동시킵니다.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className={styles.chatSidebar}>
      <header className={styles.chatHeader}>
        <h3>채팅</h3>
      </header>

      <main className={styles.chatMessages}>
        {messages.map((msg, index) => (
          <div key={index} className={`${styles.message} ${msg.sender === 'me' ? styles.mine : styles.other}`}>
            <p>{msg.text}</p>
            <span className={styles.timestamp}>{msg.timestamp}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className={styles.chatInput}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', width: '100%' }}>
          <input
            type="text"
            placeholder="메시지를 입력하세요"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={styles.textInput}
          />
          <button type="submit" className={styles.sendButton}>전송</button>
        </form>
      </footer>
    </div>
  );
}
