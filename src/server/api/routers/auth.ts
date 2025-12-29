// src/server/api/routers/auth.ts
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

// 방 목록 - 계정 없이 직접 방 선택
const rooms = [
  { id: "a", name: "방 A", description: "가족 채팅방 A" },
  { id: "b", name: "방 B", description: "가족 채팅방 B" },
  { id: "c", name: "방 C", description: "가족 채팅방 C" },
];

export const authRouter = createTRPCRouter({
  // 방 목록 가져오기 프로시저
  getRooms: publicProcedure
    .query(() => {
      console.log('Server: Returning rooms:', rooms);
      return rooms;
    }),
});
