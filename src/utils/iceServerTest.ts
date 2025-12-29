// ICE 서버 연결 테스트 유틸리티
export const testICEServers = async () => {
  const configuration = {
    iceServers: [
      {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:seoul.relay.metered.ca:80",
        username: "e0c6e9df29d16b37783c32a5",
        credential: "mU8NxnuLYXuEXzRr",
      },
      {
        urls: "turn:seoul.relay.metered.ca:80?transport=tcp",
        username: "e0c6e9df29d16b37783c32a5",
        credential: "mU8NxnuLYXuEXzRr",
      },
      {
        urls: "turn:seoul.relay.metered.ca:443",
        username: "e0c6e9df29d16b37783c32a5",
        credential: "mU8NxnuLYXuEXzRr",
      },
      {
        urls: "turns:seoul.relay.metered.ca:443?transport=tcp",
        username: "e0c6e9df29d16b37783c32a5",
        credential: "mU8NxnuLYXuEXzRr",
      },
    ],
  };

  console.log('🧪 ICE 서버 연결 테스트 시작...');
  
  const pc = new RTCPeerConnection(configuration);
  const candidates: RTCIceCandidate[] = [];
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('⏰ ICE 수집 타임아웃 (10초)');
      pc.close();
      resolve({
        success: false,
        candidates: candidates.length,
        error: 'Timeout'
      });
    }, 10000);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        candidates.push(event.candidate);
        console.log(`✅ ICE candidate 수집됨: ${event.candidate.type} ${event.candidate.protocol} ${event.candidate.address}`);
      } else {
        console.log('✅ ICE 수집 완료');
        clearTimeout(timeout);
        pc.close();
        resolve({
          success: true,
          candidates: candidates.length,
          candidatesList: candidates
        });
      }
    };

    pc.onicecandidateerror = (event) => {
      console.error('❌ ICE candidate 오류:', event);
    };

    // 더미 데이터 채널을 생성하여 ICE 수집을 시작
    pc.createDataChannel('test');
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
    }).catch(error => {
      console.error('❌ Offer 생성 오류:', error);
      clearTimeout(timeout);
      pc.close();
      resolve({
        success: false,
        candidates: candidates.length,
        error: error.message
      });
    });
  });
};

// 브라우저에서 실행할 수 있는 전역 함수로 등록
if (typeof window !== 'undefined') {
  (window as any).testICEServers = testICEServers;
}
