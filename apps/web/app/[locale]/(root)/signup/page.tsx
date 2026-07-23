import React from "react"
import { LandingLayout } from "@/features/landing/components/LandingLayout"
import { SignupForm } from "@/features/auth/components/SignupForm"

const SignupPage = () => {
  return (
    <LandingLayout>
      <SignupForm />
    </LandingLayout>
  )
}

export default SignupPage

