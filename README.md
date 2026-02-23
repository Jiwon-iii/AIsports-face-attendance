# AI Face Attendance

안면인식 기반 출석 인증 웹앱입니다.  
이 프로젝트는 실무 확장을 염두에 둔 구조로 시작하되, 개인 포트폴리오에서도 바로 설명 가능한 보편적인 출석 시나리오를 목표로 합니다.

## 1. 프로젝트 목표

- 얼굴 등록, 현장 체크인, 관리자 확인까지 이어지는 출석 플로우 구현
- 대리출석 방지를 위한 본인 인증 흐름(추후 liveness 포함) 설계
- 실무 전환 시 멀티 조직/대회 도메인으로 확장 가능한 데이터 구조 유지

## 2. 현재 범위 (MVP Stage-1)

- `홈`: 기능 진입 허브
- `등록(/register)`: 사용자 정보/동의/얼굴 샘플 등록 UI 뼈대
- `체크인(/checkin)`: 카메라 인증 UI 뼈대
- `관리(/admin)`: 출석 로그 확인 UI 뼈대

현재는 화면 구조 중심이며, API/DB/실제 얼굴 매칭은 다음 단계에서 연결합니다.

## 3. 기술 스택

- Next.js (App Router)
- TypeScript
- Tailwind CSS v4
- ESLint
- MongoDB (예정)

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

## 6. 개발 로드맵

1. MongoDB 연결 및 모델 정의
2. 등록 API 구현 (`/api/users`, `/api/face/register`, `/api/consent`)
3. 체크인 API 구현 (`/api/attendance/verify`)
4. 관리자 로그 API (`/api/attendance/logs`)
5. liveness(눈깜빡임/헤드턴) 최소 구현
6. 예외 처리(수동 출석, 재시도) 및 운영 로그 강화

## 7. 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후 각 라우트로 이동합니다.

## 8. 포트폴리오 관점 포인트

- 문제정의: 대회/현장 환경의 빠른 출석 인증
- 설계: 등록-인증-운영의 E2E 흐름
- 확장성: 범용 모델 + 도메인 필드 추후 확장 전략
- 안정성: 실패 처리/수동 처리/로그 전략 반영
