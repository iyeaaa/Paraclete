// Socket.IO + Next.js Signaling Server
import { createServer, Server as HttpServer } from "http";
import next from "next";
import { Server as SocketIOServer, Socket } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer: HttpServer = createServer();

const io: SocketIOServer = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/socket.io/",
});

// Socket.IO 요청을 먼저 처리
httpServer.on("request", (req, res) => {
  // Socket.IO 경로인 경우 처리하지 않음 (Socket.IO가 자체 처리)
  if (req.url?.startsWith('/socket.io/')) {
    return;
  }
  
  // 다른 모든 HTTP 요청을 Next.js로 전달
  return handle(req, res);
});

function getPublicRooms(): string[] {
  const { rooms, sids } = io.sockets.adapter;
  const publicRooms: string[] = [];
  rooms.forEach((_, key: string) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
}

io.on("connection", (socket: Socket) => {
  console.log(`🔌 소켓 연결: ${socket.id}`);

  socket.on("join", (roomName: string) => {
    socket.join(roomName);
    console.log(`👥 ${socket.id}이(가) ${roomName} 방에 참여`);
    const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
    console.log(`📊 방 ${roomName}의 현재 인원: ${roomSize}명`);
    io.emit("update_rooms", getPublicRooms());
  });

  // WebRTC 시그널링
  socket.on("start", (roomName: string) => {
    console.log(`🚀 ${socket.id}이(가) ${roomName} 방에서 WebRTC 시작 신호 전송`);
    socket.to(roomName).emit("start");
  });

  socket.on("offer", (offer: RTCSessionDescriptionInit, roomName: string) => {
    console.log(`📤 ${socket.id}이(가) ${roomName} 방에 offer 전송 (type: ${offer.type})`);
    socket.to(roomName).emit("offer", offer);
  });

  socket.on("answer", (answer: RTCSessionDescriptionInit, roomName: string) => {
    console.log(`📥 ${socket.id}이(가) ${roomName} 방에 answer 전송 (type: ${answer.type})`);
    socket.to(roomName).emit("answer", answer);
  });

  socket.on("ice", (ice: RTCIceCandidateInit, roomName: string) => {
    console.log(`🧊 ${socket.id}이(가) ${roomName} 방에 ICE candidate 전송 (type: ${ice.candidate?.split(' ')[7] || 'unknown'})`);
    socket.to(roomName).emit("ice", ice);
  });

  socket.on("disconnecting", () => {
    console.log(`👋 ${socket.id} 연결 해제 중...`);
    socket.rooms.forEach((room: string) => {
      socket.to(room).emit("bye", socket.id);
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ 소켓 연결 끊어짐: ${socket.id} (reason: ${reason})`);
    io.emit("update_rooms", getPublicRooms());
  });
});

httpServer.listen(port, (err?: Error) => {
  if (err) throw err;
  console.log(`> Ready on http://${hostname}:${port}`);
});
