export type RarityTier = "N" | "R" | "SR" | "SSR";

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const portraitMap = (() => {
  const mods = import.meta.glob("../assets/portraits/*.{png,jpg,jpeg,webp}", {
    eager: true,
    query: "?url",
    import: "default",
  }) as Record<string, string>;
  const map = new Map<string, string>();
  for (const [p, url] of Object.entries(mods)) {
    const base = p.split("/").pop() || "";
    const id = base.replace(/\.(png|jpe?g|webp)$/i, "");
    if (id) map.set(id, url);
  }
  return map;
})();

export function portraitUrlForId(id: string): string | null {
  try {
    const k = `wfg_portrait_${id}`;
    const v = localStorage.getItem(k);
    if (v && v.startsWith("data:image/")) return v;
  } catch {
    // ignore
  }
  return portraitMap.get(id) ?? null;
}

export function setPortraitOverride(id: string, dataUrl: string): void {
  const k = `wfg_portrait_${id}`;
  localStorage.setItem(k, dataUrl);
  window.dispatchEvent(new CustomEvent("wfg:portrait-changed", { detail: { id } }));
}

export function clearPortraitOverride(id: string): void {
  const k = `wfg_portrait_${id}`;
  localStorage.removeItem(k);
  window.dispatchEvent(new CustomEvent("wfg:portrait-changed", { detail: { id } }));
}

function paletteFor(rarity: RarityTier): { a: string; b: string; c: string; ink: string } {
  if (rarity === "SSR") return { a: "#FFD56B", b: "#FF6DA8", c: "#6FD4FF", ink: "#FFF3D1" };
  if (rarity === "SR") return { a: "#C56BFF", b: "#6EC8FF", c: "#FFD56B", ink: "#F0E7FF" };
  if (rarity === "R") return { a: "#6B9FFF", b: "#6EC8FF", c: "#9A96B0", ink: "#EAF1FF" };
  return { a: "#7A7A8C", b: "#A6A2C0", c: "#6EC8FF", ink: "#F2F0FF" };
}

export function cardBackUrl(rarity: RarityTier): string {
  const p = paletteFor(rarity);
  const indigo = "#111625";
  const sumi = "rgba(9,10,14,0.88)";
  const paper = "#f6f0df";
  const gold = p.a;
  const vermilion = "#d0473f";
  const waveInk = rarity === "SSR" ? "rgba(255,213,107,0.22)" : "rgba(17,22,37,0.28)";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1400" viewBox="0 0 900 1400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${indigo}"/>
      <stop offset="0.55" stop-color="${indigo}"/>
      <stop offset="1" stop-color="${sumi}"/>
    </linearGradient>
    <filter id="paperNoise" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 0.35 0" result="a"/>
      <feComposite in="a" in2="SourceGraphic" operator="over"/>
    </filter>
    <pattern id="seigaiha" width="96" height="56" patternUnits="userSpaceOnUse">
      <path d="M0 56 C 16 28, 32 28, 48 56 C 64 84, 80 84, 96 56" fill="none" stroke="${waveInk}" stroke-width="2"/>
      <path d="M0 56 C 16 40, 32 40, 48 56 C 64 72, 80 72, 96 56" fill="none" stroke="${waveInk}" stroke-width="2" opacity="0.55"/>
      <path d="M-48 56 C -32 28, -16 28, 0 56 C 16 84, 32 84, 48 56" fill="none" stroke="${waveInk}" stroke-width="2" opacity="0.85"/>
      <path d="M48 56 C 64 28, 80 28, 96 56 C 112 84, 128 84, 144 56" fill="none" stroke="${waveInk}" stroke-width="2" opacity="0.85"/>
    </pattern>
    <radialGradient id="halo" cx="50%" cy="38%" r="70%">
      <stop offset="0" stop-color="${gold}" stop-opacity="${rarity === "SSR" ? "0.30" : "0.18"}"/>
      <stop offset="0.5" stop-color="${p.c}" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${rarity === "SSR" ? "12" : "10"}" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="900" height="1400" fill="url(#bg)"/>
  <rect width="900" height="1400" fill="url(#halo)"/>

  <g opacity="0.9" filter="url(#paperNoise)">
    <path d="M90 190 C 210 135, 330 120, 450 138 C 590 160, 700 130, 810 165 L810 206 C 695 175, 585 208, 445 188 C 320 170, 215 190, 90 238 Z"
      fill="${paper}" fill-opacity="0.14"/>
  </g>

  <g opacity="0.88">
    <rect x="0" y="860" width="900" height="540" fill="url(#seigaiha)" opacity="0.75"/>
    <rect x="0" y="910" width="900" height="490" fill="url(#seigaiha)" opacity="0.55"/>
  </g>

  <g filter="url(#softGlow)" opacity="0.88">
    <circle cx="450" cy="560" r="320" fill="none" stroke="${p.ink}" stroke-opacity="0.10" stroke-width="2"/>
    <circle cx="450" cy="560" r="270" fill="none" stroke="${p.c}" stroke-opacity="0.12" stroke-width="2"/>
    <circle cx="450" cy="560" r="210" fill="none" stroke="${gold}" stroke-opacity="${rarity === "SSR" ? "0.22" : "0.14"}" stroke-width="3"/>
    <path d="M450 258 L480 340 L568 346 L498 402 L522 490 L450 438 L378 490 L402 402 L332 346 L420 340 Z"
      fill="${gold}" fill-opacity="${rarity === "SSR" ? "0.10" : "0.06"}" stroke="${gold}" stroke-opacity="${rarity === "SSR" ? "0.20" : "0.12"}"/>
  </g>

  <g opacity="0.92">
    <text x="450" y="640" text-anchor="middle" font-family="Noto Serif SC, serif" font-size="92" letter-spacing="18" fill="${p.ink}">天机</text>
    <text x="450" y="700" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="18" letter-spacing="10" fill="rgba(246,240,223,0.55)">${rarity}</text>
  </g>

  <g opacity="0.95">
    <rect x="86" y="110" width="52" height="52" rx="14" fill="${vermilion}" fill-opacity="0.65"/>
    <rect x="104" y="128" width="16" height="16" rx="5" fill="rgba(255,255,255,0.22)"/>
  </g>
</svg>`;
  return svgDataUrl(svg);
}

export function talismanUrl(): string {
  const paper = "#f6f0df";
  const ink = "rgba(9,10,14,0.78)";
  const vermilion = "#d0473f";
  const gold = "#d8b25d";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820" viewBox="0 0 600 820">
  <defs>
    <filter id="fiber" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="3" seed="13" result="n"/>
      <feColorMatrix in="n" type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 0.30 0" result="a"/>
      <feComposite in="a" in2="SourceGraphic" operator="over"/>
    </filter>
    <linearGradient id="paperG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${paper}" stop-opacity="0.90"/>
      <stop offset="1" stop-color="${paper}" stop-opacity="0.74"/>
    </linearGradient>
    <radialGradient id="wash" cx="45%" cy="30%" r="90%">
      <stop offset="0" stop-color="${gold}" stop-opacity="0.18"/>
      <stop offset="0.6" stop-color="${vermilion}" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="40" y="40" width="520" height="740" rx="52" fill="url(#paperG)" stroke="rgba(255,255,255,0.12)" filter="url(#fiber)"/>
  <rect x="40" y="40" width="520" height="740" rx="52" fill="url(#wash)" opacity="0.95"/>
  <rect x="74" y="74" width="452" height="672" rx="38" fill="none" stroke="rgba(0,0,0,0.16)" stroke-dasharray="14 14"/>
  <circle cx="470" cy="135" r="18" fill="${vermilion}" fill-opacity="0.72"/>
  <circle cx="470" cy="135" r="30" fill="${vermilion}" fill-opacity="0.14"/>
  <path d="M115 210 C 170 170, 250 160, 310 195 C 370 230, 455 220, 500 175" fill="none" stroke="rgba(0,0,0,0.10)" stroke-width="6" stroke-linecap="round"/>
  <text x="300" y="474" text-anchor="middle" font-family="Noto Serif SC, serif" font-size="240" fill="${ink}">召</text>
  <path d="M140 610 C 220 565, 380 565, 460 610" stroke="rgba(0,0,0,0.20)" stroke-width="3" fill="none"/>
  <path d="M140 660 C 220 705, 380 705, 460 660" stroke="rgba(0,0,0,0.18)" stroke-width="3" fill="none"/>
</svg>`;
  return svgDataUrl(svg);
}

export function magicCircleUrl(): string {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="v" cx="50%" cy="50%" r="62%">
      <stop offset="0" stop-color="rgba(246,240,223,0.14)"/>
      <stop offset="0.55" stop-color="rgba(216,178,93,0.10)"/>
      <stop offset="1" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <filter id="ink" x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="19" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="18" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>
  <rect width="1024" height="1024" fill="transparent"/>
  <circle cx="512" cy="512" r="420" fill="url(#v)"/>
  <g opacity="0.68" filter="url(#ink)">
    <circle cx="512" cy="512" r="420" fill="none" stroke="rgba(9,10,14,0.30)" stroke-width="10"/>
    <circle cx="512" cy="512" r="360" fill="none" stroke="rgba(9,10,14,0.22)" stroke-width="6" stroke-dasharray="30 16"/>
    <circle cx="512" cy="512" r="300" fill="none" stroke="rgba(208,71,63,0.16)" stroke-width="6" stroke-dasharray="140 70"/>
  </g>
  <g opacity="0.38" filter="url(#soft)">
    <path d="M512 140 m -372 0 a 372 372 0 1 0 744 0 a 372 372 0 1 0 -744 0"
      fill="none" stroke="rgba(255,231,180,0.18)" stroke-width="12" stroke-linecap="round" stroke-dasharray="180 90"/>
  </g>
  <g opacity="0.60">
    <path d="M512 120 L558 234 L680 238 L588 316 L620 436 L512 366 L404 436 L436 316 L344 238 L466 234 Z"
      fill="rgba(216,178,93,0.10)" stroke="rgba(216,178,93,0.14)"/>
  </g>
</svg>`;
  return svgDataUrl(svg);
}

export function cardFrontUrl(input: {
  id: string;
  name: string;
  rarity: RarityTier;
  element?: string;
  keywords?: string[];
}): string {
  const p = paletteFor(input.rarity);
  const indigo = "#121a2c";
  const paper = "#f6f0df";
  const vermilion = "#d0473f";
  const glyph = input.element || "空";
  const k0 = input.keywords?.[0] ?? "天机";
  const k1 = input.keywords?.[1] ?? "启示";
  const k0c = k0.slice(0, 1);
  const k1c = k1.slice(0, 1);
  const elem = input.element || "空";

  const seed = [...input.id].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const r = (n: number) => {
    const x = Math.sin((seed + n) * 999) * 10000;
    return x - Math.floor(x);
  };
  const n1 = (20 + r(1) * 60).toFixed(0);
  const n2 = (20 + r(2) * 60).toFixed(0);
  const n3 = (20 + r(3) * 60).toFixed(0);
  const elemTone =
    elem === "火"
      ? { a: "rgba(208,71,63,0.20)", b: "rgba(255,213,107,0.14)" }
      : elem === "水"
        ? { a: "rgba(125,212,255,0.18)", b: "rgba(246,240,223,0.10)" }
        : elem === "金"
          ? { a: "rgba(216,178,93,0.22)", b: "rgba(255,231,180,0.12)" }
          : elem === "木"
            ? { a: "rgba(246,240,223,0.14)", b: "rgba(216,178,93,0.12)" }
            : elem === "土"
              ? { a: "rgba(246,240,223,0.12)", b: "rgba(208,71,63,0.10)" }
              : { a: "rgba(246,240,223,0.12)", b: "rgba(125,212,255,0.10)" };
  const hair = r(4) > 0.5 ? "rgba(9,10,14,0.72)" : "rgba(9,10,14,0.62)";
  const robe = r(5) > 0.5 ? elemTone.a : elemTone.b;
  const robe2 = r(6) > 0.5 ? "rgba(9,10,14,0.30)" : "rgba(246,240,223,0.10)";
  const face = r(7) > 0.5 ? "rgba(246,240,223,0.22)" : "rgba(246,240,223,0.16)";
  const accInk = r(8) > 0.5 ? "rgba(9,10,14,0.42)" : "rgba(9,10,14,0.34)";
  const accGold = input.rarity === "SSR" ? "rgba(255,213,107,0.48)" : "rgba(216,178,93,0.22)";
  const accRed = "rgba(208,71,63,0.26)";
  const accBlue = "rgba(125,212,255,0.22)";
  const accScale = input.rarity === "SSR" ? 1 : input.rarity === "SR" ? 0.95 : 0.9;
  const accRot = ((r(9) - 0.5) * (input.rarity === "SSR" ? 16 : 10)).toFixed(2);
  const flowerAlpha = input.rarity === "SSR" ? 0.22 : input.rarity === "SR" ? 0.16 : 0.12;
  const foilAlpha = input.rarity === "SSR" ? 0.26 : input.rarity === "SR" ? 0.16 : 0.10;

  const goldSpecks = (() => {
    if (input.rarity !== "SSR") return "";
    const dots: string[] = [];
    for (let i = 0; i < 30; i++) {
      const x = 70 + r(40 + i) * 580;
      const y = 160 + r(120 + i) * 720;
      const rr = 1.2 + r(200 + i) * 2.8;
      const op = 0.06 + r(260 + i) * 0.14;
      dots.push(
        `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${rr.toFixed(2)}" fill="rgba(255,213,107,${op.toFixed(3)})"/>`
      );
    }
    return `<g opacity="0.95" filter="url(#softGlow)">${dots.join("")}</g>`;
  })();

  const accessory = (() => {
    const base = (inner: string) =>
      `<g opacity="0.92" filter="url(#ink)" transform="translate(0 0) rotate(${accRot} 360 610) scale(${accScale})">${inner}</g>`;

    if (elem === "火") {
      const flames = `
        <path d="M520 560 C 560 520, 590 540, 600 575 C 612 618, 585 640, 552 652 C 525 662, 506 644, 508 622 C 510 598, 532 590, 520 560 Z"
          fill="${accRed}"/>
        <path d="M210 560 C 170 520, 140 540, 130 575 C 118 618, 145 640, 178 652 C 205 662, 224 644, 222 622 C 220 598, 198 590, 210 560 Z"
          fill="${accRed}"/>
        <circle cx="360" cy="520" r="90" fill="${accGold}" opacity="0.38"/>
      `;
      return base(flames);
    }

    if (elem === "水") {
      const umbrella = `
        <path d="M360 455 C 265 468, 210 520, 190 555 C 252 520, 310 507, 360 507 C 410 507, 468 520, 530 555 C 510 520, 455 468, 360 455 Z"
          fill="${accBlue}"/>
        <path d="M360 507 L360 695" stroke="${accInk}" stroke-width="10" stroke-linecap="round"/>
        <path d="M360 695 C 360 735, 392 742, 408 728" fill="none" stroke="${accInk}" stroke-width="8" stroke-linecap="round"/>
      `;
      return base(umbrella);
    }

    if (elem === "金") {
      const sword = `
        <path d="M520 740 L540 760 L365 585 L345 565 Z" fill="${accInk}"/>
        <path d="M540 760 L562 782" stroke="${accGold}" stroke-width="10" stroke-linecap="round"/>
        <path d="M345 565 L310 530" stroke="${accGold}" stroke-width="12" stroke-linecap="round"/>
        <path d="M330 540 L290 560" stroke="${accRed}" stroke-width="8" stroke-linecap="round" opacity="0.6"/>
      `;
      return base(sword);
    }

    if (elem === "木") {
      const talisman = `
        <rect x="516" y="520" width="92" height="132" rx="24" fill="rgba(246,240,223,0.14)" stroke="rgba(246,240,223,0.16)"/>
        <path d="M540 560 C 565 545, 585 545, 604 562" fill="none" stroke="${accInk}" stroke-width="8" stroke-linecap="round"/>
        <path d="M540 604 C 565 589, 585 589, 604 606" fill="none" stroke="${accInk}" stroke-width="8" stroke-linecap="round"/>
        <circle cx="556" cy="542" r="10" fill="${accRed}"/>
        <path d="M224 676 C 250 648, 282 640, 310 660 C 340 680, 330 712, 300 728 C 268 746, 238 738, 224 716 C 212 697, 212 690, 224 676 Z"
          fill="${accGold}" opacity="0.25"/>
      `;
      return base(talisman);
    }

    if (elem === "土") {
      const beads = `
        <path d="M250 688 C 290 664, 330 660, 360 670 C 392 660, 432 664, 470 688" fill="none" stroke="${accInk}" stroke-width="10" stroke-linecap="round"/>
        <circle cx="284" cy="676" r="12" fill="${accGold}"/>
        <circle cx="320" cy="666" r="10" fill="${accGold}" opacity="0.75"/>
        <circle cx="360" cy="662" r="14" fill="${accRed}" opacity="0.75"/>
        <circle cx="400" cy="666" r="10" fill="${accGold}" opacity="0.75"/>
        <circle cx="436" cy="676" r="12" fill="${accGold}"/>
      `;
      return base(beads);
    }

    const maskFoxfire = `
      <path d="M310 546 C 330 524, 346 516, 360 516 C 374 516, 390 524, 410 546 C 398 580, 382 594, 360 598 C 338 594, 322 580, 310 546 Z"
        fill="rgba(246,240,223,0.16)" stroke="rgba(246,240,223,0.16)"/>
      <path d="M334 556 C 344 548, 352 546, 360 546 C 368 546, 376 548, 386 556" fill="none" stroke="${accInk}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="560" cy="552" r="20" fill="${accGold}" opacity="0.22"/>
      <circle cx="585" cy="586" r="14" fill="${accBlue}" opacity="0.20"/>
      <circle cx="520" cy="590" r="12" fill="${accRed}" opacity="0.18"/>
    `;
    return base(maskFoxfire);
  })();

  const florals = (() => {
    const base = (inner: string) =>
      `<g opacity="${flowerAlpha}" filter="url(#ink)" transform="translate(0 0) rotate(${((r(10) - 0.5) * 10).toFixed(2)} 360 520)">${inner}</g>`;

    if (elem === "水") {
      const waves = `
        <path d="M90 740 C 170 700, 250 700, 330 740 C 410 780, 490 780, 630 720" fill="none" stroke="rgba(125,212,255,0.28)" stroke-width="10" stroke-linecap="round"/>
        <path d="M110 790 C 190 760, 270 760, 350 790 C 430 820, 510 820, 650 770" fill="none" stroke="rgba(246,240,223,0.22)" stroke-width="8" stroke-linecap="round"/>
      `;
      return base(waves);
    }

    if (elem === "火") {
      const maple = `
        <path d="M560 706 C 580 694, 594 676, 592 656 C 574 664, 560 680, 552 700 C 540 682, 526 666, 508 658 C 506 680, 520 700, 542 710 C 522 720, 510 740, 516 762 C 534 752, 546 734, 552 714 C 562 734, 578 750, 598 756 C 604 736, 592 720, 574 712 C 590 708, 604 698, 612 686 C 594 686, 576 694, 560 706 Z"
          fill="rgba(208,71,63,0.28)"/>
        <path d="M150 726 C 168 714, 182 696, 180 678 C 164 686, 150 702, 144 720 C 134 704, 120 690, 104 686 C 102 706, 114 724, 134 734 C 116 744, 104 762, 108 782 C 124 774, 136 758, 142 740 C 150 758, 164 772, 182 776 C 186 758, 176 744, 160 738 C 174 734, 186 724, 192 712 C 176 712, 162 718, 150 726 Z"
          fill="rgba(255,213,107,0.20)"/>
      `;
      return base(maple);
    }

    if (elem === "金") {
      const peony = `
        <circle cx="570" cy="710" r="34" fill="rgba(255,231,180,0.20)"/>
        <circle cx="570" cy="710" r="24" fill="rgba(216,178,93,0.18)"/>
        <circle cx="570" cy="710" r="14" fill="rgba(208,71,63,0.14)"/>
        <circle cx="150" cy="740" r="30" fill="rgba(246,240,223,0.18)"/>
        <circle cx="150" cy="740" r="20" fill="rgba(216,178,93,0.16)"/>
        <circle cx="150" cy="740" r="12" fill="rgba(208,71,63,0.12)"/>
      `;
      return base(peony);
    }

    if (elem === "木") {
      const sakura = `
        <path d="M560 720 C 552 690, 578 676, 596 692 C 612 676, 640 690, 632 720 C 662 728, 646 754, 624 752 C 626 774, 600 790, 588 770 C 576 790, 550 774, 552 752 C 530 754, 514 728, 544 720 C 520 702, 542 678, 560 694 C 570 678, 590 678, 596 692 C 582 692, 572 704, 560 720 Z"
          fill="rgba(246,240,223,0.22)"/>
        <circle cx="592" cy="722" r="10" fill="rgba(208,71,63,0.18)"/>
        <path d="M150 760 C 142 734, 166 720, 184 734 C 200 720, 224 734, 216 760 C 242 768, 228 790, 210 788 C 212 808, 190 822, 180 804 C 170 822, 148 808, 150 788 C 132 790, 118 768, 144 760 C 124 744, 142 726, 156 736 C 164 726, 178 726, 184 734 C 174 734, 166 744, 150 760 Z"
          fill="rgba(216,178,93,0.18)"/>
      `;
      return base(sakura);
    }

    const blossom = `
      <circle cx="560" cy="720" r="34" fill="rgba(255,231,180,0.14)"/>
      <circle cx="560" cy="720" r="22" fill="rgba(216,178,93,0.12)"/>
      <circle cx="150" cy="740" r="30" fill="rgba(246,240,223,0.12)"/>
    `;
    return base(blossom);
  })();

  const floralPattern = (() => {
    const patOpacity =
      input.rarity === "SSR" ? 0.14 : input.rarity === "SR" ? 0.10 : input.rarity === "R" ? 0.08 : 0.06;

    const fill =
      elem === "水"
        ? `rgba(125,212,255,0.18)`
        : elem === "火"
          ? `rgba(208,71,63,0.18)`
          : elem === "金"
            ? `rgba(255,231,180,0.18)`
            : elem === "木"
              ? `rgba(246,240,223,0.16)`
              : elem === "土"
                ? `rgba(216,178,93,0.14)`
                : `rgba(246,240,223,0.14)`;

    const patternId =
      elem === "水"
        ? "patWave"
        : elem === "火"
          ? "patMaple"
          : elem === "金"
            ? "patPeony"
            : elem === "木"
              ? "patSakura"
              : elem === "土"
                ? "patAsanoha"
                : "patSakura";

    return {
      defs: `
        <pattern id="patWave" width="120" height="70" patternUnits="userSpaceOnUse">
          <path d="M0 70 C 20 35, 40 35, 60 70 C 80 105, 100 105, 120 70" fill="none" stroke="${fill}" stroke-width="4" opacity="0.9"/>
          <path d="M-60 70 C -40 35, -20 35, 0 70 C 20 105, 40 105, 60 70" fill="none" stroke="${fill}" stroke-width="4" opacity="0.75"/>
          <path d="M60 70 C 80 35, 100 35, 120 70 C 140 105, 160 105, 180 70" fill="none" stroke="${fill}" stroke-width="4" opacity="0.75"/>
        </pattern>
        <pattern id="patSakura" width="150" height="150" patternUnits="userSpaceOnUse">
          <path d="M75 35 C 66 60, 50 66, 35 60 C 42 78, 36 96, 22 108 C 45 106, 62 114, 75 130 C 88 114, 105 106, 128 108 C 114 96, 108 78, 115 60 C 100 66, 84 60, 75 35 Z"
            fill="${fill}" opacity="0.7"/>
          <circle cx="75" cy="86" r="10" fill="rgba(208,71,63,0.10)"/>
        </pattern>
        <pattern id="patPeony" width="160" height="160" patternUnits="userSpaceOnUse">
          <circle cx="80" cy="80" r="36" fill="${fill}" opacity="0.55"/>
          <circle cx="80" cy="80" r="24" fill="rgba(216,178,93,0.14)" opacity="0.55"/>
          <circle cx="80" cy="80" r="14" fill="rgba(208,71,63,0.10)" opacity="0.55"/>
        </pattern>
        <pattern id="patMaple" width="170" height="170" patternUnits="userSpaceOnUse">
          <path d="M85 44 C 97 38, 105 28, 104 16 C 92 20, 84 30, 80 42 C 74 32, 66 22, 54 18 C 52 30, 58 42, 70 48 C 60 54, 54 66, 56 80 C 66 74, 72 64, 76 54 C 82 64, 92 72, 104 74 C 106 62, 100 54, 90 50 C 100 48, 110 42, 116 34 C 104 34, 94 38, 85 44 Z"
            fill="${fill}" opacity="0.62"/>
        </pattern>
        <pattern id="patAsanoha" width="160" height="160" patternUnits="userSpaceOnUse">
          <path d="M80 12 L110 64 L80 116 L50 64 Z" fill="none" stroke="${fill}" stroke-width="4" opacity="0.85"/>
          <path d="M80 116 L110 64 L160 64" fill="none" stroke="${fill}" stroke-width="4" opacity="0.45"/>
          <path d="M80 116 L50 64 L0 64" fill="none" stroke="${fill}" stroke-width="4" opacity="0.45"/>
          <path d="M80 12 L110 64 L80 64 Z" fill="${fill}" opacity="0.08"/>
        </pattern>
      `,
      layer: `<g opacity="${patOpacity}" filter="url(#ink)">
        <rect x="-40" y="320" width="800" height="520" fill="url(#${patternId})" />
      </g>`,
    };
  })();

  const foil =
    input.rarity === "N"
      ? ""
      : `<g opacity="${foilAlpha}" filter="url(#softGlow)">
          <path d="M-120 520 C 40 440, 160 460, 320 520 C 460 572, 560 592, 880 500"
            fill="none" stroke="rgba(255,255,255,0.20)" stroke-width="18" stroke-linecap="round"/>
          <path d="M-140 560 C 40 500, 180 520, 320 570 C 460 622, 580 642, 900 560"
            fill="none" stroke="rgba(255,231,180,0.16)" stroke-width="14" stroke-linecap="round"/>
          <path d="M-100 610 C 60 560, 200 580, 340 628 C 470 670, 590 690, 860 630"
            fill="none" stroke="rgba(208,71,63,0.10)" stroke-width="10" stroke-linecap="round"/>
        </g>`;

  const figure = (() => {
    const base = (inner: string) => `<g opacity="0.92" filter="url(#ink)">${inner}</g>`;

    const head = `
      <path d="M330 548 C 340 530, 350 520, 360 520 C 370 520, 380 530, 390 548 C 380 566, 372 578, 360 584 C 348 578, 340 566, 330 548 Z"
        fill="${face}"/>
      <path d="M312 548 C 322 500, 342 474, 360 474 C 378 474, 398 500, 408 548 C 404 566, 392 580, 360 592 C 328 580, 316 566, 312 548 Z"
        fill="${hair}"/>
    `;

    if (elem === "水") {
      return base(`
        <path d="M208 620 C 254 545, 305 520, 360 520 C 420 520, 470 548, 512 622 C 478 674, 434 712, 360 724 C 288 712, 242 674, 208 620 Z"
          fill="${robe}"/>
        <path d="M248 620 C 292 586, 322 572, 360 572 C 400 572, 432 586, 472 620 C 440 652, 410 670, 360 680 C 312 670, 282 652, 248 620 Z"
          fill="${robe2}"/>
        <path d="M420 574 C 452 548, 478 534, 510 526 C 490 562, 464 594, 432 616 Z"
          fill="${accInk}"/>
        ${head}
      `);
    }

    if (elem === "金") {
      return base(`
        <path d="M224 610 C 270 540, 312 520, 360 520 C 410 520, 454 542, 498 610 C 468 668, 426 706, 360 716 C 294 706, 252 668, 224 610 Z"
          fill="${robe}"/>
        <path d="M254 610 C 296 578, 324 566, 360 566 C 398 566, 430 578, 468 610 C 440 640, 408 660, 360 670 C 312 660, 282 640, 254 610 Z"
          fill="${robe2}"/>
        <path d="M392 580 C 430 560, 464 544, 506 520 C 486 564, 454 606, 410 632 Z"
          fill="${accInk}"/>
        ${head}
      `);
    }

    if (elem === "木") {
      return base(`
        <path d="M216 615 C 262 542, 308 520, 360 520 C 412 520, 460 544, 506 615 C 474 672, 430 708, 360 718 C 292 708, 248 672, 216 615 Z"
          fill="${robe}"/>
        <path d="M260 612 C 300 582, 326 572, 360 572 C 396 572, 424 582, 458 612 C 430 642, 402 662, 360 672 C 318 662, 290 642, 260 612 Z"
          fill="${robe2}"/>
        <path d="M312 604 C 336 586, 350 578, 360 578 C 370 578, 384 586, 408 604 C 392 624, 378 634, 360 638 C 342 634, 328 624, 312 604 Z"
          fill="${accInk}"/>
        ${head}
      `);
    }

    if (elem === "土") {
      return base(`
        <path d="M206 632 C 248 558, 300 528, 360 528 C 424 528, 476 560, 514 632 C 480 690, 434 726, 360 736 C 290 726, 240 690, 206 632 Z"
          fill="${robe}"/>
        <path d="M242 632 C 286 596, 318 582, 360 582 C 404 582, 436 596, 478 632 C 446 662, 412 684, 360 694 C 310 684, 276 662, 242 632 Z"
          fill="${robe2}"/>
        <path d="M246 742 C 290 768, 332 780, 360 782 C 392 780, 436 768, 474 742" fill="none" stroke="${accInk}" stroke-width="10" stroke-linecap="round"/>
        ${head}
      `);
    }

    if (elem === "火") {
      return base(`
        <path d="M212 610 C 254 538, 302 516, 360 516 C 420 516, 470 542, 510 612 C 480 670, 436 708, 360 720 C 288 708, 244 670, 212 610 Z"
          fill="${robe}"/>
        <path d="M246 610 C 292 572, 322 558, 360 558 C 400 558, 434 572, 474 610 C 444 644, 410 664, 360 676 C 312 664, 278 644, 246 610 Z"
          fill="${robe2}"/>
        <path d="M238 596 C 210 582, 186 570, 166 546 C 188 600, 214 636, 252 660 Z"
          fill="${accInk}"/>
        <path d="M482 596 C 510 582, 534 570, 554 546 C 532 600, 506 636, 468 660 Z"
          fill="${accInk}"/>
        ${head}
      `);
    }

    return base(`
      <path d="M220 610 C 260 540, 300 520, 360 520 C 420 520, 460 540, 500 610 C 470 660, 430 700, 360 712 C 290 700, 250 660, 220 610 Z"
        fill="${robe}"/>
      <path d="M250 610 C 290 575, 320 562, 360 562 C 400 562, 430 575, 470 610 C 440 640, 410 660, 360 672 C 310 660, 280 640, 250 610 Z"
        fill="${robe2}"/>
      ${head}
    `);
  })();

  const embroidery =
    input.rarity === "SSR"
      ? `<g opacity="0.76" filter="url(#softGlow)">
          <path d="M240 626 C 286 592, 324 576, 360 576 C 398 576, 434 592, 480 626" fill="none" stroke="rgba(255,213,107,0.24)" stroke-width="10" stroke-linecap="round"/>
          <path d="M232 642 C 286 706, 330 732, 360 736 C 394 732, 440 706, 492 642" fill="none" stroke="rgba(255,213,107,0.16)" stroke-width="8" stroke-linecap="round"/>
          <path d="M300 610 C 324 598, 344 594, 360 594 C 376 594, 396 598, 420 610" fill="none" stroke="rgba(255,231,180,0.14)" stroke-width="6" stroke-linecap="round"/>
        </g>`
      : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1040" viewBox="0 0 720 1040">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${indigo}"/>
      <stop offset="0.7" stop-color="rgba(9,10,14,0.92)"/>
      <stop offset="1" stop-color="rgba(9,10,14,0.96)"/>
    </linearGradient>
    <radialGradient id="wash" cx="48%" cy="30%" r="82%">
      <stop offset="0" stop-color="${paper}" stop-opacity="0.16"/>
      <stop offset="0.52" stop-color="${p.a}" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <pattern id="seigaiha" width="80" height="46" patternUnits="userSpaceOnUse">
      <path d="M0 46 C 14 23, 26 23, 40 46 C 54 69, 66 69, 80 46" fill="none" stroke="rgba(246,240,223,0.14)" stroke-width="2"/>
      <path d="M-40 46 C -26 23, -14 23, 0 46 C 14 69, 26 69, 40 46" fill="none" stroke="rgba(246,240,223,0.12)" stroke-width="2"/>
      <path d="M40 46 C 54 23, 66 23, 80 46 C 94 69, 106 69, 120 46" fill="none" stroke="rgba(246,240,223,0.12)" stroke-width="2"/>
    </pattern>
    <filter id="ink" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    ${floralPattern.defs}
  </defs>
  <rect width="720" height="1040" fill="url(#bg)"/>
  <rect width="720" height="1040" fill="url(#wash)"/>
  <g opacity="0.78">
    <rect x="0" y="640" width="720" height="400" fill="url(#seigaiha)" opacity="0.62"/>
    <rect x="0" y="690" width="720" height="350" fill="url(#seigaiha)" opacity="0.42"/>
  </g>
  <g opacity="0.74" filter="url(#ink)">
    <circle cx="360" cy="410" r="190" fill="none" stroke="rgba(246,240,223,0.14)" stroke-width="3"/>
    <circle cx="360" cy="410" r="160" fill="none" stroke="rgba(246,240,223,0.10)" stroke-width="2" stroke-dasharray="${n1} ${n2}"/>
    <circle cx="360" cy="410" r="110" fill="none" stroke="rgba(208,71,63,0.12)" stroke-width="5" stroke-dasharray="${n2} ${n3}"/>
  </g>

  ${florals}
  ${floralPattern.layer}
  ${foil}
  ${goldSpecks}

  ${accessory}

  ${figure}
  ${embroidery}
  <g opacity="0.96">
    <text x="360" y="460" text-anchor="middle" font-family="Noto Serif SC, serif" font-size="126" fill="rgba(246,240,223,0.92)">${glyph}</text>
    <text x="360" y="518" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="18" letter-spacing="8" fill="rgba(246,240,223,0.55)">${input.rarity}</text>
  </g>
  <g opacity="0.92">

  <g opacity="0.92" filter="url(#softGlow)">
    <rect x="78" y="790" width="62" height="62" rx="18" fill="${vermilion}" fill-opacity="0.68"/>
    <text x="109" y="833" text-anchor="middle" font-family="Noto Serif SC, serif" font-size="26" fill="rgba(246,240,223,0.92)">${k0c}</text>
    <rect x="150" y="790" width="62" height="62" rx="18" fill="${vermilion}" fill-opacity="0.48"/>
    <text x="181" y="833" text-anchor="middle" font-family="Noto Serif SC, serif" font-size="26" fill="rgba(246,240,223,0.88)">${k1c}</text>
  </g>
    <text x="72" y="900" text-anchor="start" font-family="Noto Serif SC, serif" font-size="34" fill="rgba(246,240,223,0.92)">${input.name}</text>
    <text x="72" y="942" text-anchor="start" font-family="JetBrains Mono, monospace" font-size="16" letter-spacing="2.5" fill="rgba(246,240,223,0.55)">${k0} · ${k1}</text>
    <path d="M72 962 L648 962" stroke="rgba(246,240,223,0.14)" stroke-width="1"/>
    <rect x="612" y="862" width="38" height="38" rx="12" fill="${vermilion}" fill-opacity="0.65"/>
  </g>
</svg>`;

  return svgDataUrl(svg);
}

type SfxName = "tap" | "seal" | "flip" | "ssr" | "success" | "click" | "reward" | "warning" | "achievement" | "card" | "levelup" | "purchase" | "complete" | "error" | "navigate" | "dropdown" | "popup" | "shine" | "draw" | "collect" | "equip" | "unequip" | "trade" | "gift" | "daily" | "weekly" | "checkin";

let ctx: AudioContext | null = null;

export async function ensureAudio(): Promise<void> {
  if (ctx) return;
  const AC = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
    .AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
}

function env(g: GainNode, t0: number, a: number, d: number, s: number, r: number, peak = 1) {
  g.gain.cancelScheduledValues(t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, s), t0 + a + d);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d + r);
}

export async function playSfx(name: SfxName, volume = 0.7): Promise<void> {
  await ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.001;
  const out = ctx.createGain();
  out.gain.value = Math.max(0.0001, Math.min(1, volume));
  out.connect(ctx.destination);

  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 1400;
  f.Q.value = 0.9;

  o.connect(f);
  f.connect(g);
  g.connect(out);

  if (name === "tap") {
    o.type = "triangle";
    o.frequency.setValueAtTime(520, t0);
    o.frequency.exponentialRampToValueAtTime(260, t0 + 0.08);
    env(g, t0, 0.002, 0.02, 0.12, 0.08, 0.9);
    o.start(t0);
    o.stop(t0 + 0.13);
    return;
  }

  if (name === "seal") {
    o.type = "sawtooth";
    o.frequency.setValueAtTime(220, t0);
    o.frequency.exponentialRampToValueAtTime(520, t0 + 0.18);
    f.frequency.setValueAtTime(600, t0);
    f.frequency.exponentialRampToValueAtTime(2200, t0 + 0.18);
    env(g, t0, 0.01, 0.09, 0.18, 0.22, 0.9);
    o.start(t0);
    o.stop(t0 + 0.34);
    return;
  }

  if (name === "flip") {
    o.type = "square";
    o.frequency.setValueAtTime(180, t0);
    o.frequency.exponentialRampToValueAtTime(920, t0 + 0.06);
    f.frequency.setValueAtTime(900, t0);
    f.frequency.exponentialRampToValueAtTime(2400, t0 + 0.08);
    env(g, t0, 0.002, 0.02, 0.10, 0.12, 0.7);
    o.start(t0);
    o.stop(t0 + 0.18);
    return;
  }

  if (name === "success") {
    o.type = "sine";
    o.frequency.setValueAtTime(520, t0);
    o.frequency.setValueAtTime(660, t0 + 0.08);
    o.frequency.setValueAtTime(780, t0 + 0.16);
    f.frequency.setValueAtTime(1800, t0);
    env(g, t0, 0.005, 0.1, 0.3, 0.2, 0.85);
    o.start(t0);
    o.stop(t0 + 0.35);
    return;
  }

  if (name === "click") {
    o.type = "triangle";
    o.frequency.setValueAtTime(680, t0);
    o.frequency.exponentialRampToValueAtTime(340, t0 + 0.05);
    f.frequency.setValueAtTime(2000, t0);
    env(g, t0, 0.001, 0.015, 0.05, 0.05, 0.55);
    o.start(t0);
    o.stop(t0 + 0.1);
    return;
  }

  if (name === "reward") {
    o.type = "sine";
    o.frequency.setValueAtTime(440, t0);
    o.frequency.setValueAtTime(550, t0 + 0.06);
    o.frequency.setValueAtTime(660, t0 + 0.12);
    o.frequency.setValueAtTime(880, t0 + 0.18);
    f.frequency.setValueAtTime(2200, t0);
    env(g, t0, 0.005, 0.08, 0.25, 0.3, 0.9);
    o.start(t0);
    o.stop(t0 + 0.45);
    return;
  }

  if (name === "warning") {
    o.type = "square";
    o.frequency.setValueAtTime(300, t0);
    o.frequency.setValueAtTime(200, t0 + 0.1);
    f.frequency.setValueAtTime(800, t0);
    env(g, t0, 0.01, 0.08, 0.15, 0.2, 0.65);
    o.start(t0);
    o.stop(t0 + 0.3);
    return;
  }

  if (name === "achievement") {
    o.type = "triangle";
    o.frequency.setValueAtTime(440, t0);
    o.frequency.setValueAtTime(550, t0 + 0.05);
    o.frequency.setValueAtTime(660, t0 + 0.1);
    o.frequency.setValueAtTime(880, t0 + 0.15);
    o.frequency.setValueAtTime(1100, t0 + 0.2);
    f.frequency.setValueAtTime(2800, t0);
    env(g, t0, 0.008, 0.12, 0.35, 0.35, 0.95);
    o.start(t0);
    o.stop(t0 + 0.55);
    return;
  }

  if (name === "card") {
    o.type = "sine";
    o.frequency.setValueAtTime(330, t0);
    o.frequency.exponentialRampToValueAtTime(660, t0 + 0.08);
    f.frequency.setValueAtTime(1600, t0);
    env(g, t0, 0.003, 0.04, 0.08, 0.08, 0.7);
    o.start(t0);
    o.stop(t0 + 0.15);
    return;
  }

  if (name === "levelup") {
    o.type = "sine";
    o.frequency.setValueAtTime(440, t0);
    o.frequency.setValueAtTime(550, t0 + 0.08);
    o.frequency.setValueAtTime(660, t0 + 0.16);
    o.frequency.setValueAtTime(880, t0 + 0.24);
    f.frequency.setValueAtTime(2400, t0);
    env(g, t0, 0.006, 0.1, 0.3, 0.3, 0.85);
    o.start(t0);
    o.stop(t0 + 0.45);
    return;
  }

  if (name === "purchase") {
    o.type = "triangle";
    o.frequency.setValueAtTime(520, t0);
    o.frequency.setValueAtTime(660, t0 + 0.06);
    o.frequency.setValueAtTime(780, t0 + 0.12);
    f.frequency.setValueAtTime(2000, t0);
    env(g, t0, 0.004, 0.06, 0.2, 0.25, 0.8);
    o.start(t0);
    o.stop(t0 + 0.35);
    return;
  }

  if (name === "complete") {
    o.type = "sine";
    o.frequency.setValueAtTime(392, t0);
    o.frequency.setValueAtTime(494, t0 + 0.1);
    o.frequency.setValueAtTime(587, t0 + 0.2);
    f.frequency.setValueAtTime(1800, t0);
    env(g, t0, 0.005, 0.08, 0.25, 0.3, 0.8);
    o.start(t0);
    o.stop(t0 + 0.4);
    return;
  }

  if (name === "error") {
    o.type = "square";
    o.frequency.setValueAtTime(180, t0);
    o.frequency.setValueAtTime(140, t0 + 0.1);
    f.frequency.setValueAtTime(600, t0);
    env(g, t0, 0.01, 0.06, 0.1, 0.15, 0.6);
    o.start(t0);
    o.stop(t0 + 0.25);
    return;
  }

  if (name === "navigate") {
    o.type = "triangle";
    o.frequency.setValueAtTime(480, t0);
    o.frequency.exponentialRampToValueAtTime(640, t0 + 0.05);
    f.frequency.setValueAtTime(1800, t0);
    env(g, t0, 0.002, 0.02, 0.06, 0.06, 0.5);
    o.start(t0);
    o.stop(t0 + 0.1);
    return;
  }

  if (name === "dropdown") {
    o.type = "sine";
    o.frequency.setValueAtTime(320, t0);
    o.frequency.exponentialRampToValueAtTime(240, t0 + 0.06);
    f.frequency.setValueAtTime(1200, t0);
    env(g, t0, 0.002, 0.03, 0.08, 0.08, 0.55);
    o.start(t0);
    o.stop(t0 + 0.12);
    return;
  }

  if (name === "popup") {
    o.type = "triangle";
    o.frequency.setValueAtTime(440, t0);
    o.frequency.setValueAtTime(550, t0 + 0.05);
    f.frequency.setValueAtTime(2000, t0);
    env(g, t0, 0.004, 0.05, 0.15, 0.15, 0.65);
    o.start(t0);
    o.stop(t0 + 0.25);
    return;
  }

  if (name === "shine") {
    o.type = "sine";
    o.frequency.setValueAtTime(880, t0);
    o.frequency.setValueAtTime(1100, t0 + 0.08);
    o.frequency.setValueAtTime(1320, t0 + 0.16);
    f.frequency.setValueAtTime(3200, t0);
    env(g, t0, 0.005, 0.08, 0.2, 0.25, 0.75);
    o.start(t0);
    o.stop(t0 + 0.4);
    return;
  }

  if (name === "draw") {
    o.type = "sawtooth";
    o.frequency.setValueAtTime(220, t0);
    o.frequency.exponentialRampToValueAtTime(440, t0 + 0.12);
    f.frequency.setValueAtTime(1400, t0);
    env(g, t0, 0.006, 0.1, 0.15, 0.2, 0.75);
    o.start(t0);
    o.stop(t0 + 0.3);
    return;
  }

  if (name === "collect") {
    o.type = "sine";
    o.frequency.setValueAtTime(520, t0);
    o.frequency.setValueAtTime(660, t0 + 0.05);
    o.frequency.setValueAtTime(780, t0 + 0.1);
    f.frequency.setValueAtTime(2200, t0);
    env(g, t0, 0.004, 0.06, 0.2, 0.2, 0.78);
    o.start(t0);
    o.stop(t0 + 0.32);
    return;
  }

  if (name === "equip") {
    o.type = "triangle";
    o.frequency.setValueAtTime(392, t0);
    o.frequency.setValueAtTime(523, t0 + 0.06);
    f.frequency.setValueAtTime(1600, t0);
    env(g, t0, 0.003, 0.05, 0.12, 0.15, 0.68);
    o.start(t0);
    o.stop(t0 + 0.22);
    return;
  }

  if (name === "unequip") {
    o.type = "triangle";
    o.frequency.setValueAtTime(523, t0);
    o.frequency.setValueAtTime(392, t0 + 0.06);
    f.frequency.setValueAtTime(1400, t0);
    env(g, t0, 0.003, 0.05, 0.12, 0.15, 0.6);
    o.start(t0);
    o.stop(t0 + 0.2);
    return;
  }

  if (name === "trade") {
    o.type = "sine";
    o.frequency.setValueAtTime(440, t0);
    o.frequency.setValueAtTime(550, t0 + 0.08);
    f.frequency.setValueAtTime(1800, t0);
    env(g, t0, 0.004, 0.06, 0.18, 0.2, 0.72);
    o.start(t0);
    o.stop(t0 + 0.3);
    return;
  }

  if (name === "gift") {
    o.type = "triangle";
    o.frequency.setValueAtTime(520, t0);
    o.frequency.setValueAtTime(660, t0 + 0.06);
    o.frequency.setValueAtTime(780, t0 + 0.12);
    f.frequency.setValueAtTime(2000, t0);
    env(g, t0, 0.005, 0.08, 0.25, 0.28, 0.82);
    o.start(t0);
    o.stop(t0 + 0.4);
    return;
  }

  if (name === "daily") {
    o.type = "sine";
    o.frequency.setValueAtTime(440, t0);
    o.frequency.setValueAtTime(550, t0 + 0.1);
    f.frequency.setValueAtTime(1600, t0);
    env(g, t0, 0.005, 0.08, 0.2, 0.25, 0.7);
    o.start(t0);
    o.stop(t0 + 0.35);
    return;
  }

  if (name === "weekly") {
    o.type = "sine";
    o.frequency.setValueAtTime(392, t0);
    o.frequency.setValueAtTime(494, t0 + 0.12);
    o.frequency.setValueAtTime(587, t0 + 0.24);
    f.frequency.setValueAtTime(1800, t0);
    env(g, t0, 0.006, 0.1, 0.3, 0.3, 0.75);
    o.start(t0);
    o.stop(t0 + 0.45);
    return;
  }

  if (name === "checkin") {
    o.type = "triangle";
    o.frequency.setValueAtTime(520, t0);
    o.frequency.setValueAtTime(660, t0 + 0.08);
    o.frequency.setValueAtTime(780, t0 + 0.16);
    f.frequency.setValueAtTime(2200, t0);
    env(g, t0, 0.005, 0.08, 0.25, 0.3, 0.85);
    o.start(t0);
    o.stop(t0 + 0.45);
    return;
  }

  o.type = "sawtooth";
  o.frequency.setValueAtTime(330, t0);
  o.frequency.exponentialRampToValueAtTime(660, t0 + 0.08);
  o.frequency.exponentialRampToValueAtTime(990, t0 + 0.16);
  f.frequency.setValueAtTime(1200, t0);
  f.frequency.exponentialRampToValueAtTime(3600, t0 + 0.2);
  env(g, t0, 0.01, 0.09, 0.2, 0.34, 0.95);
  o.start(t0);
  o.stop(t0 + 0.46);
}
