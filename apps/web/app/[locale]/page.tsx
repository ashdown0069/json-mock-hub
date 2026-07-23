import React from 'react';
import { LandingLayout } from '@/features/landing/components/LandingLayout';
import { LandingLoginForm } from '@/features/auth/components/LandingLoginForm';

export default async function Home() {
  return (
    <LandingLayout>
      <LandingLoginForm />
    </LandingLayout>
  );
}

