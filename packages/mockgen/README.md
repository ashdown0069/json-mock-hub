# `@workspace/mockgen`

`@faker-js/faker`를 기반으로 정의된 JSON 스키마(`JsonSchema`)를 해석하여 **실제와 동일한 형태의 가상(Mock) 데이터를 실시간으로 동적 생성하는 엔진** 패키지입니다.

프론트엔드 스키마 빌더의 실시간 데이터 미리보기(`apps/web`) 및 백엔드 Mock REST 엔드포인트 서빙(`apps/api`), AI 어시스턴트(`apps/mcp`)에서 공통으로 사용됩니다.

---

## 🛠️ 주요 기능

1. **다양한 Faker 카테고리 매핑 (`fakerMethods.ts`)**
   - 사용자/인물: `person.fullName`, `person.firstName`, `person.avatar` 등
   - 인터넷/통신: `internet.email`, `internet.url`, `internet.ip`, `internet.userName` 등
   - 위치/주소: `location.streetAddress`, `location.city`, `location.country`, `location.zipCode` 등
   - 상거래/금융: `commerce.productName`, `commerce.price`, `finance.accountNumber` 등
   - 날짜/시간: `date.past`, `date.recent`, `date.future`, `date.isoDate` 등
   - 시스템/고유값: `string.uuid`, `string.alphanumeric`, `number.int`, `datatype.boolean` 등

2. **중첩 객체 및 배열 재귀 생성**
   - Object 타입 필드 내 하위 필드 재귀 탐색 생성
   - Array 타입 필드 내 요소 반복 생성

3. **단건 / 목록 / 페이징 데이터 포맷 지원**
   - 단건 상세 응답 객체 생성
   - `total`, `page`, `limit`이 포함된 표준 페이지네이션 응답 생성

---

## 📦 모듈 구성

```
packages/mockgen/src/
├── generateData.ts   # 스키마 및 옵션을 기반으로 Mock 데이터 레코드를 생성하는 코어 엔진
├── convertSchema.ts  # UI 스키마 형식을 데이터 생성 내부 스펙으로 변환/정규화
└── fakerMethods.ts   # 지원하는 Faker 메서드 목록 및 타입 매핑 테이블
```

---

## 💻 사용 예시

```typescript
import { generateData, convertSchema } from '@workspace/mockgen';
import { JsonSchema } from '@workspace/types';

const userSchema: JsonSchema = {
  name: 'User',
  fields: [
    { id: '1', name: 'id', type: 'string', mockType: 'string.uuid', required: true },
    { id: '2', name: 'name', type: 'string', mockType: 'person.fullName', required: true },
    { id: '3', name: 'email', type: 'string', mockType: 'internet.email', required: true }
  ]
};

// 1. 단건 Mock 데이터 생성
const singleUser = generateData(userSchema, { count: 1 });
// 결과: { id: "f47ac10b-...", name: "Jane Doe", email: "jane.doe@example.com" }

// 2. 5건의 배열 목록 Mock 데이터 생성
const userList = generateData(userSchema, { count: 5, isArray: true });
```

---

## 🚀 실행 및 테스트

```bash
# 타입 검사
npm run typecheck -w packages/mockgen

# 단위 테스트 (Jest)
npm run test -w packages/mockgen

# 린트 검사
npm run lint -w packages/mockgen
```
