"use client";

import { useEffect, useRef, useState } from "react";
import { Instagram, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { EditableImageTrigger } from "@/components/EditableImageSlot";
import { getInstagramEmbedUrl } from "@/lib/site-images";

type ReelReviewCardProps = {
  src: string;
  handle: string;
};

const MIN_EMBED_HEIGHT = 480;
const MAX_EMBED_HEIGHT = 1100;

// Instagram embed header is 54px; add 1px safety so no hairline or wrapped audio text peeks through.
const INSTAGRAM_HEADER_CROP_PX = 55;
// Reserve vertical room below the 4:5 (125%) video for Instagram's native bottom chrome
// ("View more on Instagram" + action icons + likes count + comment/IG footer ≈ 154-170px) before MEASURE arrives.
const INSTAGRAM_BOTTOM_CHROME_FALLBACK_PX = 164;

export function ReelReviewCard({ src, handle }: ReelReviewCardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const embedUrl = getInstagramEmbedUrl(src);

  useEffect(() => {
    setMeasuredHeight(null);
    if (!embedUrl) return;

    const handleMessage = (event: MessageEvent) => {
      if (!/^https:\/\/(www\.)?instagram\.com$/i.test(event.origin)) return;
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow || event.source !== frameWindow) return;

      let parsed: unknown = event.data;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          return;
        }
      }

      if (!parsed || typeof parsed !== "object") return;
      const msg = parsed as { type?: unknown; details?: { height?: unknown } };
      const height = msg.details?.height;
      if (
        msg.type === "MEASURE" &&
        typeof height === "number" &&
        Number.isFinite(height) &&
        height > 0
      ) {
        setMeasuredHeight(
          Math.min(Math.max(Math.round(height), MIN_EMBED_HEIGHT), MAX_EMBED_HEIGHT),
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [embedUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  if (embedUrl) {
    const visibleHeight =
      measuredHeight !== null ? measuredHeight - INSTAGRAM_HEADER_CROP_PX : null;

    return (
      <article className="relative flex h-full flex-col overflow-hidden rounded-[3px] border border-border/80 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
        <div
          data-testid="instagram-embed-viewport"
          className="relative w-full overflow-hidden bg-white"
          style={
            visibleHeight !== null
              ? { height: `${visibleHeight}px` }
              : {
                  height: 0,
                  paddingBottom: `calc(125% + ${INSTAGRAM_BOTTOM_CHROME_FALLBACK_PX}px)`,
                }
          }
        >
          <iframe
            ref={iframeRef}
            id="ligera-instagram-review-reel"
            name="ligera-instagram-review-reel"
            key={`instagram-reel-${embedUrl}`}
            src={embedUrl}
            title={`Instagram reel by ${handle}`}
            loading="lazy"
            scrolling="no"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{
              height:
                measuredHeight !== null
                  ? `${measuredHeight}px`
                  : `calc(100% + ${INSTAGRAM_HEADER_CROP_PX}px)`,
              top: `-${INSTAGRAM_HEADER_CROP_PX}px`,
            }}
            className="absolute left-0 block w-full border-0 bg-white"
          />
        </div>

        <EditableImageTrigger
          imageKey="reviewReel"
          label="Review Reel"
          aspectHint="Instagram Reel URL (or vertical .mp4 / .webm)"
          positionClassName="top-3 right-3"
        />
      </article>
    );
  }

  return (
    <article className="relative flex h-full flex-col justify-between overflow-hidden rounded-[3px] border border-border/80 bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div
        onClick={togglePlay}
        className="group relative aspect-[9/16] w-full cursor-pointer overflow-hidden bg-secondary/80 select-none"
      >
        <video
          ref={videoRef}
          key={src}
          src={src}
          autoPlay
          loop
          muted={muted}
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />

        <EditableImageTrigger
          imageKey="reviewReel"
          label="Review Reel"
          aspectHint="Instagram Reel URL (or vertical .mp4 / .webm)"
          positionClassName="top-3 right-3"
        />

        {/* Center Play indicator when paused */}
        {!isPlaying && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs">
              <Play className="ml-0.5 h-5 w-5 fill-white" />
            </div>
          </div>
        )}

        {/* Bottom Audio and Play Controls */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 text-white">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            aria-label={isPlaying ? "Pause reel" : "Play reel"}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/90 transition-colors hover:bg-black/60"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute audio" : "Mute audio"}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/90 transition-colors hover:bg-black/60"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Compact Attribution Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-border/50 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm">
            <Instagram className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-medium text-foreground/85">{handle}</span>
        </div>
      </div>
    </article>
  );
}
