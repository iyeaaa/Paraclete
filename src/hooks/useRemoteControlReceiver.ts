// COMMENTED OUT: Remote Control Receiver functionality disabled
/*
import { useCallback, useEffect, useRef, useState } from 'react';
import { RemoteControlEvent } from './useRemoteControl';

export interface RemoteControlReceiverConfig {
  enabled: boolean;
  targetElement: HTMLElement | null;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  targetWidth?: number;
  targetHeight?: number;
}

/**
 * 원격제어 이벤트를 수신하고 실제 이벤트로 변환하여 실행하는 훅입니다.
 */
export const useRemoteControlReceiver = (
  dataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  config: RemoteControlReceiverConfig
) => {
  const isEnabled = config.enabled;
  const targetElement = config.targetElement;
  const scaleX = config.scaleX;
  const scaleY = config.scaleY;
  const offsetX = config.offsetX;
  const offsetY = config.offsetY;
  const targetWidth = config.targetWidth;
  const targetHeight = config.targetHeight;

  const [screenInfo, setScreenInfo] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  });

  // 화면 크기 변경 감지
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setScreenInfo({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * 원격 좌표를 로컬 화면에 맞게 변환합니다.
   */
  const transformCoordinates = useCallback((x: number, y: number) => {
    let transformedX = x / scaleX + offsetX;
    let transformedY = y / scaleY + offsetY;

    // 타겟 해상도가 지정된 경우 정규화
    if (targetWidth && targetHeight) {
      transformedX = (x / targetWidth) * screenInfo.width;
      transformedY = (y / targetHeight) * screenInfo.height;
    }

    // 좌표 범위 제한
    transformedX = Math.max(0, Math.min(transformedX, screenInfo.width));
    transformedY = Math.max(0, Math.min(transformedY, screenInfo.height));

    return {
      x: Math.round(transformedX),
      y: Math.round(transformedY)
    };
  }, [scaleX, scaleY, offsetX, offsetY, targetWidth, targetHeight, screenInfo]);

  /**
   * 원격제어 이벤트를 실제 DOM 이벤트로 변환하여 실행합니다.
   */
  const executeRemoteControlEvent = useCallback((event: RemoteControlEvent) => {
    if (!isEnabled || !targetElement) return;

    try {
      const { x, y } = transformCoordinates(event.x, event.y);

      switch (event.type) {
        case 'mousedown':
          targetElement.dispatchEvent(new MouseEvent('mousedown', {
            clientX: x,
            clientY: y,
            button: event.button || 0,
            bubbles: true,
            cancelable: true
          }));
          break;

        case 'mouseup':
          targetElement.dispatchEvent(new MouseEvent('mouseup', {
            clientX: x,
            clientY: y,
            button: event.button || 0,
            bubbles: true,
            cancelable: true
          }));
          break;

        case 'mousemove':
          targetElement.dispatchEvent(new MouseEvent('mousemove', {
            clientX: x,
            clientY: y,
            button: event.button || 0,
            bubbles: true,
            cancelable: true
          }));
          break;

        case 'click':
          targetElement.dispatchEvent(new MouseEvent('click', {
            clientX: x,
            clientY: y,
            button: event.button || 0,
            bubbles: true,
            cancelable: true
          }));
          break;

        case 'touchstart':
          if (event.touches && event.touches.length > 0) {
            const touch = event.touches[0];
            const touchEvent = new TouchEvent('touchstart', {
              touches: [new Touch({
                identifier: touch.identifier,
                target: targetElement,
                clientX: x,
                clientY: y,
                pageX: x,
                pageY: y,
                radiusX: 1,
                radiusY: 1,
                rotationAngle: 0,
                force: 1
              })],
              bubbles: true,
              cancelable: true
            });
            targetElement.dispatchEvent(touchEvent);
          }
          break;

        case 'touchend':
          if (event.touches && event.touches.length > 0) {
            const touch = event.touches[0];
            const touchEvent = new TouchEvent('touchend', {
              touches: [new Touch({
                identifier: touch.identifier,
                target: targetElement,
                clientX: x,
                clientY: y,
                pageX: x,
                pageY: y,
                radiusX: 1,
                radiusY: 1,
                rotationAngle: 0,
                force: 1
              })],
              bubbles: true,
              cancelable: true
            });
            targetElement.dispatchEvent(touchEvent);
          }
          break;

        case 'touchmove':
          if (event.touches && event.touches.length > 0) {
            const touch = event.touches[0];
            const touchEvent = new TouchEvent('touchmove', {
              touches: [new Touch({
                identifier: touch.identifier,
                target: targetElement,
                clientX: x,
                clientY: y,
                pageX: x,
                pageY: y,
                radiusX: 1,
                radiusY: 1,
                rotationAngle: 0,
                force: 1
              })],
              bubbles: true,
              cancelable: true
            });
            targetElement.dispatchEvent(touchEvent);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to execute remote control event:', error);
    }
  }, [isEnabled, targetElement, transformCoordinates]);

  /**
   * 데이터 채널에서 원격제어 이벤트를 수신합니다.
   */
  useEffect(() => {
    if (!isEnabled || !dataChannelRef.current) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'remote-control') {
          executeRemoteControlEvent(message.data);
        }
      } catch (error) {
        // 일반 채팅 메시지 등은 무시
        console.debug('Non-remote-control message received');
      }
    };

    const dataChannel = dataChannelRef.current;
    dataChannel.addEventListener('message', handleMessage);

    return () => {
      dataChannel.removeEventListener('message', handleMessage);
    };
  }, [isEnabled, dataChannelRef, executeRemoteControlEvent]);

  return {
    executeRemoteControlEvent,
    screenInfo
  };
};
*/
