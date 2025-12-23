# 코인 자동매매 봇 서버 API 명세 (다중 코인 지원)

이 문서는 외부 코인 자동매매 봇 서버(localhost:8001)가 구현해야 하는 API 명세를 설명합니다.
**다중 코인 동시 거래를 지원**하며, 각 코인별로 개별적인 시작/중지가 가능합니다.

## 서버 정보
- **주소**: `http://localhost:8001`
- **프로토콜**: HTTP/HTTPS
- **데이터 형식**: JSON
- **인증**: Authorization 헤더 (시크릿 키: `2121`)
- **다중 코인**: 여러 코인을 동시에 자동매매 가능

## 인증 방식
모든 API 요청에는 다음 헤더가 포함되어야 합니다:
```
Authorization: 2121
```

## API 엔드포인트

### 1. 봇 상태 확인
**GET** `/api/bot/status`

봇의 현재 실행 상태와 실행 중인 모든 코인 정보를 확인합니다.

#### 요청 헤더
```
Authorization: 2121
Content-Type: application/json
```

#### 응답 형식
```json
{
  "success": boolean,
  "data": {
    "active_coins": ["KRW-BTC", "KRW-ETH"],
    "api_version": "2.0",
    "coin_status": {
      "KRW-BTC": {
        "korean_name": "비트코인",
        "english_name": "Bitcoin",
        "start_time": "2023-12-23T10:30:00.000Z",
        "status": "running"
      },
      "KRW-ETH": {
        "korean_name": "이더리움",
        "english_name": "Ethereum",
        "start_time": "2023-12-23T10:25:00.000Z",
        "status": "running"
      }
    },
    "server_time": "2023-12-23T14:45:56.691925",
    "total_active": 2
  }
}
```

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "active_coins": ["KRW-BTC", "KRW-ETH"],
    "api_version": "2.0",
    "coin_status": {
      "KRW-BTC": {
        "korean_name": "비트코인",
        "english_name": "Bitcoin",
        "start_time": "2023-12-23T10:30:00.000Z",
        "status": "running"
      },
      "KRW-ETH": {
        "korean_name": "이더리움",
        "english_name": "Ethereum",
        "start_time": "2023-12-23T10:25:00.000Z",
        "status": "running"
      }
    },
    "server_time": "2023-12-23T14:45:56.691925",
    "total_active": 2
  }
}
```

### 2. 봇 시작 (개별 코인)
**GET** `/api/bot/start`

특정 코인에 대한 자동매매 봇을 시작합니다.

#### 요청 헤더
```
Authorization: 2121
Content-Type: application/json
```

#### 쿼리 파라미터
- `coin`: 거래할 코인 (필수, 예: KRW-BTC, KRW-ETH)
- `userId`: 사용자 ID (선택사항)
- `userEmail`: 사용자 이메일 (선택사항)
- `timestamp`: 요청 시간 (ISO 8601 형식, 선택사항)

#### 요청 예시
```
GET /api/bot/start?coin=KRW-BTC&userId=user123&userEmail=user@example.com&timestamp=2023-12-23T10:30:00.000Z
```

#### 응답 형식
```json
{
  "success": boolean,
  "message": "응답 메시지",
  "coin": "KRW-BTC",
  "startTime": "2023-12-23T10:30:00.000Z"
}
```

#### 응답 예시
```json
{
  "success": true,
  "message": "KRW-BTC 봇이 성공적으로 시작되었습니다",
  "coin": "KRW-BTC",
  "startTime": "2023-12-23T10:30:00.000Z"
}
```

### 3. 봇 중지 (개별 코인)
**GET** `/api/bot/stop`

특정 코인의 자동매매 봇을 중지합니다.

#### 요청 헤더
```
Authorization: 2121
Content-Type: application/json
```

#### 쿼리 파라미터
- `coin`: 중지할 코인 (필수, 예: KRW-BTC, KRW-ETH)
- `userId`: 사용자 ID (선택사항)
- `userEmail`: 사용자 이메일 (선택사항)
- `timestamp`: 요청 시간 (ISO 8601 형식, 선택사항)

#### 요청 예시
```
GET /api/bot/stop?coin=KRW-BTC&userId=user123&userEmail=user@example.com&timestamp=2023-12-23T10:30:00.000Z
```

#### 응답 형식
```json
{
  "success": boolean,
  "message": "응답 메시지",
  "coin": "KRW-BTC",
  "stopTime": "2023-12-23T10:35:00.000Z"
}
```

#### 응답 예시
```json
{
  "success": true,
  "message": "KRW-BTC 봇이 안전하게 중지되었습니다",
  "coin": "KRW-BTC",
  "stopTime": "2023-12-23T10:35:00.000Z"
}
```

## 오류 처리

### HTTP 상태 코드
- `200`: 성공
- `400`: 잘못된 요청
- `401`: 인증 실패 (잘못된 Authorization 헤더)
- `500`: 서버 내부 오류
- `503`: 서비스 사용 불가

### 오류 응답 형식
```json
{
  "error": "오류 메시지",
  "code": "ERROR_CODE",
  "timestamp": "2023-12-23T10:30:00.000Z"
}
```

## 구현 참고사항

### 1. 인증 검증
```javascript
// Express.js 예시
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== '2121') {
    return res.status(401).json({ error: '인증 실패' });
  }
  next();
});
```

### 2. 타임아웃 설정
- 상태 확인: 5초
- 시작/중지: 10초

### 3. 보안 고려사항
- Authorization 헤더 검증 필수
- CORS 설정 (localhost:3000 허용)
- 요청 로깅

### 4. 상태 관리
- 봇 상태를 메모리 또는 파일에 저장
- 프로세스 재시작 시에도 상태 유지 권장

### 5. 로깅
- 모든 API 호출 로깅
- 봇 시작/중지 이벤트 로깅
- 오류 발생 시 상세 로깅

## 테스트 방법

### 1. 상태 확인 테스트
```bash
curl -X GET http://localhost:8001/api/bot/status \
  -H "Authorization: 2121" \
  -H "Content-Type: application/json"
```

### 3. 봇 시작 테스트 (개별 코인)
```bash
curl -X GET "http://localhost:8001/api/bot/start?coin=KRW-BTC&userId=test&userEmail=test@example.com&timestamp=2023-12-23T10:30:00.000Z" \
  -H "Authorization: 2121" \
  -H "Content-Type: application/json"
```

### 4. 봇 중지 테스트 (개별 코인)
```bash
curl -X GET "http://localhost:8001/api/bot/stop?coin=KRW-BTC&userId=test&userEmail=test@example.com&timestamp=2023-12-23T10:30:00.000Z" \
  -H "Authorization: 2121" \
  -H "Content-Type: application/json"
```

## 클라이언트 측 구현

클라이언트(이 프로젝트)에서는 다음과 같이 API를 호출합니다:

1. **상태 확인**: 30초마다 자동으로 `/api/crypto-bot/status` 호출하여 실행 중인 모든 코인 정보 확인
2. **봇 시작**: 사용자가 특정 코인의 "시작" 버튼 클릭 시 `/api/crypto-bot/start` 호출 (선택된 코인 정보 포함)
3. **봇 중지**: 사용자가 특정 코인의 "중지" 버튼 클릭 시 `/api/crypto-bot/stop` 호출 (해당 코인만 중지)

### 다중 코인 관리 특징:
- **개별 제어**: 각 코인별로 독립적인 시작/중지 가능
- **동시 실행**: 여러 코인을 동시에 자동매매 가능
- **실시간 상태**: 실행 중인 모든 코인의 상태를 실시간으로 표시
- **개별 중지**: 실행 중인 코인 목록에서 개별적으로 중지 가능

모든 요청은 사용자 인증을 거쳐 userId와 userEmail이 포함되며, Authorization 헤더에 시크릿 키 `2121`이 포함됩니다.

## Upbit 연동 기능

클라이언트는 Upbit API를 통해 KRW 마켓의 코인 목록을 가져와 사용자가 선택할 수 있도록 합니다:

- **마켓 정보**: Upbit의 KRW 마켓 코인 목록 (예: KRW-BTC, KRW-ETH)
- **코인 검색**: 한국어명, 영어명, 심볼로 검색 가능
- **인기 코인**: 주요 코인들의 빠른 선택 버튼 제공
- **개별 제어**: 선택된 코인별로 개별 시작/중지 버튼 제공
- **다중 선택**: 여러 코인을 선택하여 각각 독립적으로 자동매매 시작 가능

## 서버 구현 가이드

### 1. 다중 코인 상태 관리
```javascript
// 실행 중인 코인들을 관리하는 Map 또는 객체
const runningCoins = new Map();

// 코인 시작 시
runningCoins.set('KRW-BTC', {
  market: 'KRW-BTC',
  korean_name: '비트코인',
  english_name: 'Bitcoin',
  symbol: 'BTC',
  startTime: new Date().toISOString()
});

// 상태 응답 시
const response = {
  isRunning: runningCoins.size > 0,
  runningCoins: Array.from(runningCoins.values()),
  message: `${runningCoins.size}개 코인이 실행 중입니다`
};
```

### 2. 다중 코인 상태 관리
```javascript
// 실행 중인 코인들을 관리하는 Map 또는 객체
const runningCoins = new Map();

// 코인 시작 시
runningCoins.set('KRW-BTC', {
  korean_name: '비트코인',
  english_name: 'Bitcoin',
  start_time: new Date().toISOString(),
  status: 'running'
});

// 상태 응답 시 (새로운 형식)
const response = {
  success: true,
  data: {
    active_coins: Array.from(runningCoins.keys()),
    api_version: '2.0',
    coin_status: Object.fromEntries(runningCoins),
    server_time: new Date().toISOString(),
    total_active: runningCoins.size
  }
};
```

### 3. 개별 코인 제어
```javascript
// 시작 API
app.get('/api/bot/start', (req, res) => {
  const { coin } = req.query;

  if (runningCoins.has(coin)) {
    return res.json({
      success: false,
      message: `${coin}은 이미 실행 중입니다`
    });
  }

  // 코인별 봇 시작 로직
  startCoinBot(coin);

  res.json({
    success: true,
    message: `${coin} 봇이 시작되었습니다`,
    coin: coin,
    startTime: new Date().toISOString()
  });
});

// 중지 API
app.get('/api/bot/stop', (req, res) => {
  const { coin } = req.query;

  if (!runningCoins.has(coin)) {
    return res.json({
      success: false,
      message: `${coin}은 실행 중이 아닙니다`
    });
  }

  // 코인별 봇 중지 로직
  stopCoinBot(coin);

  res.json({
    success: true,
    message: `${coin} 봇이 중지되었습니다`,
    coin: coin,
    stopTime: new Date().toISOString()
  });
});
```