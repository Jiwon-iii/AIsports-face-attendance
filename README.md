# AI Face Attendance

Next.js(App Router) + TypeScript 기반 안면인식 출석 시스템입니다.  
체크인 화면은 자동 얼굴 인증 중심으로 동작하고, 등록/관리 기능은 관리자 화면에서 처리합니다.

## 1. 주요 기능

- 자동 얼굴 인증 체크인 (`/`, `/checkin`)
  - 카메라 프레임을 주기적으로 캡처해 `/api/attendance/verify` 호출
  - 2회 연속 매칭 시 출석 저장
  - 이미 출석(`SUCCESS` 또는 `MANUAL`) 처리된 참가자는 중복 저장 방지
- 체크인 화면 수동 출석 패널(모바일/태블릿 키오스크)
  - 참가자 번호 입력 시 등록 사진/이름 조회
  - `"OOO님이 맞습니까?"` 확인 후 `예/아니오`로 수동 출석 확정
- 관리자 인증 (`/admin/login`)
  - 세션 쿠키 + CSRF 토큰 기반 보호
  - 로그인 실패 횟수 제한 및 잠금(429)
- 참가자 관리 (`/admin`, `/admin/participants`)
  - 참가자 생성/수정/삭제
  - 출석 취소(개별), 출석 초기화(전체)
  - 동의(Consent) + 얼굴 샘플(최대 3장) 등록
- 얼굴 프로필 관리 (`/admin/faces`)
  - 참가자 번호 기준 얼굴 샘플 등록/조회/삭제

## 2. 기술 스택

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- MongoDB + Mongoose
- Zod
- CompreFace SDK (`@exadel/compreface-js-sdk`)

## 3. 프로젝트 구조

```txt
src/
  _components/    UI 컴포넌트
  _hooks/         클라이언트 데이터 훅
  _handlers/      공통 클라이언트 유틸(fetch, image 처리)
  _lib/           DB/인증/응답/가드/얼굴엔진 공통 로직
  models/         Mongoose 모델
  app/
    api/          API 라우트
    admin/        관리자 페이지
    checkin/      체크인 페이지
    register/     등록 안내 페이지
```

## 4. 데이터 모델

- `users`
  - `userId(참가자 번호, 숫자 전용)`, `name`, `gender(MALE|FEMALE)`, `age`, `isActive`
- `faceProfiles`
  - `userId(unique, 참가자 번호)`, `samples[]`(최대 3), `embeddings?`, `qualityScore?`
- `attendanceRecords`
  - `userId(참가자 번호)`, `checkType(IN|OUT)`, `status(SUCCESS|FAILED|MANUAL)`, `matchedScore?`, `livenessScore?`, `capturedAt`
- `consents`
  - `userId(참가자 번호)`, `version`, `agreedAt`, `revokedAt?`
- `adminAccounts`
  - `loginId`, `password(해시 저장)`

## 5. API 요약

모든 응답은 `{ success, data | error }` 형태입니다.

- Admin 인증
  - `POST /api/admin/login`
  - `POST /api/admin/logout`
- 사용자
  - `POST /api/users`
  - `GET /api/users`
  - `PATCH /api/users/:userId`
  - `DELETE /api/users/:userId`
  - `GET /api/users/manual-candidate?userId=...`
- 동의
  - `POST /api/consents`
- 얼굴 프로필
  - `POST /api/face-profiles`
  - `GET /api/face-profiles`
  - `DELETE /api/face-profiles/:id`
- 출석
  - `POST /api/attendance` (관리자 수동 저장용)
  - `GET /api/attendance`
  - `POST /api/attendance/verify` (체크인 얼굴 인증)
  - `POST /api/attendance/reset` (전체 초기화)
  - `DELETE /api/attendance/:userId` (개별 초기화)

참고:
- `/api/attendance/verify`는 관리자 쿠키 없이 호출됩니다.
- 그 외 관리성 API는 관리자 로그인 필요합니다.

## 6. 환경 변수

`.env.local` 파일 생성:

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=ai_face_attendance

COMPREFACE_SERVER=http://localhost
COMPREFACE_PORT=8000
COMPREFACE_RECOGNITION_API_KEY=your_compreface_recognition_api_key

FACE_MATCH_THRESHOLD=0.95
FACE_MATCH_MARGIN=0.02
FACE_REQUIRE_LIVENESS=false
FACE_LIVENESS_THRESHOLD=0.9

ATTENDANCE_VERIFY_MAX_REQUESTS_PER_IP=120
ATTENDANCE_VERIFY_WINDOW_MINUTES=1
ATTENDANCE_VERIFY_LOCKOUT_MINUTES=1

ADMIN_AUTH_COOKIE_NAME=admin_auth
ADMIN_CSRF_COOKIE_NAME=admin_csrf
NEXT_PUBLIC_ADMIN_CSRF_COOKIE_NAME=admin_csrf
ADMIN_SESSION_TTL_HOURS=8
ADMIN_LOGIN_MAX_FAILURES=5
ADMIN_LOGIN_IP_MAX_FAILURES=10
ADMIN_LOGIN_WINDOW_MINUTES=15
ADMIN_LOGIN_LOCKOUT_MINUTES=15
```

## 7. 실행 방법

```bash
npm install
npm run dev
```

- 앱 주소: `http://localhost:3000`

## 8. 운영 전 체크리스트

- MongoDB 연결 확인
- CompreFace 서버/API 키 유효성 확인
- `adminAccounts` 컬렉션에 관리자 계정 존재 확인
- HTTPS 환경에서 카메라 권한 테스트
- `npm run lint` 통과 확인

## 9. 보안 회귀 테스트

- 위치: `tests/security/security-e2e.mjs`
- 실행:

```bash
npm run test:security
```

- 검증 항목:
  - CSRF 토큰 없이 관리자 변경 요청 시 차단(403)
  - 로그인 실패 횟수 제한/잠금(429)
  - 잘못된 관리자 세션으로 `/admin` 접근 시 로그인 리다이렉트

## 10. 참가자 번호 마이그레이션

- 스크립트: `scripts/migrate-participant-numbers.mjs`

```bash
# 1) 변경 대상 확인 (dry-run)
npm run migrate:participant-numbers

# 2) 실제 DB 반영
npm run migrate:participant-numbers -- --apply

# 3) DB 반영 + CompreFace subject 동기화
npm run migrate:participant-numbers -- --apply --sync-face-engine
```

- 결과 매핑 파일: `migration-participant-number-map.json`
