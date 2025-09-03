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
});

// 모든 HTTP 요청을 Next.js로 전달
httpServer.on("request", (req, res) => {
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
  console.log(`소켓 연결: ${socket.id}`);

  socket.on("join", (roomName: string) => {
    socket.join(roomName);
    console.log(`${socket.id}이(가) ${roomName} 방에 참여`);
    io.emit("update_rooms", getPublicRooms());
  });

  // WebRTC 시그널링
  socket.on("start", (roomName: string) => {
    socket.to(roomName).emit("start");
  });

  socket.on("offer", (offer: RTCSessionDescriptionInit, roomName: string) => {
    socket.to(roomName).emit("offer", offer);
  });

  socket.on("answer", (answer: RTCSessionDescriptionInit, roomName: string) => {
    socket.to(roomName).emit("answer", answer);
  });

  socket.on("ice", (ice: RTCIceCandidateInit, roomName: string) => {
    socket.to(roomName).emit("ice", ice);
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room: string) => {
      socket.to(room).emit("bye", socket.id);
    });
  });

  socket.on("disconnect", () => {
    console.log(`소켓 연결 끊어짐: ${socket.id}`);
    io.emit("update_rooms", getPublicRooms());
  });
});

httpServer.listen(port, (err?: Error) => {
  if (err) throw err;
  console.log(`> Ready on http://${hostname}:${port}`);
});
