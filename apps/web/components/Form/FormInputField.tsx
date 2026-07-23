"use client"

import React, { useState } from "react"
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form"
import { Eye, EyeOff } from "lucide-react"
import { Field, FieldLabel, FieldError } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@workspace/ui/components/input-group"

interface FormInputFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>
  name: TName
  label: string
  type?: string
  placeholder?: string
  className?: string
}

export function FormInputField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  type = "text",
  placeholder,
  className,
}: FormInputFieldProps<TFieldValues, TName>) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === "password"

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error}>
          <FieldLabel className="body-2">{label}</FieldLabel>
          {isPassword ? (
            <InputGroup>
              <InputGroupInput
                type={showPassword ? "text" : "password"}
                placeholder={placeholder}
                className={className}
                aria-invalid={!!fieldState.error}
                {...field}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          ) : (
            <Input
              type={type}
              placeholder={placeholder}
              className={className}
              aria-invalid={!!fieldState.error}
              {...field}
            />
          )}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
