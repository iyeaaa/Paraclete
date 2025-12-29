// src/app/viewer/[room]/page.tsx
"use client";

import { useWebRTC } from "@/hooks/useWebRTC";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Chat from "@/components/Chat/Chat";
// import RemoteControl from "@/components/RemoteControl/RemoteControl"; // COMMENTED OUT: Remote control disabled
import styles from "./viewer.module.css";

function ViewerComponent({ roomId }: { roomId: string }) {
  const { remoteStream, messages, connectionState, sendMessage, dataChannelRef, dataChannelState } =
    useWebRTC(roomId);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  // const [isRemoteControlEnabled, setIsRemoteControlEnabled] = useState(false); // COMMENTED OUT: Remote control disabled

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
        
        {/* COMMENTED OUT: Remote control component disabled
        <RemoteControl
          dataChannelRef={dataChannelRef}
          isEnabled={isRemoteControlEnabled}
          onToggle={() => setIsRemoteControlEnabled(!isRemoteControlEnabled)}
          dataChannelState={dataChannelState}
        />
        */}
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
