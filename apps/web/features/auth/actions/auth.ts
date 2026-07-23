"use server"

import { cookies } from "next/headers"
import * as jose from "jose"
import type { User } from "@/types/User"
import { ACCESS_TOKEN_COOKIE } from "@/const/cookies"

export async function getCurrentUserAction(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value

    if (!token) {
      return null
    }

    const secretText = process.env.JWT_ACCESS_SECRET
    if (!secretText) {
      console.warn("JWT_ACCESS_SECRET 환경변수가 구성되지 않았습니다.")
      return null
    }

    const secret = new TextEncoder().encode(secretText)
    const { payload } = await jose.jwtVerify(token, secret)

    if (!payload.sub || !payload.email) {
      return null
    }

    return {
      email: payload.email as string,
      nickname: (payload.nickname as string) || "",
    }
  } catch (error) {
    // 토큰 만료(JWTExpired) 또는 서명 검증 실패 시 null 리턴
    console.error("Next.js Server Action: 토큰 검증 실패", error)
    return null
  }
}
