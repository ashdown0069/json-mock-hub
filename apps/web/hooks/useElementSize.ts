"use client"

import { useCallback, useRef, useState } from "react"

/**
 * 요소의 실제 렌더 크기를 관측한다.
 *
 * react-arborist의 <Tree>는 width/height를 주지 않으면 300×500px로 고정되어
 * 사이드바 폭에서 잘리고 세로가 뷰포트와 무관해진다. 컨테이너 크기를 측정해 전달한다.
 *
 * 콜백 ref를 쓰는 이유: 소비자가 로딩/에러를 early-return으로 처리하면 관측 대상이
 * 첫 커밋에 존재하지 않거나 도중에 교체된다. useEffect(..., [])로 ref.current를
 * 한 번만 읽으면 그 시점에 null이라 관측이 영영 시작되지 않고, 크기가 0에 고정되어
 * `width > 0 && height > 0` 게이팅이 절대 열리지 않는다.
 * 콜백 ref는 노드가 붙고 떨어질 때마다 React가 호출하므로 그 구멍이 없다.
 */
export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null

    if (!node) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })

    observer.observe(node)
    observerRef.current = observer
  }, [])

  return { ref, width: size.width, height: size.height }
}


