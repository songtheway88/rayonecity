# 분양천국 대시보드에 텔레그램 리드 수신 + SOLAPI 문자 발송 기능 구축 요청

기존 코드 스타일과 DB 구조를 먼저 확인한 뒤, 현재 프로젝트 구조에 맞게 최소 변경으로 구현해줘. DB가 Supabase/Prisma/Firebase/기타 중 무엇인지 확인하고 그 방식에 맞춰 진행해줘.

## 목표

현재 Vercel에 배포되어 있는 "분양천국 대시보드" 앱에 다음 기능을 추가한다.

여러 개의 텔레그램 봇과 여러 개의 랜딩페이지에서 들어오는 리드를 하나의 대시보드 서버에서 수신하고, 유입 경로에 따라 지정된 담당자 번호로 SOLAPI 문자 메시지를 자동 발송한다.

최초 구현 범위는 SMS/LMS 발송까지로 한다. 카카오 알림톡은 추후 2단계로 확장 가능하게 구조만 고려한다.

## 전체 흐름

```text
랜딩페이지
  ↓
텔레그램 봇
  ↓
Vercel API Route
  ↓
DB에 리드 저장
  ↓
담당자 번호 매핑 조회
  ↓
SOLAPI SMS/LMS 발송
  ↓
발송 결과 저장
  ↓
대시보드에서 확인
```

## 구현해야 할 기능

## 1. 텔레그램 Webhook API

여러 텔레그램 봇을 구분할 수 있도록 API Route를 만든다.

예상 URL:

```text
POST /api/telegram/webhook/[botId]
```

예시:

```text
/api/telegram/webhook/bot_001
/api/telegram/webhook/bot_002
/api/telegram/webhook/bot_003
```

`botId`를 기준으로 어떤 텔레그램 봇에서 들어온 리드인지 구분한다.

텔레그램에서 들어오는 update payload를 받아서 다음 정보를 추출한다.

- `bot_id`
- `telegram_user_id`
- `telegram_username`
- `telegram_first_name`
- `telegram_last_name`
- `chat_id`
- `message_text`
- `/start` 파라미터
- 수신 시간

`/start` 파라미터가 있으면 랜딩페이지 또는 캠페인 식별값으로 저장한다.

예:

```text
/start gangnam_a_google
/start songdo_b_meta
/start default
```

## 2. 랜딩페이지/캠페인 식별

텔레그램 링크는 아래처럼 사용할 예정이다.

```text
https://t.me/텔레그램봇아이디?start=gangnam_a_google
https://t.me/텔레그램봇아이디?start=songdo_b_meta
```

서버에서는 `/start` 뒤의 값을 `landing_key` 또는 `campaign_key`로 저장한다.

예:

```text
bot_id: bot_001
landing_key: gangnam_a_google
```

## 3. 리드 저장

DB에 `leads` 테이블 또는 컬렉션을 만든다.

필드 예시:

```text
id
telegram_update_id
bot_id
landing_key
telegram_user_id
telegram_username
telegram_first_name
telegram_last_name
chat_id
customer_name
customer_phone
message_text
raw_payload
assigned_receiver_phone
solapi_message_id
solapi_status
send_status
error_message
created_at
updated_at
```

초기에는 고객 이름/전화번호 파싱이 완벽하지 않아도 된다. 우선 텔레그램 메시지 원문을 저장하고, 메시지에서 전화번호가 감지되면 `customer_phone`에 저장한다.

전화번호 정규식은 한국 휴대폰 번호를 우선 처리한다.

예:

```text
010-1234-5678
01012345678
010 1234 5678
```

## 4. 담당자 번호 매핑

DB에 `lead_routes` 테이블 또는 컬렉션을 만든다.

필드 예시:

```text
id
bot_id
landing_key
receiver_phone
receiver_name
enabled
created_at
updated_at
```

라우팅 규칙:

1. `bot_id + landing_key`가 정확히 일치하는 매핑을 먼저 찾는다.
2. 없으면 `bot_id + default` 매핑을 찾는다.
3. 그래도 없으면 환경변수에 설정된 기본 담당자 번호로 보낸다.
4. 기본 담당자 번호도 없으면 문자 발송은 하지 않고, 리드는 저장하되 `send_status = no_receiver`로 기록한다.

## 5. SOLAPI 문자 발송

SOLAPI API를 사용해 SMS 또는 LMS를 발송한다.

필요한 환경변수:

```text
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SOLAPI_SENDER_PHONE=
DEFAULT_RECEIVER_PHONE=
TELEGRAM_WEBHOOK_SECRET=
```

문자 내용 예시:

```text
[분양천국 신규 리드]
유입: {{landing_key}}
봇: {{bot_id}}
텔레그램: @{{telegram_username}}
이름: {{telegram_first_name}} {{telegram_last_name}}
연락처: {{customer_phone}}
내용: {{message_text}}
시간: {{created_at}}
```

문자 길이가 SMS 기준을 넘으면 LMS로 처리되도록 한다. SOLAPI SDK 또는 REST API 중 프로젝트에 맞는 방식을 사용한다.

발송 후 결과를 `leads`에 저장한다.

저장할 값:

```text
solapi_message_id
solapi_status
send_status = sent | failed | no_receiver
error_message
```

## 6. 보안

Webhook URL이 외부에 노출되므로 최소한의 검증을 넣는다.

권장 방식:

```text
POST /api/telegram/webhook/[botId]?secret=...
```

또는 header:

```text
x-webhook-secret: ...
```

환경변수 `TELEGRAM_WEBHOOK_SECRET`과 일치하지 않으면 401을 반환한다.

또한 허용된 `botId` 목록만 처리한다.

## 7. 중복 처리

텔레그램 update에는 `update_id`가 있다. 동일한 `update_id`가 다시 들어오면 중복 저장/중복 문자 발송을 하지 않는다.

`telegram_updates` 테이블을 따로 만들거나, `leads`에 `telegram_update_id`를 unique로 저장한다.

중복이면 200 응답만 반환하고 추가 작업은 하지 않는다.

## 8. 대시보드 화면

기존 분양천국 대시보드에 다음 화면 또는 섹션을 추가한다.

### 리드 목록

표시 항목:

```text
수신 시간
봇 ID
랜딩/캠페인
텔레그램 사용자
감지된 연락처
문의 내용
담당자 번호
발송 상태
오류 메시지
```

필터:

```text
bot_id
landing_key
send_status
날짜 범위
```

### 라우팅 설정

관리자가 랜딩별 담당자 번호를 설정할 수 있게 한다.

입력 항목:

```text
bot_id
landing_key
receiver_name
receiver_phone
enabled
```

기능:

```text
추가
수정
비활성화
삭제
```

## 9. API 설계 예시

### 텔레그램 Webhook

```text
POST /api/telegram/webhook/[botId]
```

### 리드 목록 조회

```text
GET /api/leads
```

쿼리:

```text
bot_id
landing_key
send_status
from
to
```

### 라우팅 목록 조회

```text
GET /api/lead-routes
```

### 라우팅 생성

```text
POST /api/lead-routes
```

### 라우팅 수정

```text
PATCH /api/lead-routes/[id]
```

### 라우팅 삭제 또는 비활성화

```text
DELETE /api/lead-routes/[id]
```

## 10. Vercel 배포 고려사항

Vercel 서버리스 환경에서 동작해야 한다.

주의사항:

- Webhook 요청은 빠르게 200 응답해야 한다.
- 긴 작업은 피한다.
- SOLAPI 발송 실패 시 에러를 DB에 기록한다.
- 필요하면 추후 큐 시스템으로 분리할 수 있게 서비스 함수를 나눈다.

권장 파일 구조 예시:

```text
/app/api/telegram/webhook/[botId]/route.ts
/app/api/leads/route.ts
/app/api/lead-routes/route.ts
/lib/telegram.ts
/lib/solapi.ts
/lib/lead-routing.ts
/lib/phone.ts
/lib/db.ts
```

기존 프로젝트가 Pages Router를 쓰고 있다면 `/pages/api` 구조에 맞춰 구현한다.

## 11. 구현 우선순위

1. DB 스키마 추가
2. SOLAPI 발송 유틸 구현
3. 텔레그램 Webhook API 구현
4. 리드 저장 구현
5. 담당자 라우팅 구현
6. 중복 update 방지
7. 리드 목록 UI 추가
8. 라우팅 설정 UI 추가
9. Vercel 환경변수 정리
10. 실제 텔레그램 Webhook 연결 테스트

## 12. 완료 기준

다음이 가능하면 완료로 본다.

- 텔레그램 봇으로 메시지를 보내면 Vercel API가 수신한다.
- `botId`와 `/start` 파라미터가 DB에 저장된다.
- 리드가 대시보드에 표시된다.
- 설정된 담당자 번호로 SOLAPI 문자가 발송된다.
- 발송 성공/실패 상태가 대시보드에 표시된다.
- 같은 텔레그램 update가 중복으로 들어와도 문자가 중복 발송되지 않는다.
- 담당자 번호 매핑을 대시보드에서 추가/수정/비활성화할 수 있다.

## 13. 추후 확장 고려

이번에는 SMS/LMS만 구현한다.

하지만 나중에 아래 기능을 붙일 수 있도록 코드 구조를 분리한다.

```text
sendLeadNotification()
  ├─ sendSolapiSms()
  ├─ sendSolapiAlimtalk()
  └─ fallbackToSms()
```

추후 카카오 알림톡 확장 시 필요한 것:

- 카카오 채널
- 발신 프로필
- 알림톡 템플릿 승인
- 템플릿 코드
- 변수 매핑
- 알림톡 실패 시 문자 대체 발송
