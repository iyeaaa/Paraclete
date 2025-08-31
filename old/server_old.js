// server.js (Definitive Final Version)
import { createServer } from "http";

import next from "next";
import express from "express";
import session from "express-session";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Express 세션 미들웨어를 설정합니다.
const sessionMiddleware = session({
  secret: "your_secret_key", // 실제 프로덕션에서는 더욱 강력한 비밀 키를 사용해야 합니다.
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }, // HTTPS 환경에서는 true로 설정해야 합니다.
});

// Express와 Socket.IO 미들웨어를 호환되도록 감싸주는 래퍼 함수입니다.
const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

// Next.js 앱이 준비될 때까지 기다립니다.
await app.prepare();

// Express 앱과 HTTP 서버를 생성합니다.
const expressApp = express();
const httpServer = createServer(expressApp);

// HTTP 서버 위에 Socket.IO 서버를 설정합니다.
const io = new Server(httpServer);

// 공개된 방 목록을 가져오는 헬퍼 함수입니다.
function getPublicRooms() {
  const { rooms, sids } = io.sockets.adapter;
  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
}

// Express 앱에 미들웨어들을 적용합니다.
expressApp.use(sessionMiddleware);
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: true }));

// Socket.IO가 Express 세션을 사용할 수 있도록 래퍼 함수로 미들웨어를 등록합니다.
io.use(wrap(sessionMiddleware));

// Socket.IO 연결 이벤트를 처리합니다.
io.on("connection", (socket) => {
  const session = socket.request.session;

  // 세션에 사용자 정보가 없으면 연결을 거부합니다.
  if (!session || !session.user) {
    console.log("세션 정보가 없어 소켓 연결을 끊습니다.");
    return socket.disconnect(true);
  }
  console.log(`소켓 연결 성공: ${session.user.email}`);

  // --- 기존 프로젝트의 소켓 이벤트 핸들러들 ---
  socket.on("join", (roomName) => {
    socket.join(roomName);
    console.log(`${session.user.email}이(가) ${roomName} 방에 참여했습니다.`);
  });

  socket.on("start", (roomName) => {
    socket.to(roomName).emit("start");
  });

  socket.on("offer", (offer, roomName) => {
    socket.to(roomName).emit("offer", offer);
  });

  socket.on("answer", (answer, roomName) => {
    socket.to(roomName).emit("answer", answer);
  });

  socket.on("ice", (ice, roomName) => {
    socket.to(roomName).emit("ice", ice);
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      if (session.user) {
        socket.to(room).emit("bye", session.user.email);
      }
    });
  });

  socket.on("disconnect", () => {
    console.log(`소켓 연결 끊어짐: ${session.user.email}`);
    io.emit("update_rooms", getPublicRooms());
  });
});

// CRITICAL CHANGE IS HERE
// All other requests are passed to the Next.js handler
expressApp.all(/.*/, (req, res) => {
  return handle(req, res);
});

httpServer.listen(port, (err) => {
  if (err) throw err;
  console.log(`> Ready on http://${hostname}:${port}`);
});
