"use client";

import { useEffect, useRef, useState } from "react";

type LazyCategoryVideoProps = {
  src: string;
  poster?: string;
  alt: string;
  className?: string;
};

/**
 * Defers downloading and playing below-the-fold category videos until they are near the viewport,
 * keeping mobile LCP fast while preserving seamless visual motion.
 */
export function LazyCategoryVideo({
  src,
  poster,
  alt,
  className,
}: LazyCategoryVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setShouldLoad(true);
          if (el.src) {
            const p = el.play();
            if (p && typeof p.catch === "function") {
              p.catch(() => {});
            }
          }
        } else {
          el.pause();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !shouldLoad) return;
    el.muted = true;
    el.playsInline = true;
    const p = el.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
  }, [shouldLoad, src]);

  return (
    <video
      ref={videoRef}
      src={shouldLoad ? src : undefined}
      poster={poster}
      aria-label={alt}
      autoPlay={shouldLoad}
      loop
      muted
      playsInline
      preload="none"
      className={className}
    />
  );
}
