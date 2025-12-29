// src/app/sender/[room]/page.tsx
"use client";

import { useWebRTC } from "@/hooks/useWebRTC";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Chat from "@/components/Chat/Chat";
import ROISelector, { ROIType } from "@/components/ROISelector/ROISelector";
import styles from "./sender.module.css";

function SenderComponent({ roomId }: { roomId: string }) {
  const {
    localStream,
    messages,
    isSharing,
    connectionState,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    applyROICropping,
    dataChannelRef,
    // executeRemoteControlEvent, // COMMENTED OUT: Remote control disabled
    // enableRemoteControl, // COMMENTED OUT: Remote control disabled
  } = useWebRTC(roomId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const [isSelectingROI, setIsSelectingROI] = useState(false);
  // const [isRemoteControlEnabled, setIsRemoteControlEnabled] = useState(false); // COMMENTED OUT: Remote control disabled

  useEffect(() => {
    const video = localVideoRef.current;
    if (video) {
      video.srcObject = localStream;
    }
  }, [localStream]);

  const handleROIDone = (roi: ROIType) => {
    const videoElement = localVideoRef.current;
    if (!videoElement || !localStream) return;

    // 1. 화면에 표시되는 <video> 요소의 실제 위치와 크기를 가져옵니다.
    const videoElementRect = videoElement.getBoundingClientRect();

    // 2. 공유되고 있는 비디오 스트림의 원본 해상도를 가져옵니다.
    const videoTrack = localStream.getVideoTracks()[0];
    const videoTrackSettings = videoTrack.getSettings();
    const intrinsicWidth = videoTrackSettings.width ?? videoElementRect.width;
    const intrinsicHeight =
      videoTrackSettings.height ?? videoElementRect.height;

    // 3. <video> 요소 안에서 실제 영상이 그려지는 영역을 계산합니다. (레터박스/필러박스 계산)
    const videoAspectRatio = intrinsicWidth / intrinsicHeight;
    const elementAspectRatio = videoElementRect.width / videoElementRect.height;

    let renderedVideoWidth = videoElementRect.width;
    let renderedVideoHeight = videoElementRect.height;
    let offsetX_inElement = 0;
    let offsetY_inElement = 0;

    if (elementAspectRatio > videoAspectRatio) {
      // 위아래에 검은 여백(레터박스)
      renderedVideoWidth = videoElementRect.height * videoAspectRatio;
      offsetX_inElement = (videoElementRect.width - renderedVideoWidth) / 2;
    } else {
      // 좌우에 검은 여백(필러박스)
      renderedVideoHeight = videoElementRect.width / videoAspectRatio;
      offsetY_inElement = (videoElementRect.height - renderedVideoHeight) / 2;
    }

    // 4. 사용자가 전체 화면에서 선택한 ROI 좌표를 -> '실제 영상 기준의 내부 좌표'로 변환합니다.
    const transformedRoi = JSON.parse(JSON.stringify(roi)); // roi 객체 복사
    const videoAbsoluteX = videoElementRect.left + offsetX_inElement;
    const videoAbsoluteY = videoElementRect.top + offsetY_inElement;

    if (transformedRoi.type === "circle") {
      transformedRoi.cx -= videoAbsoluteX;
      transformedRoi.cy -= videoAbsoluteY;
    } else {
      // polygon
      transformedRoi.points = transformedRoi.points.map((p) => ({
        x: p.x - videoAbsoluteX,
        y: p.y - videoAbsoluteY,
      }));
    }

    // 5. 변환된 정보로 크롭핑 함수를 호출합니다.
    applyROICropping({
      roi: transformedRoi,
      renderWidth: renderedVideoWidth,
      renderHeight: renderedVideoHeight,
    });

    setIsSelectingROI(false);
  };

  return (
    <div>
      {isSelectingROI && (
        <ROISelector
          onDone={handleROIDone}
          onCancel={() => setIsSelectingROI(false)}
        />
      )}
      <div className={styles.pageContainer}>
        <main className={styles.mainContent}>
          <h1>화면 공유 페이지 (Sender)</h1>
          <p>Room: {roomId}</p>
          <p className={styles.connectionStatus}>
            연결 상태:{" "}
            <span className={styles[connectionState]}>{connectionState}</span>
          </p>
          <div ref={videoWrapperRef} className={styles.videoWrapper}>
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              // style={{ pointerEvents: isRemoteControlEnabled ? 'auto' : 'none' }} // COMMENTED OUT: Remote control disabled
            />
          </div>
          <div className={styles.controls}>
            {!isSharing ? (
              <button onClick={startScreenShare} className={styles.startButton}>
                화면 공유 시작
              </button>
            ) : (
              <>
                <button onClick={stopScreenShare} className={styles.stopButton}>
                  화면 공유 중지
                </button>
                <button
                  onClick={() => setIsSelectingROI(true)}
                  className={styles.roiButton}
                >
                  영역 선택
                </button>
                {/* COMMENTED OUT: Remote control button disabled
                <button
                  onClick={() => {
                    const newState = !isRemoteControlEnabled;
                    setIsRemoteControlEnabled(newState);
                    enableRemoteControl(localVideoRef.current, newState);
                  }}
                  className={`${styles.roiButton} ${isRemoteControlEnabled ? styles.active : ''}`}
                >
                  {isRemoteControlEnabled ? '원격제어 비활성화' : '원격제어 활성화'}
                </button>
                */}
              </>
            )}
          </div>
        </main>
        <Chat messages={messages} sendMessage={sendMessage} />
      </div>
    </div>
  );
}

export default function SenderPage() {
  const params = useParams();
  const roomId = Array.isArray(params.room) ? params.room[0] : params.room;
  if (!roomId) {
    return <div>Loading Room...</div>;
  }
  return <SenderComponent roomId={roomId} />;
}
