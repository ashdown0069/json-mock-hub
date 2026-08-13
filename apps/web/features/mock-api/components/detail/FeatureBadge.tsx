/**
 * 기능 활성화 상태를 시각적으로 나타내는 재사용 뱃지 컴포넌트입니다.
 * variant에 따라 pagination(indigo), sort(emerald), search(amber) 색상 스킴이 적용됩니다.
 */

type FeatureBadgeVariant = "pagination" | "sort" | "search"

interface FeatureBadgeProps {
  /** 뱃지 색상 스킴을 결정하는 variant */
  variant: FeatureBadgeVariant
  /** 뱃지에 표시할 라벨 (예: "Pagination") */
  label: string
  /** 뱃지에 표시할 파라미터 정보 (예: "page / limit") */
  params: string
}

const VARIANT_STYLES: Record<FeatureBadgeVariant, string> = {
  pagination: "bg-indigo-50 text-indigo-600",
  sort: "bg-emerald-50 text-emerald-600",
  search: "bg-amber-50 text-amber-600",
}

export function FeatureBadge({ variant, label, params }: FeatureBadgeProps) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${VARIANT_STYLES[variant]}`}
    >
      {label}: {params}
    </span>
  )
}
