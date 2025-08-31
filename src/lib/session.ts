// src/lib/session.ts
import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

// 세션 옵션을 정의합니다.
export const sessionOptions: SessionOptions = {
  password: "complex_password_at_least_32_characters_long", // 32자 이상의 복잡한 비밀번호를 사용하세요!
  cookieName: "my-app-session-cookie",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production", // 프로덕션 환경에서는 https를 통해서만 쿠키 전송
  },
};

// 세션 데이터의 타입을 정의합니다.
export interface SessionData {
  email?: string;
  isLoggedIn?: boolean;
}

// 서버 컴포넌트나 API 라우트에서 세션 데이터를 가져오는 함수
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions,
  );
  return session;
}

// 로그인 시 세션에 사용자 정보를 저장하는 함수
export async function login(
  session: IronSession<SessionData>,
  email: string,
): Promise<void> {
  session.email = email;
  session.isLoggedIn = true;
  await session.save();
}

// 로그아웃 시 세션을 파기하는 함수
export async function logout(session: IronSession<SessionData>): Promise<void> {
  session.destroy();
}
