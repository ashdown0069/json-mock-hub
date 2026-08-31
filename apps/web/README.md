# JSON Mock Hub — Web (Frontend)

JSON Mock Hub의 프론트엔드 웹 애플리케이션으로, 시각적 스키마 빌더, 대규모 가상화 파일 트리 탐색기, 실시간 협업(SSE), 멀티 타겟 코드 자동 생성 패널 및 워크스페이스 관리 대시보드를 제공합니다.

> **모노레포 위치:** `apps/web` · [🏠 루트 문서](../../README.md) · [⚙️ 백엔드 문서](../api/README.md) · [🤖 MCP 서버](../mcp/README.md)

---

## 🛠️ 기술 스택

| 영역                              | 사용 기술                                                                            |
| :-------------------------------- | :----------------------------------------------------------------------------------- |
| **Framework**                     | **Next.js 15.5** (App Router, Turbopack)                                             |
| **Core**                          | **React 19.2**, **TypeScript 5.9**                                                   |
| **상태 관리 & 데이터 페칭**       | **TanStack Query v5** (서버 캐시/동기화), **Zustand v5** (클라이언트 상호작용 상태)  |
| **폼 & 유효성 검증**              | **React Hook Form**, **Zod** (`@hookform/resolvers`)                                 |
| **UI & Styling**                  | **Tailwind CSS v4**, **shadcn/ui** (`@workspace/ui`), Radix UI, Lucide Icons, Sonner |
| **가상화 트리 & 코드 하이라이트** | **react-arborist** (가상화 파일 트리), **Shiki** (문법 강조)                         |
| **다국어 (i18n)**                 | **next-intl** (한국어 `ko`, 영어 `en`)                                               |
| **테스트**                        | **Jest**, **React Testing Library** (RTL), `@testing-library/user-event`             |
| **공유 패키지**                   | `@workspace/types`, `@workspace/codegen`, `@workspace/mockgen`, `@workspace/ui`      |

---

## ✨ 핵심 기능

- **시각적 스키마 에디터 (`features/mock-api`)**
  - 필드 추가/수정, 기본 타입 선택, Faker Mock 생성 규칙 매핑
  - 중첩(Object/Array) 스키마 정의 및 실시간 가상 데이터 생성 결과 미리보기
- **대규모 가상화 파일 브라우저 (`features/file-browser`)**
  - `react-arborist` 기반으로 수백 개 이상의 Mock API 및 폴더 트리를 가상화(Virtualization) 렌더링
  - 인라인 이름 변경, 드래그앤드롭(DnD) 폴더 이동 및 동일 이름 폴더 이동 시 자동 병합 흐름 지원
- **멀티 타겟 코드 자동 생성 (`features/code-gen`)**
  - 정의된 스키마로부터 TypeScript Interface, Fetch/Axios 클라이언트, TanStack Query 훅, Zod/Yup/Joi 스키마 즉시 생성 및 복사
- **워크스페이스 & RBAC 대시보드 (`features/workspace`, `features/workspace-settings`)**
  - 워크스페이스 생성/참여, Owner/Member 역할 및 5대 세부 권한(`create`, `rename`, `update`, `delete`, `move`) 제어
  - AI MCP 및 외부 연동용 워크스페이스 API 키 발급/관리
- **실시간 SSE 동기화**
  - 백엔드 EventSource 스트림을 구독하여 동시 작업자의 트리 변경(생성/이동/수정/삭제)을 새로고침 없이 실시간 반영
- **다국어 지원**
  - `next-intl` 기반으로 한국어(`ko`)와 영어(`en`) 로케일 라우팅 및 메시지 번역 지원

---

## 🏛️ 아키텍처 및 디렉토리 구조

`features/` 도메인 단위 모듈 분리(Feature-Driven Architecture)를 채택하여 관심사를 명확히 분리하고 응집도를 높였습니다.

```
apps/web/
├── app/
│   └── [locale]/                         # App Router (next-intl i18n 로케일 라우트)
│       ├── (root)/
│       │   ├── (dashboard)/
│       │   │   └── workspaces/
│       │   │       ├── page.tsx          # 워크스페이스 목록/생성
│       │   │       └── [workspaceId]/
│       │   │           ├── (explorer)/   # 트리 탐색기 + Mock 상세 / 코드 생성 패널
│       │   │           ├── settings/     # 워크스페이스 권한 / 멤버 / API 키 관리
│       │   │           └── mcp/          # MCP 연동 가이드 및 설정 안내
│       │   ├── signup/                   # 회원가입 페이지
│       │   └── page.tsx                  # 서비스 소개 랜딩 페이지
│       ├── layout.tsx                    # 전역 레이아웃 (Providers)
│       ├── error.tsx / not-found.tsx     # 에러 및 404 핸들러
│       └── global-error.tsx              # 루트 에러 바운더리
├── features/                             # 도메인별 응집 모듈 (UI, API, State)
│   ├── auth/                             # 로그인, 회원가입 UI 및 폼 로직
│   ├── code-gen/                         # 코드 생성 패널, 타겟별 프리뷰 (Shiki)
│   ├── dashboard/                        # 요청 로그 및 사용 통계
│   ├── file-browser/                     # react-arborist 트리, DnD, SSE 구독 훅
│   ├── landing/                          # 서비스 소개 랜딩 페이지 컴포넌트
│   ├── mcp-guide/                        # MCP 설치 및 AI 연동 가이드
│   ├── mock-api/                         # 스키마 빌더 폼, Mock 상세 뷰, 미리보기
│   ├── workspace/                        # 워크스페이스 목록, 생성, 참여 모달
│   └── workspace-settings/               # 멤버 관리, 세부 권한 수정, API 키 관리
├── hooks/                                # 전역 공통 커스텀 훅
├── lib/                                  # Axios 인스턴스, queryKeys, 유틸리티
├── messages/                             # 다국어 리소스 (ko.json, en.json)
└── middleware.ts                         # next-intl i18n 라우팅 및 보호 경로 인증 가드
```

---

## 🚀 실행 및 검증 방법

### 요구사항

- Node.js >= 20.0.0
- 실행 중인 `apps/api` 백엔드 서버

### 환경 변수 (`apps/web/.env.local`)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4001     # API 서버 및 SSE 주소
NEXT_PUBLIC_MOCK_DOMAIN=localhost:4001           # Mock API URL 생성용 도메인
```

### 명령어

```bash
# 개발 서버 실행 (Turbopack, 포트 4000)
npm run dev -w apps/web

# TypeScript 컴파일 검사
npm run typecheck -w apps/web

# 린트 검사
npm run lint -w apps/web

# 단위/통합 테스트 (Jest + RTL)
npm run test -w apps/web

# 프로덕션 빌드 및 실행
npm run build -w apps/web
npm run start -w apps/web
```
