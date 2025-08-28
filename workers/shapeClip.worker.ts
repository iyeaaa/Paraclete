// workers/shapeClip.worker.ts

/**
 * 이 워커는 메인 스레드에서 받은 비디오 스트림을 실시간으로 처리합니다.
 * 주된 역할은 '관심 영역(ROI)'에 따라 비디오 프레임을 잘라내는 것입니다.
 * 이를 위해 OffscreenCanvas와 TransformStream을 사용하여 메인 스레드의 부하를 최소화합니다.
 */

// --- 타입 정의 ---
// self 컨텍스트에 VideoFrame 생성자가 존재하므로, 타입스크립트가 알 수 있도록 선언합니다.
declare const VideoFrame: any;

// 메인 스레드에서 전달받는 데이터의 타입을 정의합니다.
interface WorkerData {
  readable: ReadableStream<any>;
  writable: WritableStream<any>;
  cropInfo: CropInfo;
  width: number;
  height: number;
}

interface CropInfo {
  roi: ROIType;
  renderWidth: number;
  renderHeight: number;
}

interface ROIType {
  type: "circle" | "polygon";
  cx: number;
  cy: number;
  r: number;
  points: { x: number; y: number }[];
}

// --- 헬퍼 함수 ---

/**
 * 캔버스를 초기화하고 현재 비디오 프레임을 그립니다.
 * @param ctx - OffscreenCanvas 렌더링 컨텍스트
 * @param frame - 처리할 VideoFrame
 * @param width - 캔버스 너비
 * @param height - 캔버스 높이
 */
function drawFrame(
  ctx: OffscreenCanvasRenderingContext2D,
  frame: any,
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(frame, 0, 0, width, height);
}

/**
 * ROI(관심 영역)에 따라 프레임을 잘라냅니다.
 * @param ctx - OffscreenCanvas 렌더링 컨텍스트
 * @param roi - ROI 데이터 (타입, 좌표 등)
 * @param scaleX - X축 스케일 비율
 * @param scaleY - Y축 스케일 비율
 */
function clipFrameToROI(
  ctx: OffscreenCanvasRenderingContext2D,
  roi: ROIType,
  scaleX: number,
  scaleY: number,
) {
  // 'destination-in' 합성 모드는 새로 그리는 모양과 기존 픽셀이 겹치는 부분만 남깁니다.
  // 이를 이용해 마스킹(잘라내기) 효과를 구현합니다.
  ctx.globalCompositeOperation = "destination-in";

  ctx.beginPath();
  if (roi.type === "circle") {
    const scaledCx = roi.cx * scaleX;
    const scaledCy = roi.cy * scaleY;
    // 원의 반지름은 X, Y 스케일 중 작은 값을 기준으로 보정하여 종횡비를 유지합니다.
    const scaledR = roi.r * Math.min(scaleX, scaleY);
    ctx.arc(scaledCx, scaledCy, scaledR, 0, 2 * Math.PI);
  } else {
    // 'polygon'
    const firstPoint = roi.points[0];
    ctx.moveTo(firstPoint.x * scaleX, firstPoint.y * scaleY);
    roi.points.slice(1).forEach((p) => {
      ctx.lineTo(p.x * scaleX, p.y * scaleY);
    });
    ctx.closePath();
  }
  ctx.fill();

  // 다음 프레임에 영향을 주지 않도록 합성 모드를 기본값('source-over')으로 되돌립니다.
  ctx.globalCompositeOperation = "source-over";
}

/**
 * 처리된 캔버스 내용으로 새로운 VideoFrame을 생성하고 컨트롤러에 추가합니다.
 * @param canvas - 처리된 OffscreenCanvas
 * @param originalFrame - 원본 VideoFrame (타임스탬프 등 메타데이터 사용)
 * @param controller - TransformStream의 컨트롤러
 */
function createAndEnqueueFrame(
  canvas: OffscreenCanvas,
  originalFrame: any,
  controller: any,
) {
  const newFrame = new VideoFrame(canvas, {
    timestamp: originalFrame.timestamp,
    duration: originalFrame.duration,
  });
  controller.enqueue(newFrame);
}

/**
 * Web Worker의 메인 메시지 핸들러입니다.
 * 스트림을 받아 프레임별로 ROI 잘라내기 변환을 수행합니다.
 */
self.onmessage = async (event: MessageEvent<WorkerData>) => {
  const { readable, writable, cropInfo, width, height } = event.data;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("OffscreenCanvas 컨텍스트를 가져올 수 없습니다.");
    return;
  }

  // 화면에 표시된 비디오 크기(renderWidth)와 원본 영상 크기(width)가 다를 수 있으므로,
  // ROI 좌표를 원본 영상에 맞게 스케일링해야 합니다.
  const scaleX = width / cropInfo.renderWidth;
  const scaleY = height / cropInfo.renderHeight;

  // TransformStream: ReadableStream을 입력받아 변환한 후 WritableStream으로 출력하는 파이프라인입니다.
  const transformStream = new TransformStream({
    async transform(frame, controller) {
      // 1. 원본 프레임을 캔버스에 그립니다.
      drawFrame(ctx, frame, width, height);

      // 2. ROI 모양대로 프레임을 잘라냅니다.
      clipFrameToROI(ctx, cropInfo.roi, scaleX, scaleY);

      // 3. 잘린 캔버스 영역으로 새 비디오 프레임을 만듭니다.
      createAndEnqueueFrame(canvas, frame, controller);

      // 4. 메모리 누수를 방지하기 위해 원본 프레임의 참조를 즉시 해제합니다.
      // 비디오 스트림 처리 시 매우 중요합니다.
      frame.close();
    },
  });

  try {
    // ReadableStream -> TransformStream -> WritableStream으로 파이프를 연결하여 처리 시작
    await readable.pipeThrough(transformStream).pipeTo(writable);
  } catch (e) {
    console.error("웹 워커 스트림 파이프라인 오류:", e);
  }
};
