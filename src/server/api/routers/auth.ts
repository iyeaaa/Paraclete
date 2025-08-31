// src/server/api/routers/auth.ts
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { login, logout } from "@/lib/session";
import { TRPCError } from "@trpc/server";

// 임시 데이터베이스
const usersDB: { [key: string]: { email: string; room: string }[] } = {
  "iyeaaa@naver.com": [
    { email: "cyh1443@gmail.com", room: "a" },
    { email: "sjj2305@naver.com", room: "b" },
  ],
  "cyh1443@gmail.com": [
    { email: "iyeaaa@naver.com", room: "a" },
    { email: "sjj2305@naver.com", room: "c" },
  ],
  "sjj2305@naver.com": [
    { email: "cyh1443@gmail.com", room: "c" },
    { email: "iyeaaa@naver.com", room: "b" },
  ],
};
const login_info: { [key: string]: string } = {
  "iyeaaa@naver.com": "123456",
  "cyh1443@gmail.com": "123456",
};

export const authRouter = createTRPCRouter({
  // 로그인 프로시저 (기존 /api/login)
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (login_info[input.email] && login_info[input.email] === input.password) {
        await login(ctx.session, input.email);
        return { success: true };
      }
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "이메일 또는 비밀번호가 잘못되었습니다.",
      });
    }),

  // 로그아웃 프로시저 (기존 /api/auth/logout)
  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      await logout(ctx.session);
      return { success: true };
    }),

  // 연락처 가져오기 프로시저 (기존 /api/user)
  getContacts: protectedProcedure
    .query(({ ctx }) => {
      const userContacts = usersDB[ctx.session.email] || [];
      return userContacts;
    }),
});
