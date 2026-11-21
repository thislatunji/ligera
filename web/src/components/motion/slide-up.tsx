"use client";

import { ReactNode } from "react";

export function SlideUp({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`motion-safe:animate-slide-up motion-reduce:animate-none ${className}`}>
      {children}
    </div>
  );
}

export default SlideUp;
