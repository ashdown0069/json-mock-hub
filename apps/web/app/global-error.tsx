"use client"

/**
 * 루트 레이아웃 자체가 실패했을 때의 최후 경계.
 * 이 컴포넌트는 root layout을 대체하므로 html/body를 직접 렌더해야 하고,
 * NextIntlClientProvider 밖이라 번역을 쓸 수 없다 (하드코딩이 의도된 것).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ko">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            padding: "32px",
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: 600 }}>
            문제가 발생했습니다 / Something went wrong
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b" }}>
            잠시 후 다시 시도해 주세요. / Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            다시 시도 / Try again
          </button>
          {error.digest ? (
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>#{error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  )
}
