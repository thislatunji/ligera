"use client";

import { useId, useState, type CSSProperties } from "react";

type ReedSpec = {
  id: string;
  angle: number;
  length: number;
  width: number;
  swayClass: "animate-diffuser-reed-a" | "animate-diffuser-reed-b";
  duration: string;
  delay: string;
};

type WispSpec = {
  id: string;
  d: string;
  strokeWidth: number;
  className: "animate-diffuser-wisp" | "animate-diffuser-wisp-alt";
  duration: string;
  delay: string;
  grad: "a" | "b";
};

type MoteSpec = {
  id: string;
  cx: number;
  cy: number;
  r: number;
  dx: string;
  duration: string;
  delay: string;
};

const REEDS: ReedSpec[] = [
  {
    id: "reed-1",
    angle: -24,
    length: 128,
    width: 4.2,
    swayClass: "animate-diffuser-reed-a",
    duration: "7.6s",
    delay: "-1.1s",
  },
  {
    id: "reed-2",
    angle: -15,
    length: 140,
    width: 4.4,
    swayClass: "animate-diffuser-reed-b",
    duration: "8.8s",
    delay: "-3.4s",
  },
  {
    id: "reed-3",
    angle: -6,
    length: 144,
    width: 4.5,
    swayClass: "animate-diffuser-reed-a",
    duration: "6.9s",
    delay: "-5.2s",
  },
  {
    id: "reed-4",
    angle: 4,
    length: 136,
    width: 4.3,
    swayClass: "animate-diffuser-reed-b",
    duration: "8.1s",
    delay: "-2.1s",
  },
  {
    id: "reed-5",
    angle: 13,
    length: 142,
    width: 4.4,
    swayClass: "animate-diffuser-reed-a",
    duration: "9.1s",
    delay: "-4.5s",
  },
  {
    id: "reed-6",
    angle: 23,
    length: 122,
    width: 4.1,
    swayClass: "animate-diffuser-reed-b",
    duration: "7.4s",
    delay: "-0.8s",
  },
];

const WISPS: WispSpec[] = [
  {
    id: "wisp-1",
    d: "M126 112 C114 90 134 68 122 44 C113 28 124 14 118 4",
    strokeWidth: 2,
    className: "animate-diffuser-wisp",
    duration: "8.2s",
    delay: "-1.2s",
    grad: "a",
  },
  {
    id: "wisp-2",
    d: "M154 96 C168 74 146 52 160 28 C168 16 156 6 162 -4",
    strokeWidth: 2.3,
    className: "animate-diffuser-wisp-alt",
    duration: "9.4s",
    delay: "-3.9s",
    grad: "b",
  },
  {
    id: "wisp-3",
    d: "M178 102 C164 80 186 58 174 34 C166 20 176 10 170 0",
    strokeWidth: 1.8,
    className: "animate-diffuser-wisp",
    duration: "10.4s",
    delay: "-6.4s",
    grad: "a",
  },
  {
    id: "wisp-4",
    d: "M198 118 C210 96 190 74 202 50 C209 36 198 22 204 12",
    strokeWidth: 1.7,
    className: "animate-diffuser-wisp-alt",
    duration: "7.8s",
    delay: "-2.6s",
    grad: "b",
  },
];

const MOTES: MoteSpec[] = [
  { id: "mote-1", cx: 112, cy: 108, r: 2.2, dx: "-10px", duration: "7.4s", delay: "-1.4s" },
  { id: "mote-2", cx: 136, cy: 86, r: 2.8, dx: "9px", duration: "8.6s", delay: "-4.2s" },
  { id: "mote-3", cx: 162, cy: 74, r: 3.1, dx: "-7px", duration: "9.1s", delay: "-2.5s" },
  { id: "mote-4", cx: 184, cy: 92, r: 2.0, dx: "11px", duration: "7.9s", delay: "-5.7s" },
  { id: "mote-5", cx: 208, cy: 112, r: 2.5, dx: "8px", duration: "8.3s", delay: "-0.9s" },
  { id: "mote-6", cx: 146, cy: 118, r: 1.6, dx: "-6px", duration: "6.8s", delay: "-3.1s" },
  { id: "mote-7", cx: 172, cy: 62, r: 2.4, dx: "6px", duration: "9.5s", delay: "-6.3s" },
  { id: "mote-8", cx: 194, cy: 76, r: 1.8, dx: "-9px", duration: "7.2s", delay: "-2.0s" },
];

const BURST_ARCS = [
  {
    id: "burst-arc-1",
    d: "M128 114 C118 88 138 64 126 36",
    strokeWidth: 2.2,
    delay: "0ms",
    origin: "128px 96px",
  },
  {
    id: "burst-arc-2",
    d: "M160 100 C172 72 150 48 162 20",
    strokeWidth: 2.5,
    delay: "90ms",
    origin: "160px 84px",
  },
  {
    id: "burst-arc-3",
    d: "M192 114 C204 88 184 64 196 36",
    strokeWidth: 2.2,
    delay: "160ms",
    origin: "192px 96px",
  },
];

const BURST_SPARKLES = [
  { id: "sparkle-1", cx: 120, cy: 84, r: 2.6, delay: "40ms" },
  { id: "sparkle-2", cx: 152, cy: 64, r: 3.0, delay: "110ms" },
  { id: "sparkle-3", cx: 178, cy: 68, r: 2.4, delay: "140ms" },
  { id: "sparkle-4", cx: 204, cy: 88, r: 2.5, delay: "80ms" },
];

export function ReedDiffuserAnimation() {
  const uid = useId().replace(/:/g, "");
  const [burstCount, setBurstCount] = useState(0);

  const ids = {
    halo: `${uid}-halo`,
    shadowBlur: `${uid}-shadow-blur`,
    reedGrad: `${uid}-reed`,
    oilGrad: `${uid}-oil`,
    meniscusGrad: `${uid}-meniscus`,
    glassGrad: `${uid}-glass`,
    glassSheen: `${uid}-sheen`,
    heelGrad: `${uid}-heel`,
    cavityClip: `${uid}-cavity`,
    wispA: `${uid}-wisp-a`,
    wispB: `${uid}-wisp-b`,
    moteGlow: `${uid}-mote-glow`,
  };

  const handleStir = () => {
    setBurstCount((c) => c + 1);
  };

  return (
    <button
      type="button"
      onClick={handleStir}
      data-testid="reed-diffuser-animation"
      aria-label="Animated Ligera reed diffuser — click to stir the scent"
      className="group relative flex w-full max-w-[280px] cursor-pointer items-center justify-center rounded-2xl p-1 transition-transform duration-500 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      <svg
        viewBox="0 0 320 400"
        className="h-auto w-full overflow-visible select-none"
        aria-hidden="true"
      >
        <defs>
          {/* Warm backlit studio aura */}
          <radialGradient id={ids.halo} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E6B97A" stopOpacity="0.46" />
            <stop offset="55%" stopColor="#DFC49E" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#DFC49E" stopOpacity="0" />
          </radialGradient>

          {/* Soft sunlit cast shadow blur */}
          <filter id={ids.shadowBlur} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4.5" />
          </filter>

          {/* Natural rattan reed */}
          <linearGradient id={ids.reedGrad} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9A6D3B" />
            <stop offset="48%" stopColor="#C89B62" />
            <stop offset="100%" stopColor="#DFBC88" />
          </linearGradient>

          {/* Warm golden amber fragrance oil */}
          <linearGradient id={ids.oilGrad} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#EEA949" />
            <stop offset="52%" stopColor="#D28027" />
            <stop offset="100%" stopColor="#A85A14" />
          </linearGradient>

          {/* Oil meniscus shimmer */}
          <linearGradient id={ids.meniscusGrad} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F5C474" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#FCE0A6" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#E1983D" stopOpacity="0.65" />
          </linearGradient>

          {/* Frosted apothecary glass body */}
          <linearGradient id={ids.glassGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.62" />
            <stop offset="45%" stopColor="#F6EFE3" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#DFCBB2" stopOpacity="0.46" />
          </linearGradient>

          {/* Left specular glass highlight */}
          <linearGradient id={ids.glassSheen} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Thick frosted base heel */}
          <linearGradient id={ids.heelGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EDE2D1" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#D9C7AE" stopOpacity="0.9" />
          </linearGradient>

          {/* Scent wisp gradients fading softly into the air */}
          <linearGradient id={ids.wispA} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#C99A4E" stopOpacity="0.08" />
            <stop offset="35%" stopColor="#C99A4E" stopOpacity="0.58" />
            <stop offset="75%" stopColor="#DFB977" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#DFB977" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={ids.wispB} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#D8AD64" stopOpacity="0.06" />
            <stop offset="32%" stopColor="#C49448" stopOpacity="0.52" />
            <stop offset="78%" stopColor="#E4C488" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#E4C488" stopOpacity="0" />
          </linearGradient>

          <radialGradient id={ids.moteGlow} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F3D496" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#C89B54" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#C89B54" stopOpacity="0" />
          </radialGradient>

          {/* Inner bottle cavity clip */}
          <clipPath id={ids.cavityClip}>
            <path d="M148 181 H172 V196 C172 203 206 214 206 238 V341 C206 347 201 350 194 350 H126 C119 350 114 347 114 341 V238 C114 214 148 203 148 196 Z" />
          </clipPath>
        </defs>

        {/* Layer 1: Warm backlit studio halo */}
        <ellipse
          cx="160"
          cy="240"
          rx="118"
          ry="124"
          fill={`url(#${ids.halo})`}
          className="animate-diffuser-aura"
          style={{ transformOrigin: "160px 240px" }}
        />

        {/* Layer 2: Sunlit cast shadow behind bottle (homage to p-diffuser.jpg) */}
        <g filter={`url(#${ids.shadowBlur})`} opacity="0.2" transform="translate(-42, -16)">
          <g transform="translate(160, 178)">
            {REEDS.map((reed) => (
              <g key={`shadow-${reed.id}`} transform={`rotate(${reed.angle - 3})`}>
                <g
                  className={reed.swayClass}
                  style={{
                    transformOrigin: "0px 0px",
                    animationDuration: reed.duration,
                    animationDelay: reed.delay,
                  }}
                >
                  <rect
                    x={-reed.width / 2}
                    y={-reed.length}
                    width={reed.width}
                    height={reed.length + 6}
                    rx={reed.width / 2}
                    fill="#8C633A"
                  />
                </g>
              </g>
            ))}
          </g>
          <path d="M143 176 H177 V194 C177 202 210 214 210 239 V346 C210 354 204 358 195 358 H125 C116 358 110 354 110 346 V239 C110 214 143 202 143 194 Z" fill="#8C633A" />
        </g>

        {/* Layer 3: Shelf horizon & contact shadow */}
        <line x1="28" y1="358" x2="292" y2="358" stroke="#C8B296" strokeOpacity="0.45" strokeWidth="1" />
        <ellipse cx="160" cy="360" rx="64" ry="8" fill="#5A422B" fillOpacity="0.18" />

        {/* Layer 4: Fanned natural rattan reeds */}
        <g transform="translate(160, 178)">
          <g
            key={`flutter-${burstCount}`}
            className={burstCount > 0 ? "animate-diffuser-flutter" : undefined}
            style={{ transformOrigin: "0px 0px" }}
          >
            {REEDS.map((reed) => (
              <g key={reed.id} transform={`rotate(${reed.angle})`}>
                <g
                  data-diffuser-part="reed"
                  className={reed.swayClass}
                  style={{
                    transformOrigin: "0px 0px",
                    animationDuration: reed.duration,
                    animationDelay: reed.delay,
                  }}
                >
                  {/* Main rattan stick */}
                  <rect
                    x={-reed.width / 2}
                    y={-reed.length}
                    width={reed.width}
                    height={reed.length + 12}
                    rx={reed.width / 2}
                    fill={`url(#${ids.reedGrad})`}
                  />
                  {/* Subtle sunlit edge highlight */}
                  <line
                    x1={-reed.width * 0.18}
                    y1={-reed.length + 3}
                    x2={-reed.width * 0.18}
                    y2={8}
                    stroke="#F4DDB6"
                    strokeOpacity="0.6"
                    strokeWidth="0.9"
                    strokeLinecap="round"
                  />
                  {/* Oil-kissed darkened rattan tip */}
                  <rect
                    x={-reed.width / 2}
                    y={-reed.length}
                    width={reed.width}
                    height="9"
                    rx={reed.width / 2}
                    fill="#8A5C2C"
                    fillOpacity="0.34"
                  />
                </g>
              </g>
            ))}
          </g>
        </g>

        {/* Layer 5: Frosted apothecary bottle & golden amber oil */}
        {/* Outer glass back tone */}
        <path
          d="M141 174 H179 C180.5 174 181 175.5 181 177.5 C181 179.5 179.5 180.5 177 180.5 H175 V194 C175 202 210 213 210 238 V345 C210 353.5 203.5 358 194 358 H126 C116.5 358 110 353.5 110 345 V238 C110 213 145 202 145 194 V180.5 H143 C140.5 180.5 139 179.5 139 177.5 C139 175.5 139.5 174 141 174 Z"
          fill={`url(#${ids.glassGrad})`}
          stroke="#CBB9A1"
          strokeWidth="1.2"
        />

        {/* Clipped interior: amber oil, submerged reeds, meniscus, glass caustics */}
        <g clipPath={`url(#${ids.cavityClip})`}>
          {/* Submerged reed stems visible through the amber oil */}
          <g opacity="0.34" stroke="#7D3F0E" strokeLinecap="round">
            <line x1="154" y1="180" x2="128" y2="345" strokeWidth="3.8" />
            <line x1="158" y1="180" x2="144" y2="347" strokeWidth="4" />
            <line x1="160" y1="180" x2="162" y2="348" strokeWidth="4" />
            <line x1="163" y1="180" x2="180" y2="347" strokeWidth="3.8" />
            <line x1="166" y1="180" x2="195" y2="344" strokeWidth="3.6" />
          </g>

          {/* Main golden amber oil body */}
          <rect x="110" y="218" width="100" height="136" fill={`url(#${ids.oilGrad})`} />

          {/* Undulating meniscus & shimmer rim */}
          <g
            className="animate-diffuser-oil"
            style={{ transformOrigin: "160px 218px" }}
          >
            <ellipse cx="160" cy="218" rx="49" ry="5.5" fill={`url(#${ids.meniscusGrad})`} />
            <ellipse
              cx="160"
              cy="218"
              rx="47"
              ry="4.2"
              fill="none"
              stroke="#FFE7B8"
              strokeOpacity="0.65"
              strokeWidth="1"
            />
          </g>

          {/* Warm vertical caustic glow inside oil */}
          <rect
            x="122"
            y="222"
            width="16"
            height="126"
            rx="8"
            fill="#FFE0A6"
            fillOpacity="0.16"
          />
          <rect
            x="186"
            y="224"
            width="10"
            height="124"
            rx="5"
            fill="#6E3107"
            fillOpacity="0.14"
          />
        </g>

        {/* Thick frosted base heel */}
        <path
          d="M111 343 H209 V346 C209 353 203 357.5 194 357.5 H126 C117 357.5 111 353 111 346 Z"
          fill={`url(#${ids.heelGrad})`}
        />
        <line x1="120" y1="344" x2="200" y2="344" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1" />

        {/* Frosted shoulder & left specular glass highlight */}
        <path
          d="M122 232 C122 217 148 205 151 196 V183"
          fill="none"
          stroke={`url(#${ids.glassSheen})`}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect
          x="118"
          y="236"
          width="9"
          height="104"
          rx="4.5"
          fill={`url(#${ids.glassSheen})`}
          opacity="0.72"
        />
        {/* Lip rim highlight */}
        <rect
          x="141"
          y="175"
          width="38"
          height="4.5"
          rx="2.2"
          fill="#F9F4EA"
          fillOpacity="0.88"
          stroke="#C8B69D"
          strokeWidth="0.7"
        />

        {/* Layer 6: Ligera bottle label */}
        <g>
          {/* Soft paper shadow */}
          <rect
            x="123"
            y="251.5"
            width="76"
            height="68"
            rx="2"
            fill="#4D3319"
            fillOpacity="0.14"
          />
          {/* Cream label card */}
          <rect
            x="122"
            y="250"
            width="76"
            height="68"
            rx="2"
            fill="#FAF6EE"
            stroke="#DFD5C3"
            strokeWidth="0.8"
          />
          {/* Hairline antique-gold inner frame */}
          <rect
            x="125.5"
            y="253.5"
            width="69"
            height="61"
            rx="1"
            fill="none"
            stroke="#C29B56"
            strokeWidth="0.8"
          />

          {/* Delicate gold LG monogram mark */}
          <g transform="translate(160, 267)" fill="none" stroke="#B68B43" strokeWidth="1.15">
            <path d="M-3.5 -6.5 V2.5 H2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M5.5 -4.2 A5 5 0 1 0 5.5 2.4 H1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Brand & product typography */}
          <text
            x="160"
            y="283"
            textAnchor="middle"
            fill="#9E7636"
            fontSize="7.4"
            fontFamily="var(--font-display), Georgia, serif"
            letterSpacing="2.1"
          >
            LIGERA
          </text>
          <line x1="135" y1="288" x2="185" y2="288" stroke="#DEC9A2" strokeWidth="0.7" />
          <text
            x="160"
            y="298.5"
            textAnchor="middle"
            fill="#3B3126"
            fontSize="5.2"
            fontFamily="var(--font-sans), sans-serif"
            fontWeight="600"
            letterSpacing="1.1"
          >
            REED DIFFUSER
          </text>
          <text
            x="160"
            y="308"
            textAnchor="middle"
            fill="#7A6855"
            fontSize="4.6"
            fontFamily="var(--font-sans), sans-serif"
            letterSpacing="1.6"
          >
            EST. 26
          </text>
        </g>

        {/* Layer 7: Rising fragrance wisps & floating aroma motes */}
        <g fill="none" strokeLinecap="round">
          {WISPS.map((wisp) => (
            <path
              key={wisp.id}
              data-diffuser-part="wisp"
              d={wisp.d}
              stroke={`url(#${wisp.grad === "a" ? ids.wispA : ids.wispB})`}
              strokeWidth={wisp.strokeWidth}
              className={wisp.className}
              style={{
                animationDuration: wisp.duration,
                animationDelay: wisp.delay,
              }}
            />
          ))}
        </g>

        <g>
          {MOTES.map((mote) => (
            <circle
              key={mote.id}
              data-diffuser-part="mote"
              cx={mote.cx}
              cy={mote.cy}
              r={mote.r}
              fill={`url(#${ids.moteGlow})`}
              className="animate-diffuser-mote"
              style={
                {
                  "--mote-dx": mote.dx,
                  animationDuration: mote.duration,
                  animationDelay: mote.delay,
                } as CSSProperties
              }
            />
          ))}
        </g>

        {/* Layer 8: Click-triggered scent burst */}
        {burstCount > 0 && (
          <g key={`burst-${burstCount}`} data-diffuser-part="burst">
            {BURST_ARCS.map((arc) => (
              <path
                key={arc.id}
                d={arc.d}
                fill="none"
                stroke={`url(#${ids.wispA})`}
                strokeWidth={arc.strokeWidth}
                strokeLinecap="round"
                className="animate-diffuser-burst"
                style={{
                  transformOrigin: arc.origin,
                  animationDelay: arc.delay,
                }}
              />
            ))}
            {BURST_SPARKLES.map((sparkle) => (
              <circle
                key={sparkle.id}
                cx={sparkle.cx}
                cy={sparkle.cy}
                r={sparkle.r}
                fill={`url(#${ids.moteGlow})`}
                className="animate-diffuser-burst"
                style={{
                  transformOrigin: `${sparkle.cx}px ${sparkle.cy}px`,
                  animationDelay: sparkle.delay,
                }}
              />
            ))}
          </g>
        )}
      </svg>
    </button>
  );
}
