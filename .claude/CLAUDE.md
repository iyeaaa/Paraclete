# Paraclete - WebRTC 시그널링 서버

## 프로젝트 개요
WebRTC P2P 연결을 위한 시그널링 서버 (SDP/ICE candidate 교환)

## 기술 스택
- **Language**: Node.js, TypeScript
- **WebSocket**: Socket.io
- **Framework**: Express
- **Redis**: 연결 상태 관리 (선택적)
- **Logging**: Winston

## 프로젝트 구조
```
paraclete/
├── src/
│   ├── server.ts           # 메인 서버
│   ├── signaling/
│   │   ├── SignalingServer.ts
│   │   ├── Room.ts
│   │   └── Peer.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── rateLimit.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── validator.ts
│   └── types/
│       └── signaling.d.ts
├── config/
└── .claude/
```

## 시그널링 플로우

### 1. 연결 수립
```typescript
// 클라이언트 연결
socket.on('connect', () => {
  console.log('Connected to signaling server');
});
```

### 2. Room 참가
```typescript
// 룸 참가 요청
socket.emit('join', { roomId: 'room123', userId: 'user1' });

// 서버 처리
socket.on('join', async ({ roomId, userId }) => {
  await socket.join(roomId);

  const room = rooms.get(roomId) || new Room(roomId);
  room.addPeer(socket.id, userId);

  // 다른 참가자들에게 알림
  socket.to(roomId).emit('peer-joined', {
    peerId: socket.id,
    userId,
  });

  // 기존 참가자 목록 전달
  socket.emit('existing-peers', room.getPeers());
});
```

### 3. Offer/Answer 교환
```typescript
// Offer 전송
socket.emit('offer', {
  to: targetPeerId,
  from: myPeerId,
  offer: sdpOffer,
});

// 서버 릴레이
socket.on('offer', ({ to, from, offer }) => {
  io.to(to).emit('offer', { from, offer });
});

// Answer 전송
socket.emit('answer', {
  to: targetPeerId,
  from: myPeerId,
  answer: sdpAnswer,
});

// 서버 릴레이
socket.on('answer', ({ to, from, answer }) => {
  io.to(to).emit('answer', { from, answer });
});
```

### 4. ICE Candidate 교환
```typescript
// ICE candidate 전송
socket.emit('ice-candidate', {
  to: targetPeerId,
  from: myPeerId,
  candidate: iceCandidate,
});

// 서버 릴레이
socket.on('ice-candidate', ({ to, from, candidate }) => {
  io.to(to).emit('ice-candidate', { from, candidate });
});
```

### 5. 연결 해제
```typescript
socket.on('disconnect', () => {
  const room = findRoomBySocketId(socket.id);
  if (room) {
    room.removePeer(socket.id);

    // 다른 참가자들에게 알림
    socket.to(room.id).emit('peer-left', {
      peerId: socket.id,
    });
  }
});
```

## Room 관리
```typescript
class Room {
  id: string;
  peers: Map<string, Peer>;
  createdAt: Date;

  constructor(id: string) {
    this.id = id;
    this.peers = new Map();
    this.createdAt = new Date();
  }

  addPeer(socketId: string, userId: string) {
    this.peers.set(socketId, new Peer(socketId, userId));
  }

  removePeer(socketId: string) {
    this.peers.delete(socketId);

    // 빈 방 정리
    if (this.peers.size === 0) {
      this.destroy();
    }
  }

  getPeers() {
    return Array.from(this.peers.values());
  }

  destroy() {
    this.peers.clear();
    rooms.delete(this.id);
  }
}
```

## 메시지 타입
```typescript
interface SignalingMessage {
  type: 'join' | 'leave' | 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to?: string;
  roomId: string;
  data: any;
}

interface OfferMessage {
  type: 'offer';
  from: string;
  to: string;
  offer: RTCSessionDescriptionInit;
}

interface AnswerMessage {
  type: 'answer';
  from: string;
  to: string;
  answer: RTCSessionDescriptionInit;
}

interface IceCandidateMessage {
  type: 'ice-candidate';
  from: string;
  to: string;
  candidate: RTCIceCandidateInit;
}
```

## 환경 변수
```bash
# .env
PORT=3000
REDIS_URL=redis://localhost:6379
NODE_ENV=production
CORS_ORIGIN=https://yourapp.com
MAX_PEERS_PER_ROOM=10
```

## 개발 명령어
```bash
npm install
npm run dev           # 개발 모드 (nodemon)
npm run build         # TypeScript 컴파일
npm run start         # 프로덕션 실행
npm run test          # 테스트
```

## CORS 설정
```typescript
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

## 인증 (선택적)
```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});
```

## Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
});

app.use('/api/', limiter);
```

## 로깅
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

logger.info('Peer joined', { roomId, peerId: socket.id });
```

## 모니터링
```typescript
// 연결 통계
setInterval(() => {
  const stats = {
    totalRooms: rooms.size,
    totalPeers: Array.from(rooms.values()).reduce(
      (sum, room) => sum + room.peers.size,
      0
    ),
    timestamp: new Date(),
  };

  logger.info('Server stats', stats);
}, 60000); // 1분마다
```

## Health Check
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    rooms: rooms.size,
    memory: process.memoryUsage(),
  });
});
```

## 개발 시 주의사항
- Socket.io 네임스페이스 활용 (격리)
- Redis Adapter로 수평 확장 지원
- Message validation: 악의적 메시지 필터링
- Connection timeout: 오래된 연결 정리
- Graceful shutdown: 진행 중인 시그널링 완료 대기
- 로그에 민감한 정보(SDP) 포함 주의
