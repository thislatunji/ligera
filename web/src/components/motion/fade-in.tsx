"use client";

import { ReactNode } from "react";

export function FadeIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`motion-safe:animate-fade-in motion-reduce:animate-none ${className}`}>
      {children}
    </div>
  );
}

export default FadeIn;
