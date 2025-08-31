// server.js (Simple Socket.IO Server)

/**
 * Node.js의 기본 HTTP 서버 모듈을 가져옵니다.
 * Express나 Next.js 없이도 기본적인 웹 서버를 생성할 수 있게 해줍니다.
 * 모든 웹 통신의 가장 기본적인 토대가 됩니다.
 */
import { createServer } from "http";

/**
 * Next.js 프레임워크를 가져옵니다.
 * 서버 사이드 렌더링(SSR), 페이지 라우팅 등 Next.js의 핵심 기능을 사용하기 위해 필요합니다.
 */
import next from "next";

/**
 * Node.js 웹 애플리케이션 프레임워크인 Express를 가져옵니다.
 * 미들웨어 추가, 라우팅 관리 등 웹 서버 기능을 더 쉽고 강력하게 만들어 줍니다.
 * 이 코드에서는 주로 미들웨어(`express.json`)를 사용하는 데 쓰입니다.
 */
import express from "express";

/**
 * 실시간 웹 애플리케이션을 위한 라이브러리인 Socket.IO의 Server 클래스를 가져옵니다.
 * WebSocket을 기반으로 양방향 통신 채널을 쉽게 만들 수 있게 해줍니다.
 */
import { Server } from "socket.io";

/**
 * 현재 환경이 '프로덕션'(배포) 환경이 아닌 '개발' 환경인지 여부를 결정합니다.
 * true이면 개발 모드로, 페이지 변경 시 자동 리로드 같은 편의 기능을 제공합니다.
 */
const dev = process.env.NODE_ENV !== "production";

const hostname = "localhost";
const port = 3000;

/**
 * Next.js 애플리케이션 인스턴스를 생성합니다.
 * dev, hostname, port와 같은 설정값을 전달하여 초기화합니다.
 */
const app = next({ dev, hostname, port });

/**
 * Next.js의 요청 처리기(핸들러) 함수를 가져옵니다.
 * 이 핸들러는 들어온 HTTP 요청을 분석하여 어떤 Next.js 페이지 또는 API 라우트를 보여줄지 결정하고 렌더링하는 역할을 합니다.
 * 사실상 Next.js의 모든 렌더링 로직이 이 함수 안에 담겨있습니다.
 */
const handle = app.getRequestHandler();

/**
 * Next.js 앱이 내부적으로 필요한 모든 준비(페이지 컴파일 등)를 마칠 때까지 기다립니다.
 * 이 과정이 끝나야 서버가 정상적으로 요청을 처리할 수 있으므로, `await`를 사용해 완료를 보장합니다.
 */
await app.prepare();

/**
 * Express 애플리케이션 인스턴스를 생성합니다.
 * 이 인스턴스를 통해 미들웨어를 추가하는 등의 작업을 할 수 있습니다.
 */
const expressApp = express();
const httpServer = createServer(expressApp);

/**
 * 위에서 생성한 HTTP 서버(`httpServer`) 위에 Socket.IO 서버를 설정합니다.
 * 이렇게 하면 하나의 포트(3000번)로 웹 페이지 제공(HTTP)과 실시간 통신(WebSocket)을 동시에 처리할 수 있습니다.
 * Socket.IO 서버는 HTTP 서버에 '붙어서' 동작합니다.
 */
const io = new Server(httpServer, {
  cors: {
    origin: "*", // For development, allow all origins. Restrict in production.
    methods: ["GET", "POST"],
  },
});

/**
 * Express 미들웨어를 적용하는 부분입니다.
 * tRPC 같은 API가 요청의 본문(body)을 올바르게 해석하기 위해 필수적입니다.
 */
// 들어오는 요청의 본문(body)이 JSON 형태일 때 이를 파싱(해석)하여 req.body 객체로 만들어줍니다.
expressApp.use(express.json());
// 들어오는 요청의 본문(body)이 URL-encoded 형태일 때 이를 파싱해줍니다. (주로 HTML 폼 데이터)
expressApp.use(express.urlencoded({ extended: true }));

// 처리되지 않은 모든 요청을 Next.js의 요청 핸들러로 전달합니다.
// 이 코드는 다른 모든 라우팅 및 미들웨어 뒤에 위치해야 합니다.
expressApp.all(/.*/, (req, res) => {
  return handle(req, res);
});

/**
 * 현재 접속 가능한 '공개 방' 목록을 반환하는 헬퍼 함수입니다.
 * Socket.IO 어댑터 내부의 방(`rooms`) 목록과 소켓 ID(`sids`) 목록을 비교하여,
 * 소켓 ID와 이름이 같지 않은 방(즉, 사용자들이 만든 방)만 필터링합니다.
 * @returns {string[]} 공개 방 이름의 배열을 반환합니다.
 */
function getPublicRooms() {
  const { rooms, sids } = io.sockets.adapter;
  const publicRooms = [];
  rooms.forEach((_, key) => {
    // 방 이름(key)이 특정 소켓의 개인 방(sid)이 아닌 경우에만 공개 방으로 간주합니다.
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
}

/**
 * 클라이언트가 Socket.IO 서버에 성공적으로 연결되었을 때 발생하는 'connection' 이벤트를 처리합니다.
 * 연결된 각 클라이언트는 고유한 `socket` 객체를 가지며, 이 객체를 통해 서버와 클라이언트가 통신합니다.
 */
io.on("connection", (socket) => {
  console.log(`소켓 연결 성공: ${socket.id}`);

  // 클라이언트가 특정 방에 참여하고 싶을 때 보내는 'join' 이벤트를 처리합니다.
  socket.on("join", (roomName) => {
    socket.join(roomName); // 해당 소켓을 특정 방(roomName)에 입장시킵니다.
    console.log(`${socket.id}이(가) ${roomName} 방에 참여했습니다.`);
    // 방 목록에 변경이 생겼으므로, 모든 클라이언트에게 'update_rooms' 이벤트를 보내 최신 방 목록을 전송합니다.
    io.emit("update_rooms", getPublicRooms());
  });

  /**
   * --- WebRTC 시그널링 이벤트 처리 구간 ---
   * WebRTC는 P2P 연결을 위해 서로의 정보를 교환하는 '시그널링' 과정이 필요합니다.
   * 이 서버는 클라이언트들 사이에서 이 정보를 중계해주는 역할만 합니다.
   */

  // 한 클라이언트가 화상 통화를 시작하려 할 때, 같은 방의 다른 클라이언트에게 'start' 신호를 보냅니다.
  socket.on("start", (roomName) => {
    socket.to(roomName).emit("start");
  });

  // Peer A가 생성한 'offer'(통화 제안 정보)를 받아서 같은 방의 다른 클라이언트(Peer B)에게 전달합니다.
  socket.on("offer", (offer, roomName) => {
    socket.to(roomName).emit("offer", offer);
  });

  // Peer B가 생성한 'answer'(통화 수락 정보)를 받아서 Peer A에게 전달합니다.
  socket.on("answer", (answer, roomName) => {
    socket.to(roomName).emit("answer", answer);
  });

  // 네트워크 주소 정보인 'ICE candidate'를 다른 피어에게 전달합니다.
  // P2P 연결 경로를 설정하는 데 사용됩니다.
  socket.on("ice", (ice, roomName) => {
    socket.to(roomName).emit("ice", ice);
  });

  /**
   * 클라이언트의 연결이 끊어지기 '직전'에 발생하는 'disconnecting' 이벤트를 처리합니다.
   * 이 시점에는 아직 소켓이 어떤 방에 있었는지 알 수 있습니다.
   * 이를 이용해 해당 소켓이 있던 모든 방에 'bye' 이벤트를 보내 다른 참여자들에게 퇴장 사실을 알립니다.
   */
  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      socket.to(room).emit("bye", socket.id);
    });
  });

  /**
   * 클라이언트의 연결이 완전히 끊어졌을 때 발생하는 'disconnect' 이벤트를 처리합니다.
   */
  socket.on("disconnect", () => {
    console.log(`소켓 연결 끊어짐: ${socket.id}`);
    // 사용자가 나갔으므로, 변경된 방 목록을 모든 클라이언트에게 다시 전송합니다.
    io.emit("update_rooms", getPublicRooms());
  });
});

/**
 * 생성된 HTTP 서버를 지정된 포트(3000)와 호스트 이름('localhost')에서 실행합니다.
 * 이 함수가 호출되어야 비로소 서버가 외부의 연결 요청을 받기 시작합니다.
 */
httpServer.listen(port, (err) => {
  if (err) throw err; // 서버 실행 중 에러가 발생하면 콘솔에 출력하고 프로세스를 중지합니다.
  console.log(`> Ready on http://${hostname}:${port}`);
});
