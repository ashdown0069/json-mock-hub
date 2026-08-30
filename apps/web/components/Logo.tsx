import React from "react"
import { Link } from "@/i18n/routing"

export interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
  shape?: "circle" | "square"
  href?: string
  className?: string
}

export function Logo({
  size = "md",
  showText = true,
  shape = "circle",
  href,
  className = "",
}: LogoProps) {
  const iconSizes = {
    sm: "h-7 w-7 rounded-lg",
    md: "h-9 w-9 rounded-xl",
    lg: "h-12 w-12 rounded-2xl",
    xl: "h-16 w-16 rounded-2xl",
  }

  const svgSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
    xl: "h-9 w-9",
  }

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-3xl",
  }

  const dotFill = "#38bdf8" // Electric Neon Cyan

  // 원형 도트 (Circle Dots)
  const renderCircleDots = () => {
    const r = 1.7
    return (
      <>
        {/* 비활성 보조 가이드 도트 */}
        <circle cx="3.1" cy="8.2" r="0.9" fill="#27272a" />
        <circle cx="7.6" cy="8.2" r="0.9" fill="#27272a" />
        <circle cx="16.4" cy="8.2" r="0.9" fill="#27272a" />
        <circle cx="20.9" cy="8.2" r="0.9" fill="#27272a" />

        <circle cx="3.1" cy="12.8" r="0.9" fill="#27272a" />
        <circle cx="7.6" cy="12.8" r="0.9" fill="#27272a" />
        <circle cx="16.4" cy="12.8" r="0.9" fill="#27272a" />
        <circle cx="20.9" cy="12.8" r="0.9" fill="#27272a" />

        <circle cx="16.4" cy="17.4" r="0.9" fill="#27272a" />
        <circle cx="20.9" cy="17.4" r="0.9" fill="#27272a" />

        <circle cx="16.4" cy="21.0" r="0.9" fill="#27272a" />
        <circle cx="20.9" cy="21.0" r="0.9" fill="#27272a" />

        {/* 1. 상단 5칸 전체 가로바 (ㅡ) */}
        <circle cx="3.1" cy="3.6" r={r} fill={dotFill} />
        <circle cx="7.6" cy="3.6" r={r} fill={dotFill} />
        <circle cx="12.0" cy="3.6" r={r} fill={dotFill} />
        <circle cx="16.4" cy="3.6" r={r} fill={dotFill} />
        <circle cx="20.9" cy="3.6" r={r} fill={dotFill} />

        {/* 2. 중앙(3번째 열 cx=12.0)에서 기둥 수직 하강 */}
        <circle cx="12.0" cy="8.2" r={r} fill={dotFill} />
        <circle cx="12.0" cy="12.8" r={r} fill={dotFill} />
        <circle cx="12.0" cy="17.4" r={r} fill={dotFill} />

        {/* 3. 하단 바닥 및 좌측 감아올림 (J 훅) */}
        <circle cx="7.6" cy="21.0" r={r} fill={dotFill} />
        <circle cx="12.0" cy="21.0" r={r} fill={dotFill} />
        <circle cx="3.1" cy="21.0" r={r} fill={dotFill} />
        <circle cx="3.1" cy="16.5" r={r} fill={dotFill} />
      </>
    )
  }

  // 둥근 사각 도트 (Square Dots)
  const renderSquareDots = () => {
    return (
      <>
        {/* 비활성 보조 가이드 도트 */}
        <circle cx="3" cy="8" r="0.9" fill="#27272a" />
        <circle cx="7.5" cy="8" r="0.9" fill="#27272a" />
        <circle cx="16.5" cy="8" r="0.9" fill="#27272a" />
        <circle cx="21" cy="8" r="0.9" fill="#27272a" />

        <circle cx="3" cy="12.5" r="0.9" fill="#27272a" />
        <circle cx="7.5" cy="12.5" r="0.9" fill="#27272a" />
        <circle cx="16.5" cy="12.5" r="0.9" fill="#27272a" />
        <circle cx="21" cy="12.5" r="0.9" fill="#27272a" />

        <circle cx="16.5" cy="17" r="0.9" fill="#27272a" />
        <circle cx="21" cy="17" r="0.9" fill="#27272a" />

        <circle cx="16.5" cy="20.5" r="0.9" fill="#27272a" />
        <circle cx="21" cy="20.5" r="0.9" fill="#27272a" />

        {/* 1. 상단 5칸 전체 가로바 (ㅡ) */}
        <rect x="1.5" y="2" width="3.2" height="3.2" rx="0.8" fill={dotFill} />
        <rect x="6" y="2" width="3.2" height="3.2" rx="0.8" fill={dotFill} />
        <rect x="10.4" y="2" width="3.2" height="3.2" rx="0.8" fill={dotFill} />
        <rect x="14.8" y="2" width="3.2" height="3.2" rx="0.8" fill={dotFill} />
        <rect x="19.3" y="2" width="3.2" height="3.2" rx="0.8" fill={dotFill} />

        {/* 2. 중앙(3번째 열 x=10.4)에서 기둥 수직 하강 */}
        <rect
          x="10.4"
          y="6.6"
          width="3.2"
          height="3.2"
          rx="0.8"
          fill={dotFill}
        />
        <rect
          x="10.4"
          y="11.2"
          width="3.2"
          height="3.2"
          rx="0.8"
          fill={dotFill}
        />
        <rect
          x="10.4"
          y="15.8"
          width="3.2"
          height="3.2"
          rx="0.8"
          fill={dotFill}
        />

        {/* 3. 하단 바닥 및 좌측 감아올림 (J 훅) */}
        <rect x="6" y="19.5" width="3.2" height="3.2" rx="0.8" fill={dotFill} />
        <rect
          x="10.4"
          y="19.5"
          width="3.2"
          height="3.2"
          rx="0.8"
          fill={dotFill}
        />
        <rect
          x="1.5"
          y="19.5"
          width="3.2"
          height="3.2"
          rx="0.8"
          fill={dotFill}
        />
        <rect x="1.5" y="15" width="3.2" height="3.2" rx="0.8" fill={dotFill} />
      </>
    )
  }

  const content = (
    <div
      className={`group inline-flex items-center gap-2.5 select-none ${className}`}
    >
      {/* 도트 J 심볼 아이콘 */}
      <div
        className={`relative flex ${iconSizes[size]} items-center justify-center border border-zinc-800 bg-zinc-950 shadow-md shadow-sky-500/25 transition-all duration-300 group-hover:scale-105 group-hover:border-sky-500/60 group-hover:shadow-sky-500/40`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={svgSizes[size]}
        >
          {shape === "circle" ? renderCircleDots() : renderSquareDots()}
        </svg>
      </div>

      {/* 텍스트 워드마크 */}
      {showText && (
        <div
          className={`flex items-center font-sans tracking-tight ${textSizes[size]}`}
        >
          <span className="font-semibold text-foreground">Json</span>
          <span className="font-extrabold tracking-tighter text-foreground">
            MockHub
          </span>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex cursor-pointer transition-opacity hover:opacity-90"
      >
        {content}
      </Link>
    )
  }

  return content
}
