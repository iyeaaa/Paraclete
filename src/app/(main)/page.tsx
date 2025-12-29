"use client";

import { useRouter } from "next/navigation";
import styles from "./main.module.css";
import { trpc } from "@/trpc/react";

export default function MainPage() {
  const router = useRouter();

  const {
    data: rooms,
    isLoading,
    error,
  } = trpc.auth.getRooms.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (error) {
    return <div>방 목록을 불러오는 중 오류가 발생했습니다: {error.message}</div>;
  }

  const handleControlClick = (roomId: string) => {
    router.push(`/sender/${roomId}`);
  };

  const handleReceiveClick = (roomId: string) => {
    router.push(`/viewer/${roomId}`);
  };

  if (isLoading) {
    return <div>방 목록을 불러오는 중...</div>;
  }

  // 디버깅: rooms 데이터 확인
  console.log('Rooms data:', rooms);
  console.log('Rooms type:', typeof rooms);
  console.log('Rooms is array:', Array.isArray(rooms));

  // tRPC 응답에서 json 속성을 통해 실제 데이터 추출 (타입 단언 사용)
  const actualRooms = (rooms as any)?.json || rooms;

  // rooms가 배열이 아닌 경우 처리
  if (!actualRooms || !Array.isArray(actualRooms)) {
    return (
      <div>
        <h2>방 목록을 불러올 수 없습니다.</h2>
        <p>데이터 타입: {typeof actualRooms}</p>
        <p>배열 여부: {Array.isArray(actualRooms) ? '예' : '아니오'}</p>
        <p>데이터: {JSON.stringify(actualRooms)}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.mainHeader}>
        <h1>Screen Sharing Service</h1>
        <p>방을 선택하여 화면 공유를 시작하세요</p>
      </header>

      <main className={styles.chatList}>
        {actualRooms &&
          actualRooms.map((room: any) => (
            <div key={room.id} className={styles.chatRoom}>
              <div className={styles.chatInfo}>
                <h3>{room.name}</h3>
                <p>{room.description}</p>
              </div>
              <button
                className={styles.remoteControlButton}
                onClick={() => handleControlClick(room.id)}
              >
                화면 공유하기
              </button>
              <button
                className={styles.remoteControlledButton}
                onClick={() => handleReceiveClick(room.id)}
              >
                화면 공유 받기
              </button>
            </div>
          ))}
      </main>
    </div>
  );
}
