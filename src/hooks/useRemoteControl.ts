// COMMENTED OUT: Remote Control functionality disabled
/*
import { useCallback, useRef, useEffect, useState } from 'react';

export interface RemoteControlEvent {
  type: 'mousedown' | 'mouseup' | 'mousemove' | 'click' | 'touchstart' | 'touchend' | 'touchmove';
  x: number;
  y: number;
  button?: number;
  touches?: Array<{
    identifier: number;
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
  }>;
  timestamp: number;
}

export interface RemoteControlConfig {
  enabled: boolean;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  targetWidth?: number;
  targetHeight?: number;
}

/**
 * 원격제어 기능을 제공하는 훅입니다.
 * 마우스/터치 이벤트를 캡처하고 원격 피어로 전송합니다.
 */
export const useRemoteControl = (
  dataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  config: RemoteControlConfig
) => {
  const isEnabled = config.enabled;
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
   * 이벤트 좌표를 원격 화면에 맞게 변환합니다.
   */
  const transformCoordinates = useCallback((x: number, y: number) => {
    let transformedX = (x - offsetX) * scaleX;
    let transformedY = (y - offsetY) * scaleY;

    // 타겟 해상도가 지정된 경우 정규화
    if (targetWidth && targetHeight) {
      transformedX = (transformedX / screenInfo.width) * targetWidth;
      transformedY = (transformedY / screenInfo.height) * targetHeight;
    }

    // 좌표 범위 제한
    transformedX = Math.max(0, Math.min(transformedX, targetWidth || screenInfo.width));
    transformedY = Math.max(0, Math.min(transformedY, targetHeight || screenInfo.height));

    return {
      x: Math.round(transformedX),
      y: Math.round(transformedY)
    };
  }, [scaleX, scaleY, offsetX, offsetY, targetWidth, targetHeight, screenInfo]);

  /**
   * 원격제어 이벤트를 전송합니다.
   */
  const sendRemoteControlEvent = useCallback((event: Omit<RemoteControlEvent, 'timestamp'>) => {
    if (!isEnabled) {
      console.log('Remote control not enabled');
      return;
    }
    
    if (!dataChannelRef.current) {
      console.log('Data channel not available');
      return;
    }
    
    if (dataChannelRef.current.readyState !== 'open') {
      console.log('Data channel not open, state:', dataChannelRef.current.readyState);
      return;
    }

    const remoteEvent: RemoteControlEvent = {
      ...event,
      timestamp: Date.now()
    };

    try {
      const message = JSON.stringify({
        type: 'remote-control',
        data: remoteEvent
      });
      
      console.log('Sending remote control event:', remoteEvent);
      dataChannelRef.current.send(message);
    } catch (error) {
      console.error('Failed to send remote control event:', error);
    }
  }, [isEnabled, dataChannelRef]);

  /**
   * 마우스 이벤트 핸들러
   */
  const handleMouseEvent = useCallback((event: MouseEvent, type: 'mousedown' | 'mouseup' | 'mousemove' | 'click') => {
    if (!isEnabled) return;

    const { x, y } = transformCoordinates(event.clientX, event.clientY);
    
    sendRemoteControlEvent({
      type,
      x,
      y,
      button: event.button
    });
  }, [isEnabled, transformCoordinates, sendRemoteControlEvent]);

  /**
   * 터치 이벤트 핸들러
   */
  const handleTouchEvent = useCallback((event: TouchEvent, type: 'touchstart' | 'touchend' | 'touchmove') => {
    if (!isEnabled) return;

    const touches = Array.from(event.touches);
    const primaryTouch = touches[0];
    
    if (primaryTouch) {
      const { x, y } = transformCoordinates(primaryTouch.clientX, primaryTouch.clientY);
      
      sendRemoteControlEvent({
        type,
        x,
        y,
        touches: touches.map(touch => ({
          identifier: touch.identifier,
          clientX: touch.clientX,
          clientY: touch.clientY,
          pageX: touch.pageX,
          pageY: touch.pageY
        }))
      });
    }
  }, [isEnabled, transformCoordinates, sendRemoteControlEvent]);

  return {
    handleMouseEvent,
    handleTouchEvent,
    sendRemoteControlEvent,
    screenInfo
  };
};
*/
