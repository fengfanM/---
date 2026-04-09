import { useEffect, useMemo, useRef } from "react";
import * as PIXI from "pixi.js";
import { magicCircleUrl } from "../../lib/gameAssets";

export type GachaPhase = "idle" | "charging" | "burst" | "reveal";

function pickQuality(reducedMotion: boolean): {
  resolution: number;
  antialias: boolean;
  stars: number;
  particles: number;
  blur: boolean;
  fps: 30 | 60;
} {
  const nav = navigator as unknown as {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  const mem = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  const dpr = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));

  if (reducedMotion) {
    return {
      resolution: 1,
      antialias: false,
      stars: 70,
      particles: 110,
      blur: false,
      fps: 30,
    };
  }

  if (mem <= 4 || cores <= 4) {
    return {
      resolution: Math.min(1.25, dpr),
      antialias: false,
      stars: 90,
      particles: 140,
      blur: false,
      fps: 30,
    };
  }

  if (mem <= 8 || cores <= 8) {
    return {
      resolution: Math.min(1.5, dpr),
      antialias: false,
      stars: 120,
      particles: 180,
      blur: true,
      fps: 30,
    };
  }

  return {
    resolution: Math.min(2, dpr),
    antialias: true,
    stars: 150,
    particles: 240,
    blur: true,
    fps: 60,
  };
}

function colorForPhase(phase: GachaPhase): number {
  switch (phase) {
    case "charging":
      return 0xc9a227;
    case "burst":
      return 0xffd56b;
    case "reveal":
      return 0x6ec8ff;
    default:
      return 0x7a7a8c;
  }
}

export function GachaScenePixi({
  phase,
  reducedMotion,
}: {
  phase: GachaPhase;
  reducedMotion: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const refs = useRef<{
    rune: PIXI.Graphics | null;
    core: PIXI.Graphics | null;
    particles: PIXI.Container | null;
    sprites: PIXI.Sprite[];
    t: number;
  }>({ rune: null, core: null, particles: null, sprites: [], t: 0 });

  const bg = useMemo(() => {
    // 使用纯绘制，避免引入额外贴图依赖
    return { a: 0x120f2a, b: 0x070714 };
  }, []);

  useEffect(() => {
    if (!hostRef.current) return;

    const app = new PIXI.Application();
    appRef.current = app;

    let disposed = false;
    (async () => {
      const q = pickQuality(reducedMotion);
      await app.init({
        backgroundAlpha: 0,
        antialias: q.antialias,
        resolution: q.resolution,
        autoDensity: true,
        powerPreference: "high-performance",
        sharedTicker: true,
        resizeTo: hostRef.current!,
      });
      if (disposed) return;

      hostRef.current!.appendChild(app.canvas);

      const root = new PIXI.Container();
      app.stage.addChild(root);

      const bgG = new PIXI.Graphics();
      root.addChild(bgG);

      const stars = new PIXI.Container();
      root.addChild(stars);

      const rune = new PIXI.Graphics();
      root.addChild(rune);

      const core = new PIXI.Graphics();
      root.addChild(core);

      const circle = PIXI.Sprite.from(magicCircleUrl());
      circle.anchor.set(0.5);
      circle.alpha = 0.6;
      circle.blendMode = "add";
      root.addChild(circle);

      const glow = new PIXI.Graphics();
      glow.blendMode = "add";
      root.addChild(glow);

      const particles = new PIXI.Container();
      particles.blendMode = "add";
      root.addChild(particles);

      const seedRng = (seed: number) => {
        let a = seed >>> 0;
        return () => {
          a |= 0;
          a = (a + 0x6d2b79f5) | 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      };

      const r = seedRng(1337);
      const starSprites: { s: PIXI.Sprite; z: number; w: number; h: number }[] = [];
      for (let i = 0; i < q.stars; i++) {
        const s = PIXI.Sprite.from(PIXI.Texture.WHITE);
        s.anchor.set(0.5);
        const z = 0.35 + r() * 0.95;
        const size = 0.4 + r() * 1.6;
        s.scale.set(size);
        s.alpha = 0.12 + r() * 0.45;
        s.tint = i % 6 === 0 ? 0xb8e1ff : i % 9 === 0 ? 0xffe1b8 : 0xffffff;
        s.blendMode = "screen";
        stars.addChild(s);
        starSprites.push({ s, z, w: r(), h: r() });
      }

      const sprites: PIXI.Sprite[] = [];
      for (let i = 0; i < q.particles; i++) {
        const s = PIXI.Sprite.from(PIXI.Texture.WHITE);
        s.anchor.set(0.5);
        s.alpha = 0;
        s.scale.set(0.5);
        s.blendMode = "add";
        particles.addChild(s);
        sprites.push(s);
      }

      refs.current = { rune, core, particles, sprites, t: 0 };

      const draw = () => {
        const w = app.screen.width;
        const h = app.screen.height;
        const cx = w / 2;
        const cy = h / 2;

        bgG.clear()
          .rect(0, 0, w, h)
          .fill({ color: bg.b, alpha: 0.55 })
          .rect(0, 0, w, h)
          .fill({
            color: bg.a,
            alpha: 0.55,
          });

        rune.clear();
        core.clear();
        glow.clear();

        const phaseColor = colorForPhase(phase);
        const min = Math.min(w, h);
        const r0 = min * 0.38;
        const r1 = min * 0.19;
        const r2 = min * 0.62;

        const t = refs.current.t;
        const phaseK =
          phase === "idle" ? 0.15 : phase === "charging" ? 0.55 : phase === "burst" ? 1 : 0.35;

        for (const st of starSprites) {
          const sx = (st.w * w + (t * 0.04) / st.z) % (w + 40);
          const sy = (st.h * h + (t * 0.02) / st.z) % (h + 40);
          st.s.position.set(sx - 20, sy - 20);
          st.s.alpha =
            (0.06 + 0.28 * phaseK) *
            (0.55 + 0.45 * Math.sin(t * (0.008 + 0.012 / st.z) + st.w * 10));
        }

        const pulse = reducedMotion ? 1 : 0.94 + 0.06 * Math.sin(t * 0.02);
        const haloAlpha = 0.08 + 0.18 * phaseK;

        circle.position.set(cx, cy);
        const cs = (r2 * 2) / 1024;
        circle.scale.set(cs);
        circle.rotation = reducedMotion ? 0 : t * 0.003;
        circle.tint = phaseColor;
        circle.alpha = 0.18 + 0.42 * phaseK;

        glow.circle(cx, cy, r2).fill({ color: phaseColor, alpha: haloAlpha * 0.22 });
        glow.circle(cx, cy, r2 * 0.62).fill({ color: phaseColor, alpha: haloAlpha * 0.26 });
        glow.circle(cx, cy, r2 * 0.38).fill({ color: 0xffffff, alpha: haloAlpha * 0.06 });

        rune.circle(cx, cy, r0).stroke({ color: phaseColor, width: 3, alpha: 0.46 });
        rune.circle(cx, cy, r0 * 0.82).stroke({ color: phaseColor, width: 1, alpha: 0.22 });
        rune.circle(cx, cy, r0 * 0.58).stroke({ color: phaseColor, width: 2, alpha: 0.25 });

        const tickN = 32;
        for (let i = 0; i < tickN; i++) {
          const a = (i / tickN) * Math.PI * 2 + (reducedMotion ? 0 : t * 0.003);
          const x0 = cx + Math.cos(a) * (r0 * 0.92);
          const y0 = cy + Math.sin(a) * (r0 * 0.92);
          const x1 = cx + Math.cos(a) * (r0 * 1.02);
          const y1 = cy + Math.sin(a) * (r0 * 1.02);
          rune.moveTo(x0, y0).lineTo(x1, y1).stroke({ color: phaseColor, width: 2, alpha: 0.22 });
        }

        const coreAlpha = 0.55 + 0.45 * phaseK;
        core.circle(cx, cy, r1 * pulse).fill({ color: phaseColor, alpha: coreAlpha * 0.12 });
        core.circle(cx, cy, r1 * 0.78 * pulse).fill({ color: phaseColor, alpha: coreAlpha * 0.28 });
        core.circle(cx, cy, r1 * 0.42 * pulse).fill({ color: 0xffffff, alpha: coreAlpha * 0.10 });
        core.circle(cx, cy, r1 * 0.18 * pulse).fill({ color: 0xffffff, alpha: coreAlpha * 0.14 });

        rune.rotation = reducedMotion ? 0 : t * 0.006;

        const pAlphaBase =
          phase === "idle" ? 0.05 : phase === "charging" ? 0.16 : phase === "burst" ? 0.32 : 0.12;

        for (let i = 0; i < sprites.length; i++) {
          const s = sprites[i]!;
          const a = (i / sprites.length) * Math.PI * 2 + t * (reducedMotion ? 0 : 0.004);
          const rr =
            i < 160
              ? r0 * (0.62 + 0.26 * Math.sin(t * 0.0022 + i))
              : r0 * (0.9 + 0.18 * Math.sin(t * 0.0016 + i));
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr;
          s.position.set(x, y);
          s.rotation = a;
          const wave = 0.5 + 0.5 * Math.sin(t * (i < 160 ? 0.012 : 0.008) + i);
          s.alpha = (i < 160 ? pAlphaBase : pAlphaBase * 0.65) * wave;
          s.tint = i % 5 === 0 ? 0xffffff : phaseColor;
          const sc = 0.22 + (i < 160 ? 0.7 : 2.4) * wave;
          s.scale.set(sc * (i < 160 ? 0.55 : 0.22));
        }
      };

      core.filters =
        q.blur && !reducedMotion
          ? [new PIXI.BlurFilter({ strength: 4, quality: 1, kernelSize: 5 })]
          : [];
      glow.filters =
        q.blur && !reducedMotion
          ? [new PIXI.BlurFilter({ strength: 7, quality: 1, kernelSize: 7 })]
          : [];

      let acc = 0;
      app.ticker.add(() => {
        const delta = app.ticker.deltaMS || 16.67;
        acc += delta;
        if (q.fps === 30 && acc < 33) return;
        acc = 0;
        refs.current.t += 1;
        draw();
      });
    })();

    return () => {
      disposed = true;
      try {
        if (appRef.current) {
          const a = appRef.current;
          appRef.current = null;
          a.destroy({ removeView: true }, { children: true });
        }
      } catch {
        // ignore
      }
    };
  }, [bg.a, bg.b, phase, reducedMotion]);

  return <div ref={hostRef} style={{ width: "100%", height: "100%" }} />;
}
