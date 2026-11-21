"use client";

import { ReactNode, CSSProperties } from "react";

export function Motion({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`motion-safe:transition-all motion-reduce:transition-none ${className}`} style={style}>
      {children}
    </div>
  );
}

export default Motion;
