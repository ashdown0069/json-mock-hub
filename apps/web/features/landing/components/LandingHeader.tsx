import React from 'react';

export function LandingHeader() {
  return (
    <header className="h-16 px-8 flex items-center justify-between border-b border-border/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">J</div>
        <span className="text-xl font-bold tracking-tight">JsonMockHub</span>
      </div>
    </header>
  );
}
