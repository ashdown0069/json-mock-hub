"use client"

import React from "react"
import { LogOut, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@workspace/ui/components/button"
import { useLogout } from "../api/logoutService"

export interface LogoutButtonProps {
  className?: string
  variant?: "ghost" | "outline" | "default"
  size?: "default" | "sm" | "lg" | "icon"
}

export function LogoutButton({
  className = "",
  variant = "ghost",
  size = "icon",
}: LogoutButtonProps) {
  const t = useTranslations("Auth")
  const { mutate: handleLogout, isPending } = useLogout()

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => handleLogout()}
      disabled={isPending}
      className={`cursor-pointer text-muted-foreground hover:text-foreground transition-colors ${className}`}
      aria-label={t("logout")}
      title={t("logout")}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
    </Button>
  )
}
