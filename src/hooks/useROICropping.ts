// src/hooks/useROICropping.ts
import { useRef, useCallback, useEffect } from 'react';
import { ROIType } from "@/components/ROISelector/ROISelector";

// --- Helper Functions for ROI Cropping ---

/**
 * 브라우저가 Insertable Streams API를 지원하는지 확인합니다.
 */
const checkInsertableStreamsSupport = (): boolean => {
  if (
    typeof MediaStreamTrackProcessor === "undefined" ||
    typeof MediaStreamTrackGenerator === "undefined"
  ) {
    alert("사용 중인 브라우저가 Insertable Streams API를 지원하지 않습니다.");
    return false;
  }
  return true;
};

/**
 * 원격 피어에게 전송되는 비디오 트랙을 새 트랙으로 교체합니다.
 */
const replacePeerConnectionTrack = async (
  pc: RTCPeerConnection | null,
  newTrack: MediaStreamTrack,
) => {
  const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
  if (sender) {
    await sender.replaceTrack(newTrack);
    console.log("원격 트랙을 성공적으로 교체했습니다.");
  } else {
    console.error("비디오 송신자를 찾을 수 없습니다.");
  }
};

/**
 * 비디오 프레임 처리를 위한 웹 워커를 설정하고 스트림 파이프라인을 구성합니다.
 */
const setupCroppingWorker = (
  track: MediaStreamTrack,
  cropInfo: any,
  workerRef: React.MutableRefObject<Worker | null>,
): MediaStreamTrack => {
  if (workerRef.current) {
    workerRef.current.terminate();
  }

  const processor = new MediaStreamTrackProcessor({ track });
  const generator = new MediaStreamTrackGenerator({ kind: "video" });

  const readable = processor.readable;
  const writable = generator.writable;
  const settings = track.getSettings();

  const worker = new Worker(
    new URL("../../workers/shapeClip.worker.ts", import.meta.url),
  );
  workerRef.current = worker;

  worker.postMessage(
    {
      readable,
      writable,
      cropInfo,
      width: settings.width,
      height: settings.height,
    },
    [readable, writable],
  );

  return generator;
};

/**
 * ROI(관심 영역) 비디오 잘라내기 기능을 관리하는 커스텀 훅입니다.
 * @param pcRef - PeerConnection 참조
 * @param originalStreamRef - 원본 화면 공유 스트림 참조
 * @param setLocalStream - 로컬 스트림 상태를 업데이트하는 함수
 * @returns {{ applyROICropping: (cropInfo: any) => Promise<void> }}
 */
export const useROICropping = (
  pcRef: React.MutableRefObject<RTCPeerConnection | null>,
  originalStreamRef: React.MutableRefObject<MediaStream | null>,
  setLocalStream: React.Dispatch<React.SetStateAction<MediaStream | null>>
) => {
  const roiWorkerRef = useRef<Worker | null>(null);

  /**
   * ROI 정보를 받아 비디오 스트림 잘라내기를 적용합니다.
   */
  const applyROICropping = useCallback(
    async (cropInfo: {
      roi: ROIType;
      renderWidth: number;
      renderHeight: number;
    }) => {
      const streamToProcess = originalStreamRef.current;
      if (!streamToProcess) {
        alert("먼저 화면 공유를 시작해주세요.");
        return;
      }
      if (!checkInsertableStreamsSupport()) return;

      const [rawTrack] = streamToProcess.getVideoTracks();

      const croppedTrack = setupCroppingWorker(rawTrack, cropInfo, roiWorkerRef);

      const clippedStream = new MediaStream([croppedTrack]);
      setLocalStream(clippedStream); // 1. 로컬 미리보기를 잘린 스트림으로 교체

      await replacePeerConnectionTrack(pcRef.current, croppedTrack); // 2. 원격 피어에게 보낼 스트림을 잘린 트랙으로 교체
    },
    [originalStreamRef, pcRef, setLocalStream]
  );

  // 컴포넌트 언마운트 시 워커를 정리합니다.
  useEffect(() => {
    return () => {
      console.log("Terminating ROI worker");
      roiWorkerRef.current?.terminate();
    }
  }, []);

  return { applyROICropping };
};
