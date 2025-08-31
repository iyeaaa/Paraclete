// src/app/viewer/[room]/page.tsx
"use client";

import { useWebRTC } from "@/hooks/useWebRTC";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import Chat from "@/components/Chat/Chat";
import styles from "./viewer.module.css";

function ViewerComponent({ roomId }: { roomId: string }) {
  const { remoteStream, messages, connectionState, sendMessage } =
    useWebRTC(roomId);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log(remoteStream);
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className={styles.pageContainer}>
      <main className={styles.mainContent}>
        <h1>화면 시청 페이지 (Viewer)</h1>
        <p>Room: {roomId}</p>
        <p className={styles.connectionStatus}>
          연결 상태:{" "}
          <span className={styles[connectionState]}>{connectionState}</span>
        </p>

        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          className={styles.videoPlayer}
        />
      </main>
      <Chat messages={messages} sendMessage={sendMessage} />
    </div>
  );
}

export default function ViewerPage() {
  const params = useParams();
  const roomId = Array.isArray(params.room) ? params.room[0] : params.room;

  if (!roomId) {
    return <div>Loading...</div>;
  }

  return <ViewerComponent roomId={roomId} />;
}
