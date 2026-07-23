import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@workspace/ui/components/sonner"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import Providers from "@/components/providers/QueryProvider"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { routing } from "@/i18n/routing"
import "@workspace/ui/globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // 지원하는 로케일이 아닐 경우 404
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  // 메시지 가져오기
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <Toaster
            richColors
            position="top-center"
            swipeDirections={["left", "right"]}
          />
          <Providers>
            <TooltipProvider>{children}</TooltipProvider>
          </Providers>
          {process.env.NODE_ENV === "production" ? <Analytics /> : null}
          {process.env.NODE_ENV === "production" ? <SpeedInsights /> : null}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
