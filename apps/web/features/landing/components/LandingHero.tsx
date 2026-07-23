import React from "react"
import { useTranslations } from "next-intl"
import { Database, Server } from "lucide-react"

export function LandingHero() {
  const t = useTranslations("LandingPage")

  return (
    <div className="relative flex flex-1 flex-col justify-center overflow-hidden bg-muted/30 p-6 lg:border-r lg:border-border lg:bg-transparent lg:p-12 xl:p-18">
      <div className="absolute inset-0 -z-10 hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background lg:block"></div>

      <div className="mx-auto w-full max-w-xl translate-x-0 space-y-10 opacity-100 transition-opacity duration-500 lg:mx-0">
        <h1 className="text-5xl leading-[1.1] font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          {t.rich("heroTitle", {
            brand: (chunks) => (
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                {chunks}
              </span>
            ),
          })}
        </h1>
        <p className="text-lg font-medium text-muted-foreground sm:text-xl">
          {t("heroDescription")}
        </p>

        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="mb-1 text-base font-bold">{t("schemaBuilder")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("schemaBuilderDesc")}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Server className="h-5 w-5" />
            </div>
            <h3 className="mb-1 text-base font-bold">
              {t("instantEndpoints")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("instantEndpointsDesc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
