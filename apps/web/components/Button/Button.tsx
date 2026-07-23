"use client"

import React from "react"
import { Button } from "@workspace/ui/components/button"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface ButtonProps extends React.ComponentProps<typeof Button> {
  TextType?: string
  isLoading?: boolean
}

export function ConfirmButton({
  TextType,
  className,
  children,
  isLoading,
  disabled,
  ...props
}: ButtonProps) {
  const t = useTranslations("Button")
  return (
    <Button
      className={cn("cursor-pointer rounded-lg hover:bg-primary/85", className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {TextType ? t(TextType) : children}
    </Button>
  )
}

export function DestructiveButton({
  TextType,
  className,
  children,
  isLoading,
  disabled,
  ...props
}: ButtonProps) {
  const t = useTranslations("Button")
  const variant = TextType === "cancel" ? "outline" : "destructive"
  return (
    <Button
      variant={variant}
      className={cn("cursor-pointer rounded-lg", className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {TextType ? t(TextType) : children}
    </Button>
  )
}
