// src/components/ROISelector/ROISelector.tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import styles from "./ROISelector.module.css";

// 컴포넌트 외부에서도 사용할 수 있도록 타입을 export 합니다.
export type ROIType =
  | {
      type: "circle";
      cx: number;
      cy: number;
      r: number;
    }
  | {
      type: "polygon";
      points: { x: number; y: number }[];
    };

// 컴포넌트가 부모로부터 받을 props의 타입을 정의합니다.
interface ROISelectorProps {
  onDone: (roi: ROIType) => void;
  onCancel: () => void;
}

// 타입 별칭(alias)으로 가독성을 높입니다.
type Point = { x: number; y: number };
type Circle = { cx: number; cy: number; r: number };

/**
 * 사용자가 화면에 다각형 또는 원 형태의 관심 영역(ROI)을 그릴 수 있게 해주는 전체 화면 오버레이 컴포넌트입니다.
 */
export default function ROISelector({ onDone, onCancel }: ROISelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- React State ---
  const [mode, setMode] = useState<"polygon" | "circle">("polygon");
  const [verts, setVerts] = useState<Point[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<Point | null>(null);
  const [previewCircle, setPreviewCircle] = useState<Circle | null>(null);
  // 다각형을 그릴 때 마지막 꼭짓점에서 마우스 커서까지의 미리보기 선을 위한 상태
  const [mousePos, setMousePos] = useState<Point | null>(null);

  // --- Drawing Logic ---
  // 그리기 상태가 변경될 때마다 캔버스를 다시 그립니다.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 다각형 선 그리기
    if (verts.length > 1) {
      ctx.strokeStyle = "#00aaff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      verts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    // 2. 다각형 꼭짓점 그리기 (사용자 경험 향상)
    if (verts.length > 0) {
      ctx.fillStyle = "#00aaff";
      verts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI); // 5px 반지름의 원
        ctx.fill();
      });
    }

    // 3. 다각형 미리보기 선 그리기 (마지막 꼭짓점에서 커서까지)
    if (mode === "polygon" && verts.length > 0 && mousePos) {
      ctx.strokeStyle = "rgba(0, 170, 255, 0.5)"; // 반투명 색상
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]); // 점선으로 표시
      ctx.beginPath();
      ctx.moveTo(verts[verts.length - 1].x, verts[verts.length - 1].y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]); // 점선 해제
    }

    // 4. 원 미리보기 그리기
    if (previewCircle) {
      ctx.strokeStyle = "#00aaff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        previewCircle.cx,
        previewCircle.cy,
        previewCircle.r,
        0,
        2 * Math.PI,
      );
      ctx.stroke();
    }
  }, [verts, previewCircle, mousePos, mode]);

  // --- Event Handlers ---
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Shift") setMode("circle");
      if (e.key === "Escape") onCancel();
    },
    [onCancel],
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === "Shift") setMode("polygon");
  }, []);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      const { offsetX, offsetY } = e;
      if (mode === "circle") {
        setIsDragging(true);
        setStartPos({ x: offsetX, y: offsetY });
        setVerts([]); // 다른 모드에서 넘어왔을 경우를 대비해 초기화
      } else {
        setIsDragging(false);
        setPreviewCircle(null);
        setVerts((prevVerts) => [...prevVerts, { x: offsetX, y: offsetY }]);
      }
    },
    [mode],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const { offsetX, offsetY } = e;
      setMousePos({ x: offsetX, y: offsetY }); // 항상 마우스 위치 업데이트

      if (!isDragging || !startPos) return; // 원 그리기 중이 아니면 여기서 종료

      const r = Math.hypot(offsetX - startPos.x, offsetY - startPos.y);
      setPreviewCircle({ cx: startPos.x, cy: startPos.y, r });
    },
    [isDragging, startPos],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isDragging || !startPos) return;

      const { offsetX, offsetY } = e;
      const r = Math.hypot(offsetX - startPos.x, offsetY - startPos.y);
      onDone({ type: "circle", cx: startPos.x, cy: startPos.y, r });

      // 그리기가 완료되었으므로 상태를 초기화합니다.
      setIsDragging(false);
      setStartPos(null);
      setPreviewCircle(null);
      setMousePos(null);
      setVerts([]);
    },
    [isDragging, startPos, onDone],
  );

  const handleDoubleClick = useCallback(() => {
    if (mode !== "polygon" || verts.length < 3) return;
    onDone({ type: "polygon", points: [...verts] });
  }, [mode, verts, onDone]);

  // --- Effect for Event Listeners ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("dblclick", handleDoubleClick);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [
    handleKeyDown,
    handleKeyUp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
  ]);

  return (
    <div className={styles.overlay}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.instructions}>
        <p>클릭하여 다각형 꼭짓점 추가 (더블클릭으로 완료)</p>
        <p>Shift 누른 채 드래그하여 원 그리기</p>
        <p>ESC 키를 눌러 취소</p>
      </div>
    </div>
  );
}
