// src/server/api/trpc.ts
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

// 1. 컨텍스트 생성 - 세션 없이 간단하게
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    headers: opts.headers,
  };
};

// 2. tRPC 초기화
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

// 3. 재사용 가능한 라우터 및 프로시저 생성
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
