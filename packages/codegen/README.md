# `@workspace/codegen`

JSON Mock Hub의 스키마(`JsonSchema`)로부터 **TypeScript 인터페이스, HTTP 클라이언트 함수, React Query 훅, 런타임 유효성 검증 스키마**를 자동으로 생성하는 코드 생성 엔진 라이브러리입니다.

프론트엔드 UI(`apps/web`)의 코드 생성 탭과 AI 어시스턴트(`apps/mcp`)의 `get_api_code` 도구에서 공통 엔진으로 사용됩니다.

---

## 🛠️ 지원하는 코드 생성 타겟 (Supported Targets)

| 분류 | 대상 라이브러리 / 형식 | 주요 함수 | 출력 예시 |
| :--- | :--- | :--- | :--- |
| **TypeScript Types** | 순수 TS `interface` / `type` | `schemaToType(schema)` | `export interface User { id: string; ... }` |
| **API Client** | Native `fetch`, `axios` 함수 | `generateClientSnippet(schema, options)` | `export const getUser = async (id: string): Promise<User> => { ... }` |
| **React Query** | TanStack Query v5 훅 | `generateQuerySnippet(schema, options)` | `export const useUserQuery = (id: string) => useQuery({ ... })` |
| **Validation** | `zod`, `yup`, `joi` 스키마 | `generateValidationSnippet(schema, target)` | `export const userSchema = z.object({ id: z.string(), ... })` |

---

## 📦 모듈 구성

```
packages/codegen/src/
├── schemaToType.ts       # JsonSchema -> TypeScript Type 선언 변환
├── clientSnippets.ts     # Fetch / Axios 호출 함수 템플릿 생성
├── querySnippets.ts      # useQuery / useMutation TanStack Query 훅 템플릿 생성
├── validationSnippets.ts # Zod, Yup, Joi 런타임 검증 스키마 코드 생성
├── identifiers.ts        # 카멜케이스, 파스칼케이스 등 식별자 네이밍 변환
├── listSignature.ts      # 목록/페이징용 시그니처 헬퍼
├── responseTypes.ts      # 응답 래퍼 타입 처리
└── context.ts            # 코드 생성 컨텍스트 관리
```

---

## 💻 사용 예시

```typescript
import {
  schemaToType,
  generateClientSnippet,
  generateQuerySnippet,
  generateValidationSnippet
} from '@workspace/codegen';
import { JsonSchema } from '@workspace/types';

const userSchema: JsonSchema = {
  name: 'User',
  fields: [
    { id: '1', name: 'id', type: 'string', required: true },
    { id: '2', name: 'email', type: 'string', required: true }
  ]
};

// 1. TypeScript 인터페이스 생성
const tsCode = schemaToType(userSchema);

// 2. Axios 클라이언트 함수 생성
const axiosCode = generateClientSnippet(userSchema, { client: 'axios', baseUrl: '/api/users' });

// 3. TanStack Query 훅 생성
const queryCode = generateQuerySnippet(userSchema, { hookType: 'query', queryKey: 'users' });

// 4. Zod 스키마 생성
const zodCode = generateValidationSnippet(userSchema, { target: 'zod' });
```

---

## 🚀 실행 및 테스트

```bash
# 타입 검사
npm run typecheck -w packages/codegen

# 단위 테스트 실행 (Jest)
npm run test -w packages/codegen

# 린트 검사
npm run lint -w packages/codegen
```
