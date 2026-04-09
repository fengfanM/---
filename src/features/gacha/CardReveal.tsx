import { motion, useAnimationControls, useMotionValue, useSpring } from "framer-motion";
import type { CardDef } from "../../types";
import { useEffect, useMemo, useRef, useState } from "react";
import { cardBackUrl, ensureAudio, playSfx, portraitUrlForId } from "../../lib/gameAssets";
import { useGameStore } from "../../store/gameStore";

function rarityGlow(rarity: string): string {
  if (rarity === "SSR") return "rgba(255, 213, 107, 0.85)";
  if (rarity === "SR") return "rgba(197, 107, 255, 0.75)";
  if (rarity === "R") return "rgba(107, 159, 255, 0.7)";
  return "rgba(122, 122, 140, 0.55)";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

function svgArtDataUrl(card: CardDef): string {
  const palette =
    card.rarity === "SSR"
      ? { indigo: "#121a2c", gold: "#ffd56b", vermilion: "#d0473f", paper: "#f6f0df" }
      : card.rarity === "SR"
        ? { indigo: "#121a2c", gold: "#d8b25d", vermilion: "#d0473f", paper: "#f6f0df" }
        : card.rarity === "R"
          ? { indigo: "#121a2c", gold: "#7dd4ff", vermilion: "#d0473f", paper: "#f6f0df" }
          : { indigo: "#121a2c", gold: "#a6a2c0", vermilion: "#d0473f", paper: "#f6f0df" };

  const seed = [...card.id].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const r = (n: number) => {
    const x = Math.sin((seed + n) * 999) * 10000;
    return x - Math.floor(x);
  };

  const glyph = card.element || "空";
  const k0 = card.keywords?.[0] ?? "天机";
  const k1 = card.keywords?.[1] ?? "启示";
  const n1 = (22 + r(4) * 60).toFixed(0);
  const n2 = (22 + r(5) * 60).toFixed(0);
  const n3 = (22 + r(6) * 60).toFixed(0);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1400" viewBox="0 0 900 1400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${palette.indigo}"/>
      <stop offset="0.65" stop-color="rgba(9,10,14,0.92)"/>
      <stop offset="1" stop-color="rgba(9,10,14,0.96)"/>
    </linearGradient>
    <radialGradient id="wash" cx="48%" cy="34%" r="78%">
      <stop offset="0" stop-color="${palette.paper}" stop-opacity="0.16"/>
      <stop offset="0.45" stop-color="${palette.gold}" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <pattern id="seigaiha" width="96" height="56" patternUnits="userSpaceOnUse">
      <path d="M0 56 C 16 28, 32 28, 48 56 C 64 84, 80 84, 96 56" fill="none" stroke="rgba(246,240,223,0.16)" stroke-width="2"/>
      <path d="M0 56 C 16 40, 32 40, 48 56 C 64 72, 80 72, 96 56" fill="none" stroke="rgba(246,240,223,0.10)" stroke-width="2"/>
      <path d="M-48 56 C -32 28, -16 28, 0 56 C 16 84, 32 84, 48 56" fill="none" stroke="rgba(246,240,223,0.14)" stroke-width="2"/>
      <path d="M48 56 C 64 28, 80 28, 96 56 C 112 84, 128 84, 144 56" fill="none" stroke="rgba(246,240,223,0.14)" stroke-width="2"/>
    </pattern>
    <filter id="ink" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <rect width="900" height="1400" fill="url(#bg)"/>
  <rect width="900" height="1400" fill="url(#wash)"/>

  <g opacity="0.85">
    <rect x="0" y="860" width="900" height="540" fill="url(#seigaiha)" opacity="0.62"/>
    <rect x="0" y="920" width="900" height="480" fill="url(#seigaiha)" opacity="0.42"/>
  </g>

  <g opacity="0.76" filter="url(#ink)">
    <circle cx="450" cy="520" r="250" fill="none" stroke="rgba(246,240,223,0.14)" stroke-width="3"/>
    <circle cx="450" cy="520" r="210" fill="none" stroke="rgba(246,240,223,0.10)" stroke-width="2" stroke-dasharray="${n1} ${n2}"/>
    <circle cx="450" cy="520" r="140" fill="none" stroke="rgba(208,71,63,0.12)" stroke-width="5" stroke-dasharray="${n2} ${n3}"/>
    <path d="M450 260 L475 332 L552 338 L492 387 L512 460 L450 418 L388 460 L408 387 L348 338 L425 332 Z"
      fill="${palette.gold}" fill-opacity="${card.rarity === "SSR" ? "0.10" : "0.06"}" stroke="${palette.gold}" stroke-opacity="${card.rarity === "SSR" ? "0.18" : "0.10"}"/>
  </g>

  <g opacity="0.95">
    <text x="450" y="588" text-anchor="middle" font-family="Noto Serif SC, serif" font-size="156" fill="rgba(246,240,223,0.92)">${glyph}</text>
    <text x="450" y="652" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="20" letter-spacing="8" fill="rgba(246,240,223,0.55)">${card.rarity}</text>
  </g>

  <g opacity="0.92">
    <text x="105" y="1190" text-anchor="start" font-family="Noto Serif SC, serif" font-size="42" fill="rgba(246,240,223,0.92)">${card.name}</text>
    <text x="105" y="1245" text-anchor="start" font-family="JetBrains Mono, monospace" font-size="18" letter-spacing="3" fill="rgba(246,240,223,0.55)">${k0} · ${k1}</text>
    <path d="M105 1268 L795 1268" stroke="rgba(246,240,223,0.14)" stroke-width="1"/>
    <rect x="760" y="1150" width="42" height="42" rx="12" fill="${palette.vermilion}" fill-opacity="0.65"/>
  </g>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function CardReveal({
  card,
  index,
  total,
  onNext,
  canSkip,
  onSkip,
  onSsr,
  onImpact,
}: {
  card: CardDef;
  index: number;
  total: number;
  onNext: () => void;
  canSkip: boolean;
  onSkip: () => void;
  onSsr?: () => void;
  onImpact?: (rarity: CardDef["rarity"]) => void;
}) {
  const glow = rarityGlow(card.rarity);
  const artUrl = useMemo(() => portraitUrlForId(card.id) ?? svgArtDataUrl(card), [card]);
  const backUrl = useMemo(() => cardBackUrl(card.rarity), [card.rarity]);
  const fallback = `radial-gradient(circle at 40% 30%, rgba(255,255,255,0.10), transparent 55%), radial-gradient(circle at 80% 80%, ${glow}, transparent 60%), linear-gradient(135deg, rgba(110,200,255,0.18), rgba(197,107,255,0.14))`;

  const controls = useAnimationControls();
  const [revealed, setRevealed] = useState(false);
  const [charging, setCharging] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const soundOn = useGameStore((s) => s.settings.soundOn);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const rub = useMotionValue(0);
  const rubSpring = useSpring(rub, { stiffness: 180, damping: 26, mass: 0.8 });
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const tiltXS = useSpring(tiltX, { stiffness: 180, damping: 22 });
  const tiltYS = useSpring(tiltY, { stiffness: 180, damping: 22 });

  const last = useRef<{ x: number; y: number } | null>(null);
  const down = useRef(false);

  useEffect(() => {
    setRevealed(false);
    setCharging(false);
    rub.set(0);
    tiltX.set(0);
    tiltY.set(0);
    void controls.set({ rotateY: 0, scale: 0.92, opacity: 0, y: 18 });
    void controls.start({
      rotateY: 0,
      scale: 1,
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
    });
  }, [card.id, controls, rub, tiltX, tiltY]);

  const reveal = async () => {
    if (revealed) return;
    setCharging(true);
    if (soundOn) void playSfx("seal", 0.65);
    await controls.start(
      reducedMotion
        ? { scale: 1.01, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }
        : {
            scale: [1, 1.015, 1.01],
            rotateZ: [0, -0.6, 0.4],
            transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
          }
    );

    setFlashKey((k) => k + 1);
    onImpact?.(card.rarity);

    const zoomScale = reducedMotion ? 1.02 : card.rarity === "SSR" ? 1.1 : 1.06;
    await controls.start({
      scale: zoomScale,
      y: reducedMotion ? 0 : -10,
      transition: reducedMotion
        ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
        : { type: "spring", stiffness: 140, damping: 14, mass: 0.9 },
    });

    if (!reducedMotion && card.rarity === "SSR") {
      await sleep(300);
    }

    setRevealed(true);
    if (soundOn) void playSfx("flip", 0.7);
    if (card.rarity === "SSR") onSsr?.();

    await controls.start({
      rotateY: 180,
      scale: reducedMotion ? 1 : card.rarity === "SSR" ? 1.08 : 1.05,
      y: reducedMotion ? 0 : -8,
      rotateZ: 0,
      transition: reducedMotion
        ? { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
        : { type: "spring", stiffness: 110, damping: 16, mass: 1 },
    });
    if (soundOn && card.rarity === "SSR") void playSfx("ssr", 0.85);
    setCharging(false);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    down.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    if (soundOn) void ensureAudio();
  };
  const onPointerUp = () => {
    down.current = false;
    last.current = null;
    tiltX.set(0);
    tiltY.set(0);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    tiltY.set((nx - 0.5) * 14);
    tiltX.set(-(ny - 0.5) * 14);

    if (!down.current || revealed) return;
    const p = last.current;
    if (!p) {
      last.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    last.current = { x: e.clientX, y: e.clientY };
    const dist = Math.sqrt(dx * dx + dy * dy);
    const next = Math.min(1, rub.get() + dist / 900);
    rub.set(next);
    if (next >= 1 && !revealed) {
      void reveal();
    }
  };

  return (
    <div className="reveal-shell">
      <motion.div
        className={`reveal-card ${revealed ? "revealed" : ""} ${charging ? "charging" : ""}`}
        animate={controls}
        style={{
          ["--glow" as never]: glow,
          ["--cardback" as never]: `url(${backUrl})`,
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerMove={onPointerMove}
        role="button"
        aria-label="触摸并擦拭封印，翻开卡牌"
        tabIndex={0}
      >
        <div key={flashKey} className="reveal-flash" aria-hidden />

        <motion.div
          className="reveal-aura"
          aria-hidden
          style={{
            opacity: rubSpring,
          }}
        />

        <div className="reveal-inkwash" aria-hidden />
        <div className="reveal-paperfall" aria-hidden>
          <span className="pf p1" />
          <span className="pf p2" />
          <span className="pf p3" />
          <span className="pf p4" />
        </div>

        <div className="reveal-face reveal-back">
          <div className="reveal-sigil">天机</div>
          <motion.div className="reveal-seal" style={{ ["--p" as never]: rubSpring }}>
            <div className="reveal-seal-core" />
            <div className="reveal-seal-tip">
              {revealed ? "封印已解" : "按住并擦拭封印"}
            </div>
          </motion.div>
          <div className="reveal-sub">{charging ? "灵光聚合…" : revealed ? "翻面展示" : "摸卡解封"}</div>
        </div>
        <div className="reveal-face reveal-front">
          <div
            className="reveal-art"
            style={{
              backgroundImage: `url(${artUrl}), ${fallback}`,
            }}
          >
            <div className="reveal-art-vignette" aria-hidden />
            <div className="reveal-art-foil" aria-hidden />
            <div className="reveal-art-grain" aria-hidden />
          </div>
          <div className="reveal-meta">
            <div className={`reveal-rarity ${card.rarity === "SSR" ? "rarity-ssr" : card.rarity === "SR" ? "rarity-sr" : card.rarity === "R" ? "rarity-r" : "rarity-n"}`}>
              {card.rarity}
            </div>
            <div className="reveal-name">{card.name}</div>
            <div className="reveal-kw">{card.keywords.join(" · ")}</div>
          </div>
        </div>

        <motion.div
          className="reveal-glare"
          aria-hidden
          style={{
            rotateX: tiltXS,
            rotateY: tiltYS,
          }}
        />

        {card.rarity === "SSR" && revealed && (
          <div className="ssr-burst" aria-hidden>
            <div className="ssr-flash" />
            <div className="ssr-lines" />
          </div>
        )}
      </motion.div>

      <div className="reveal-footer">
        <div className="reveal-step">
          第 {index + 1} / {total} 张
        </div>
        <div className="btn-row">
          {canSkip && (
            <button type="button" className="btn btn-ghost" onClick={onSkip}>
              跳过动画
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (!revealed) {
                void reveal();
                return;
              }
              onNext();
            }}
          >
            {!revealed ? "解封" : "下一张"}
          </button>
        </div>
      </div>
    </div>
  );
}
