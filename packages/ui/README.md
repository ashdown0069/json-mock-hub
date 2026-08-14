# `@workspace/ui`

JSON Mock Hub 모노레포의 **공통 디자인 시스템 및 UI 컴포넌트 라이브러리** 패키지입니다.
Radix UI Primitives와 Tailwind CSS v4를 기반으로 구축된 shadcn/ui 컴포넌트들을 제공하며, 웹 애플리케이션(`apps/web`)과 테스트 샌드박스(`apps/test`)에서 공유됩니다.

---

## 🛠️ 기술 스택

- **React 19** / **React DOM 19**
- **Tailwind CSS v4** (`@tailwindcss/postcss`)
- **Radix UI** 접근성 프리미티브 (`radix-ui`)
- **CVA (class-variance-authority)** (컴포넌트 변형 관리)
- **clsx** & **tailwind-merge** (`cn` 유틸리티)
- **Lucide React** (아이콘 세트)

---

## 📦 패키지 Exports 구성

`package.json`의 `exports` 필드를 통해 직접 경로로 컴포넌트와 유틸리티를 가져올 수 있습니다:

```typescript
// 유틸리티
import { cn } from '@workspace/ui/lib/utils';

// UI 컴포넌트
import { Button } from '@workspace/ui/components/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@workspace/ui/components/dialog';
import { Input } from '@workspace/ui/components/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@workspace/ui/components/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Badge } from '@workspace/ui/components/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
```

---

## 💻 사용 예시

```tsx
import React from 'react';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Plus } from 'lucide-react';

export function CreateApiButton() {
  return (
    <Button variant="default" size="sm" className="gap-1.5">
      <Plus className="h-4 w-4" />
      <span>New Mock API</span>
      <Badge variant="secondary" className="ml-1 text-xs">REST</Badge>
    </Button>
  );
}
```

---

## 🚀 검증 및 린트

```bash
# TypeScript 컴파일 검사
npm run typecheck -w packages/ui

# ESLint 검사 및 코드 포맷팅
npm run lint -w packages/ui
npm run format -w packages/ui
```
