// COMMENTED OUT: Remote Control Component functionality disabled
/*
"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useRemoteControl } from '@/hooks/useRemoteControl';
import styles from './RemoteControl.module.css';

interface RemoteControlProps {
  dataChannelRef: React.MutableRefObject<RTCDataChannel | null>;
  isEnabled: boolean;
  onToggle: () => void;
  dataChannelState?: RTCDataChannelState;
}

export default function RemoteControl({ dataChannelRef, isEnabled, onToggle, dataChannelState }: RemoteControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // 원격제어 훅 사용
  const { handleMouseEvent, handleTouchEvent } = useRemoteControl(dataChannelRef, {
    enabled: isEnabled && isActive,
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0
  });

  // 연결 상태 모니터링 - dataChannelState prop과 dataChannelRef.current 상태를 모두 확인
  useEffect(() => {
    if (!dataChannelRef.current) {
      setConnectionStatus('disconnected');
      return;
    }

    const dataChannel = dataChannelRef.current;
    
    const updateStatus = () => {
      if (dataChannel.readyState === 'open') {
        setConnectionStatus('connected');
      } else if (dataChannel.readyState === 'connecting') {
        setConnectionStatus('connecting');
      } else {
        setConnectionStatus('disconnected');
      }
    };

    updateStatus();
    dataChannel.addEventListener('open', updateStatus);
    dataChannel.addEventListener('close', updateStatus);
    dataChannel.addEventListener('error', updateStatus);

    return () => {
      dataChannel.removeEventListener('open', updateStatus);
      dataChannel.removeEventListener('close', updateStatus);
      dataChannel.removeEventListener('error', updateStatus);
    };
  }, [dataChannelRef]);

  // dataChannelState prop 변경 시에도 상태 업데이트
  useEffect(() => {
    if (dataChannelState === 'open') {
      setConnectionStatus('connected');
    } else if (dataChannelState === 'connecting') {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [dataChannelState]);

  // 마우스 이벤트 리스너
  useEffect(() => {
    if (!isActive || !isEnabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleMouseEvent(e, 'mousedown');
      setCoordinates({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      handleMouseEvent(e, 'mouseup');
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.buttons > 0) { // 마우스 버튼이 눌린 상태에서만
        e.preventDefault();
        handleMouseEvent(e, 'mousemove');
        setCoordinates({ x: e.clientX, y: e.clientY });
      }
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      handleMouseEvent(e, 'click');
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);
    };
  }, [isActive, isEnabled, handleMouseEvent]);

  // 터치 이벤트 리스너
  useEffect(() => {
    if (!isActive || !isEnabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleTouchEvent(e, 'touchstart');
      if (e.touches[0]) {
        setCoordinates({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleTouchEvent(e, 'touchend');
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleTouchEvent(e, 'touchmove');
      if (e.touches[0]) {
        setCoordinates({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isActive, isEnabled, handleTouchEvent]);

  const handleToggleActive = () => {
    setIsActive(!isActive);
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return '연결됨';
      case 'connecting':
        return '연결 중...';
      case 'disconnected':
        return '연결 안됨';
      default:
        return '알 수 없음';
    }
  };

  const getConnectionStatusClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return styles.connected;
      case 'connecting':
        return styles.connecting;
      case 'disconnected':
        return styles.disconnected;
      default:
        return '';
    }
  };

  const getDetailedStatus = () => {
    if (dataChannelRef.current) {
      return `데이터 채널: ${dataChannelRef.current.readyState}`;
    }
    return '데이터 채널 없음';
  };

  return (
    <div className={styles.remoteControlContainer}>
      <div className={styles.controls}>
        <button
          onClick={onToggle}
          className={`${styles.toggleButton} ${isEnabled ? styles.enabled : styles.disabled}`}
        >
          {isEnabled ? '원격제어 비활성화' : '원격제어 활성화'}
        </button>
        
        {isEnabled && (
          <button
            onClick={handleToggleActive}
            className={`${styles.activeButton} ${isActive ? styles.active : styles.inactive}`}
            disabled={connectionStatus !== 'connected'}
          >
            {isActive ? '원격제어 중지' : '원격제어 시작'}
          </button>
        )}
      </div>

      {isEnabled && (
        <div className={styles.status}>
          <p>연결 상태: <span className={getConnectionStatusClass()}>{getConnectionStatusText()}</span></p>
          <p className={styles.detailedStatus}>{getDetailedStatus()}</p>
          {isActive && (
            <>
              <p>원격제어 활성화됨</p>
              <p>좌표: ({coordinates.x.toFixed(0)}, {coordinates.y.toFixed(0)})</p>
            </>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className={`${styles.controlArea} ${isActive && isEnabled ? styles.active : ''}`}
        style={{ pointerEvents: isActive && isEnabled ? 'auto' : 'none' }}
      >
        {isActive && isEnabled ? (
          <div className={styles.instruction}>
            이 영역에서 마우스나 터치를 사용하여 원격제어하세요
          </div>
        ) : (
          <div className={styles.disabledMessage}>
            {connectionStatus === 'connected' 
              ? '원격제어를 시작하려면 위의 버튼을 클릭하세요'
              : '연결이 필요합니다'
            }
          </div>
        )}
      </div>
    </div>
  );
}
*/

// Placeholder component to prevent import errors
interface RemoteControlProps {
  dataChannelRef?: React.MutableRefObject<RTCDataChannel | null>;
  isEnabled?: boolean;
  onToggle?: () => void;
  dataChannelState?: RTCDataChannelState;
}

export default function RemoteControl({ dataChannelRef, isEnabled, onToggle, dataChannelState }: RemoteControlProps = {}) {
  return null;
}
