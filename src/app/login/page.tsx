"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { trpc } from "@/trpc/react"; // tRPC 클라이언트 import

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      alert("로그인 성공!");
      router.push("/");
      router.refresh(); // 페이지를 새로고침하여 서버 세션을 반영
    },
    onError: (error) => {
      alert(`로그인 실패: ${error.message}`);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className={styles.body}>
      <div className={styles.loginContainer}>
        <h1>Remote Control Service</h1>
        <p>서비스에 로그인하세요</p>

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <label htmlFor="email">이메일</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="example@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label htmlFor="password">비밀번호</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className={styles.loginBtn}>
            로그인
          </button>
        </form>

        <p className={styles.signupText}>
          계정이 없으신가요? <a href="#">회원가입</a>
        </p>
      </div>
    </div>
  );
}
