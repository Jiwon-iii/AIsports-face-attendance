# AI Face Attendance

안면인식 기반 출석 인증 웹앱입니다.  
이 프로젝트는 실무 확장을 염두에 둔 구조로 시작하되, 개인 포트폴리오에서도 바로 설명 가능한 보편적인 출석 시나리오를 목표로 합니다.

## 1. 프로젝트 목표

- 얼굴 등록, 현장 체크인, 관리자 확인까지 이어지는 출석 플로우 구현
- 대리출석 방지를 위한 본인 인증 흐름(추후 liveness 포함) 설계
- 실무 전환 시 멀티 조직/대회 도메인으로 확장 가능한 데이터 구조 유지

## 2. 현재 범위 (MVP Stage-1)

- `홈`: 기능 진입 허브
- `등록(/register)`: 사용자/동의 등록 UI
- `체크인(/checkin)`: 카메라 인증 UI
- `관리(/admin)`: 출석 로그 확인 UI
- `얼굴관리(/admin/faces)`: 관리자 얼굴 샘플 등록/조회/삭제 UI
- API 기본 구현:
  - `POST /api/users`
  - `POST /api/consents`
  - `POST /api/attendance`
  - `GET /api/attendance`
  - `POST /api/attendance/verify`
  - `POST /api/face-profiles`
  - `GET /api/face-profiles`
  - `DELETE /api/face-profiles/:id`

실제 얼굴 매칭 엔진 연결과 운영용 인증/인가는 다음 단계입니다.

## 3. 기술 스택

- Next.js (App Router)
- TypeScript
- Tailwind CSS v4
- ESLint
- MongoDB + Mongoose
- Zod (API 입력 검증)

## 4. 데이터 모델 초안 (MongoDB)

### `users`
- `userId` (unique, string UUID)
- `name`
- `email` (optional)
- `isActive`
- `createdAt`, `updatedAt`

### `faceProfiles`
- `userId`
- `embeddings` (number[][] 또는 number[])
- `qualityScore`
- `createdAt`, `updatedAt`

### `attendanceRecords`
- `userId`
- `checkType` (`IN` | `OUT`)
- `status` (`SUCCESS` | `FAILED` | `MANUAL`)
- `matchedScore`
- `livenessScore`
- `capturedAt`
- `deviceId`

### `consents`
- `userId`
- `version`
- `agreedAt`
- `revokedAt`

## 5. 기본 라우트 구조

- `src/app/page.tsx`
- `src/app/register/page.tsx`
- `src/app/checkin/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/faces/page.tsx`
- `src/app/api/users/route.ts`
- `src/app/api/consents/route.ts`
- `src/app/api/attendance/route.ts`
- `src/app/api/face-profiles/route.ts`
- `src/app/api/face-profiles/[id]/route.ts`

## 6. 환경 변수

`.env.local` 파일을 만들고 아래 값을 설정합니다.

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=ai_face_attendance
COMPREFACE_SERVER=http://localhost
COMPREFACE_PORT=8000
COMPREFACE_RECOGNITION_API_KEY=your_compreface_recognition_api_key
FACE_MATCH_THRESHOLD=0.82
```

샘플은 `.env.example` 파일을 참고합니다.

## 7. 개발 로드맵

1. `/register`, `/admin` 화면에 실제 API 연동
2. `faceProfiles` 등록 API 구현 (`/api/face-profiles`)
3. 체크인 매칭 로직 + 임계값 설정 컬렉션 도입
4. liveness(눈깜빡임/헤드턴) 최소 구현
5. 인증/인가(관리자 권한) 추가
6. 운영 로그/모니터링 지표 강화

## 8. 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후 각 라우트로 이동합니다.

## 9. 포트폴리오 관점 포인트

- 문제정의: 대회/현장 환경의 빠른 출석 인증
- 설계: 등록-인증-운영의 E2E 흐름
- 확장성: 범용 모델 + 도메인 필드 추후 확장 전략
- 안정성: 실패 처리/수동 처리/로그 전략 반영
