"use client";

import { useEffect, useRef, useState } from "react";

type SeamlessVideoLoopProps = {
  src: string;
  poster?: string;
  className?: string;
  crossfadeSeconds?: number;
};

type LoopState = {
  current: 0 | 1;
  fadingOut: 0 | 1 | null;
};

function enforceMutedAutoplayAttrs(el: HTMLVideoElement) {
  el.defaultMuted = true;
  el.muted = true;
  el.playsInline = true;
  el.setAttribute("muted", "");
  el.setAttribute("playsinline", "");
}

function tryPlay(el: HTMLVideoElement) {
  enforceMutedAutoplayAttrs(el);
  try {
    const result = el.play();
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch {
    // ignore autoplay rejection in constrained environments
  }
}

/**
 * Dual-buffer `<video>` player that keeps the next playthrough rolling underneath at `0s` and
 * dissolves the ending video out over top, eliminating both seek pauses and hard jump cuts.
 */
export function SeamlessVideoLoop({
  src,
  poster,
  className = "h-full w-full object-cover",
  crossfadeSeconds = 1.25,
}: SeamlessVideoLoopProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [loopState, setLoopState] = useState<LoopState>({ current: 0, fadingOut: null });
  const [useNativeLoop, setUseNativeLoop] = useState(false);
  const [standbyPreload, setStandbyPreload] = useState(false);

  const stateRef = useRef<LoopState>(loopState);
  stateRef.current = loopState;

  const handoffTimerRef = useRef<number | null>(null);
  const handoffInFlightRef = useRef(false);
  const nativeLoopRef = useRef(false);
  const standbyRequestedRef = useRef(false);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    setLoopState({ current: 0, fadingOut: null });
    setUseNativeLoop(false);
    setStandbyPreload(false);
    handoffInFlightRef.current = false;
    nativeLoopRef.current = false;
    standbyRequestedRef.current = false;

    const vA = videoARef.current;
    const vB = videoBRef.current;
    if (!vA || !vB) return;

    enforceMutedAutoplayAttrs(vA);
    enforceMutedAutoplayAttrs(vB);

    let disposed = false;
    const getVideo = (slot: 0 | 1) => (slot === 0 ? vA : vB);

    let rafId: number | null = null;

    const stopTick = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const enableStandby = () => {
      if (standbyRequestedRef.current || nativeLoopRef.current) return;
      standbyRequestedRef.current = true;
      setStandbyPreload(true);
    };

    const checkDuration = () => {
      const d = vA.duration;
      if (Number.isFinite(d) && d > 0 && d <= crossfadeSeconds * 2) {
        nativeLoopRef.current = true;
        setUseNativeLoop(true);
        stopTick();
      }
    };

    const startInitial = () => {
      if (vA.readyState >= 1 && vA.currentTime > 0) {
        vA.currentTime = 0;
      }
      if (isVisibleRef.current) {
        tryPlay(vA);
      }
      vB.pause();
      if (vB.readyState >= 1 && vB.currentTime !== 0) {
        vB.currentTime = 0;
      }
    };

    const retryPrimaryPlay = () => {
      if (disposed || !isVisibleRef.current || handoffInFlightRef.current) return;
      if (stateRef.current.current === 0 && vA.paused) {
        tryPlay(vA);
      }
    };

    const triggerHandoff = (): boolean => {
      if (handoffInFlightRef.current || nativeLoopRef.current || !isVisibleRef.current) {
        return false;
      }

      const outgoing: 0 | 1 = stateRef.current.current;
      const incoming: 0 | 1 = outgoing === 0 ? 1 : 0;
      const incomingEl = getVideo(incoming);
      const outgoingEl = getVideo(outgoing);

      if (!standbyRequestedRef.current || incomingEl.readyState < 2) {
        return false;
      }

      handoffInFlightRef.current = true;
      enforceMutedAutoplayAttrs(incomingEl);
      if (incomingEl.currentTime !== 0) {
        incomingEl.currentTime = 0;
      }

      const commitHandoff = () => {
        if (disposed || !isVisibleRef.current || nativeLoopRef.current) {
          incomingEl.pause();
          handoffInFlightRef.current = false;
          return;
        }
        setLoopState({ current: incoming, fadingOut: outgoing });
        if (handoffTimerRef.current !== null) {
          window.clearTimeout(handoffTimerRef.current);
        }
        handoffTimerRef.current = window.setTimeout(() => {
          outgoingEl.pause();
          if (outgoingEl.readyState >= 1 && outgoingEl.currentTime !== 0) {
            outgoingEl.currentTime = 0;
          }
          setLoopState((s) => (s.fadingOut === outgoing ? { ...s, fadingOut: null } : s));
          handoffInFlightRef.current = false;
        }, crossfadeSeconds * 1000 + 80);
      };

      try {
        const playPromise = incomingEl.play();
        if (playPromise && typeof playPromise.then === "function") {
          playPromise.then(commitHandoff).catch(() => {
            handoffInFlightRef.current = false;
          });
        } else {
          commitHandoff();
        }
      } catch {
        handoffInFlightRef.current = false;
        return false;
      }

      return true;
    };

    const startTick = () => {
      if (rafId !== null || nativeLoopRef.current || !isVisibleRef.current) return;
      const tick = () => {
        rafId = null;
        if (disposed || !isVisibleRef.current || nativeLoopRef.current) return;
        const activeEl = getVideo(stateRef.current.current);
        if (
          !standbyRequestedRef.current &&
          activeEl === vA &&
          vA.currentTime >= 2 &&
          vA.readyState >= 3
        ) {
          enableStandby();
        }
        if (!handoffInFlightRef.current) {
          const duration = activeEl.duration;
          if (
            Number.isFinite(duration) &&
            duration > crossfadeSeconds * 2 &&
            activeEl.currentTime >= duration - crossfadeSeconds
          ) {
            triggerHandoff();
          }
        }
        if (isVisibleRef.current && !nativeLoopRef.current) {
          rafId = window.requestAnimationFrame(tick);
        }
      };
      rafId = window.requestAnimationFrame(tick);
    };

    const handleEnded = (e: Event) => {
      if (nativeLoopRef.current || !isVisibleRef.current) return;
      const activeEl = getVideo(stateRef.current.current);
      if (e.currentTarget !== activeEl) return;
      if (!handoffInFlightRef.current && triggerHandoff()) {
        return;
      }
      if (!handoffInFlightRef.current) {
        activeEl.currentTime = 0;
        tryPlay(activeEl);
      }
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && containerRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          const visible = entry.isIntersecting;
          isVisibleRef.current = visible;
          if (!visible) {
            stopTick();
            if (handoffTimerRef.current !== null) {
              window.clearTimeout(handoffTimerRef.current);
              handoffTimerRef.current = null;
            }
            const activeSlot = stateRef.current.current;
            const standbySlot: 0 | 1 = activeSlot === 0 ? 1 : 0;
            getVideo(activeSlot).pause();
            const standbyEl = getVideo(standbySlot);
            standbyEl.pause();
            if (standbyEl.readyState >= 1 && standbyEl.currentTime !== 0) {
              standbyEl.currentTime = 0;
            }
            handoffInFlightRef.current = false;
            setLoopState((s) => (s.fadingOut !== null ? { ...s, fadingOut: null } : s));
          } else {
            tryPlay(getVideo(stateRef.current.current));
            startTick();
          }
        },
        { threshold: 0 },
      );
      observer.observe(containerRef.current);
    }

    if (vA.readyState >= 1) {
      checkDuration();
    }
    if (vA.readyState >= 4) {
      enableStandby();
    }
    vA.addEventListener("loadedmetadata", checkDuration);
    vA.addEventListener("loadeddata", retryPrimaryPlay);
    vA.addEventListener("canplay", retryPrimaryPlay);
    vA.addEventListener("canplaythrough", enableStandby);
    vA.addEventListener("ended", handleEnded);
    vB.addEventListener("ended", handleEnded);

    startInitial();
    startTick();

    return () => {
      disposed = true;
      stopTick();
      if (observer) {
        observer.disconnect();
      }
      if (handoffTimerRef.current !== null) {
        window.clearTimeout(handoffTimerRef.current);
        handoffTimerRef.current = null;
      }
      vA.removeEventListener("loadedmetadata", checkDuration);
      vA.removeEventListener("loadeddata", retryPrimaryPlay);
      vA.removeEventListener("canplay", retryPrimaryPlay);
      vA.removeEventListener("canplaythrough", enableStandby);
      vA.removeEventListener("ended", handleEnded);
      vB.removeEventListener("ended", handleEnded);
    };
  }, [src, crossfadeSeconds]);

  const getSlotStyle = (slot: 0 | 1): React.CSSProperties => {
    if (loopState.fadingOut === slot) {
      return {
        zIndex: 2,
        opacity: 0,
        transition: `opacity ${crossfadeSeconds}s ease-in-out`,
      };
    }
    if (loopState.current === slot) {
      return {
        zIndex: loopState.fadingOut !== null ? 1 : 2,
        opacity: 1,
        transition: "none",
      };
    }
    return {
      zIndex: 0,
      opacity: 0,
      transition: "none",
    };
  };

  return (
    <div ref={containerRef} className="relative isolate h-full w-full overflow-hidden">
      <video
        ref={videoARef}
        src={src}
        poster={poster}
        autoPlay
        loop={useNativeLoop}
        muted
        playsInline
        preload="auto"
        style={getSlotStyle(0)}
        className={`absolute inset-0 ${className}`}
      />
      <video
        ref={videoBRef}
        src={standbyPreload ? src : undefined}
        muted
        playsInline
        preload={standbyPreload ? "auto" : "none"}
        aria-hidden="true"
        style={getSlotStyle(1)}
        className={`pointer-events-none absolute inset-0 ${className}`}
      />
    </div>
  );
}
