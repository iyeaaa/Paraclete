// src/server/api/trpc.ts
import { getSession, SessionData } from "@/lib/session";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";

// 1. 컨텍스트 생성: 모든 tRPC 프로시저에서 접근 가능한 데이터 (예: 세션)
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await getSession();
  return {
    session,
  };
};

// 2. tRPC 초기화
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

// 3. 재사용 가능한 라우터 및 프로시저 생성
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// 4. 로그인된 사용자만 접근할 수 있도록 하는 미들웨어
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session.isLoggedIn || !ctx.session.email) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      // ctx.session은 이제 non-null임을 추론할 수 있습니다.
      session: { ...ctx.session, email: ctx.session.email },
    },
  });
});

// 5. 인증이 필요한 프로시저
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
