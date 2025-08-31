"use client";

import { useRouter } from "next/navigation";
import styles from "./main.module.css";
import { trpc } from "@/trpc/react";

export default function MainPage() {
  const router = useRouter();

  const {
    data: contacts,
    isLoading,
    error,
  } = trpc.auth.getContacts.useQuery(undefined, {
    retry: false, // 인증 실패 시 재시도 안 함
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => router.push("/login"),
  });

  if (error) {
    // 인증 에러 시 로그인 페이지로
    if (error.data?.code === "UNAUTHORIZED") {
      router.push("/login");
      return null; // 리디렉션 중에는 아무것도 렌더링하지 않음
    }
    return <div>에러가 발생했습니다: {error.message}</div>;
  }

  const handleControlClick = (room: string) => {
    router.push(`/sender/${room}`);
  };

  const handleReceiveClick = (room: string) => {
    router.push(`/viewer/${room}`);
  };

  if (isLoading) {
    return <div>연락처를 불러오는 중...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.mainHeader}>
        <h1>Screen Sharing Service</h1>
        <p>가족 채팅방</p>
        <button
          onClick={() => logoutMutation.mutate()}
          className={styles.logoutButton}
        >
          로그아웃
        </button>
      </header>

      <main className={styles.chatList}>
        {contacts &&
          contacts.json &&
          contacts.json.map((contact: any) => (
            <div key={contact.room} className={styles.chatRoom}>
              <div className={styles.chatInfo}>
                <h3>{contact.email}</h3>
                <p>마지막 연결: 2025.08.12</p>
              </div>
              <button
                className={styles.remoteControlButton}
                onClick={() => handleControlClick(contact.room)}
              >
                화면 공유하기
              </button>
              <button
                className={styles.remoteControlledButton}
                onClick={() => handleReceiveClick(contact.room)}
              >
                화면 공유 받기
              </button>
            </div>
          ))}
      </main>
    </div>
  );
}
