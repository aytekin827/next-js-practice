# 주식매도 API 문서

한국투자증권(KIS) API를 사용한 주식 매도 관련 엔드포인트 문서입니다.

## 목차
1. [보유 종목 조회](#1-보유-종목-조회)
2. [매도 주문](#2-매도-주문)
3. [일괄 매도 주문](#3-일괄-매도-주문)
4. [매도 대기 주문 조회](#4-매도-대기-주문-조회)
5. [매도 주문 수정](#5-매도-주문-수정)
6. [매도 주문 취소](#6-매도-주문-취소)

---

## 1. 보유 종목 조회

### Endpoint
```
GET /api/holdings
```

### 설명
사용자의 계좌에서 보유 중인 주식 종목을 조회합니다.

### KIS API
- **TR_ID**: `TTTC8434R` (주식잔고조회)
- **URL**: `/uapi/domestic-stock/v1/trading/inquire-balance`

### 응답 예시
```json
[
  {
    "symbol": "005930",
    "name": "삼성전자",
    "quantity": 100,
    "avgPrice": 75000,
    "currentPrice": 78000,
    "totalValue": 7800000,
    "profitLoss": 300000,
    "profitLossPercent": 4.0
  }
]
```

---

## 2. 매도 주문

### Endpoint
```
POST /api/sell
```

### 설명
개별 종목에 대한 매도 주문을 실행합니다.

### KIS API
- **TR_ID**: `TTTC0801U` (주식주문(현금) 매도)
- **URL**: `/uapi/domestic-stock/v1/trading/order-cash`

### 요청 본문
```json
{
  "symbol": "005930",
  "quantity": 100,
  "price": 80000,
  "orderType": "limit"  // "limit" 또는 "market"
}
```

### 파라미터
- `symbol` (필수): 종목코드 (6자리)
- `quantity` (필수): 매도 수량
- `price` (조건부 필수): 매도 가격 (지정가 주문 시 필수)
- `orderType` (선택): 주문 유형
  - `limit`: 지정가 주문 (기본값)
  - `market`: 시장가 주문

### 응답 예시
```json
{
  "success": true,
  "message": "매도 주문이 접수되었습니다",
  "order": {
    "orderId": "0000123456",
    "symbol": "005930",
    "quantity": 100,
    "price": 80000,
    "orderType": "limit",
    "status": "pending",
    "orderTime": "2024-12-19T09:30:00.000Z"
  }
}
```

---

## 3. 일괄 매도 주문

### Endpoint
```
POST /api/sell/bulk
```

### 설명
여러 종목에 대한 매도 주문을 일괄로 실행합니다.

### KIS API
- **TR_ID**: `TTTC0801U` (주식주문(현금) 매도)
- **URL**: `/uapi/domestic-stock/v1/trading/order-cash`
- **주의**: API 호출 간 100ms 대기 (초당 20건 제한 고려)

### 요청 본문
```json
{
  "orders": [
    {
      "symbol": "005930",
      "quantity": 100,
      "price": 80000,
      "orderType": "limit"
    },
    {
      "symbol": "000660",
      "quantity": 50,
      "price": 125000,
      "orderType": "limit"
    }
  ]
}
```

### 응답 예시
```json
{
  "success": true,
  "message": "2개 종목의 매도 주문이 모두 성공했습니다",
  "successCount": 2,
  "failedCount": 0,
  "orders": [
    {
      "orderId": "0000123456",
      "symbol": "005930",
      "quantity": 100,
      "price": 80000,
      "orderType": "limit",
      "status": "success",
      "orderTime": "2024-12-19T09:30:00.000Z"
    }
  ],
  "failedOrders": []
}
```

---

## 4. 매도 대기 주문 조회

### Endpoint
```
GET /api/sell-orders
```

### 설명
당일 미체결 매도 주문을 조회합니다.

### KIS API
- **TR_ID**: `TTTC8001R` (주식 당일 주문 체결 조회)
- **URL**: `/uapi/domestic-stock/v1/trading/inquire-daily-ccld`

### 응답 예시
```json
[
  {
    "id": "0000123456",
    "symbol": "005930",
    "name": "삼성전자",
    "quantity": 100,
    "sellPrice": 80000,
    "orderTime": "20241219 093000",
    "status": "pending",
    "executedQuantity": 0,
    "remainingQuantity": 100
  }
]
```

### 주문 상태
- `pending`: 대기중
- `partial`: 부분체결
- `completed`: 완료
- `cancelled`: 취소됨

---

## 5. 매도 주문 수정

### Endpoint
```
PUT /api/sell-orders/{orderId}
```

### 설명
미체결 매도 주문의 가격을 수정합니다.

### KIS API
- **TR_ID**: `TTTC0803U` (주식주문(정정취소))
- **URL**: `/uapi/domestic-stock/v1/trading/order-rvsecncl`

### 요청 본문
```json
{
  "sellPrice": 82000,
  "symbol": "005930",
  "quantity": 100
}
```

### 파라미터
- `sellPrice` (필수): 새로운 매도 가격
- `symbol` (필수): 종목코드
- `quantity` (필수): 주문 수량

### 응답 예시
```json
{
  "success": true,
  "message": "매도 주문이 수정되었습니다",
  "newOrderId": "0000123457"
}
```

---

## 6. 매도 주문 취소

### Endpoint
```
DELETE /api/sell-orders/{orderId}
```

### 설명
미체결 매도 주문을 취소합니다.

### KIS API
- **TR_ID**: `TTTC0803U` (주식주문(정정취소))
- **URL**: `/uapi/domestic-stock/v1/trading/order-rvsecncl`

### 응답 예시
```json
{
  "success": true,
  "message": "매도 주문이 취소되었습니다"
}
```

---

## 공통 에러 응답

### 인증 오류
```json
{
  "error": "인증이 필요합니다"
}
```
**Status Code**: 401

### KIS 설정 오류
```json
{
  "error": "KIS API 설정이 필요합니다. 프로필에서 설정을 완료해주세요."
}
```
**Status Code**: 400

### KIS API 오류
```json
{
  "error": "매도 주문 실패: [KIS API 오류 메시지]"
}
```
**Status Code**: 400

### 서버 오류
```json
{
  "error": "서버 오류가 발생했습니다"
}
```
**Status Code**: 500

---

## KIS API 주요 파라미터

### 주문구분 (ORD_DVSN)
- `00`: 지정가
- `01`: 시장가
- `02`: 조건부지정가
- `03`: 최유리지정가
- `04`: 최우선지정가
- `05`: 장전시간외
- `06`: 장후시간외

### 정정취소구분코드 (RVSE_CNCL_DVSN_CD)
- `01`: 정정
- `02`: 취소

### 매도매수구분코드 (SLL_BUY_DVSN_CD)
- `01`: 매수
- `02`: 매도

---

## 주의사항

1. **API 호출 제한**: 한국투자증권 API는 초당 20건의 호출 제한이 있습니다.
2. **토큰 관리**: 액세스 토큰은 24시간 유효하며, 자동으로 캐싱 및 갱신됩니다.
3. **주문 시간**: 주식 주문은 장 운영 시간(09:00-15:30)에만 가능합니다.
4. **가격 단위**: 주식 가격은 호가 단위에 맞춰야 합니다.
5. **수량 제한**: 보유 수량을 초과하여 매도할 수 없습니다.

---

## 참고 문서

- [한국투자증권 Open API 포털](https://apiportal.koreainvestment.com/)
- [KIS Developers 문서](https://apiportal.koreainvestment.com/apiservice-summary)
