import type { CardDef, PoolDef, PullResult, Rarity } from "../../types";
import { createRng, pickWeighted } from "../../lib/rng";

const BASE_WEIGHTS: Record<Rarity, number> = {
  N: 52,
  R: 30,
  SR: 14.5,
  SSR: 3.5,
};

const PITY_10 = 10;
const PITY_50 = 50;

export function rollSinglePull(
  cards: CardDef[],
  poolDef: PoolDef,
  rngSeed: number,
  pullsSinceSR: number,
  pullsSinceSSR: number,
  ssrUpGuarantee: boolean,
  wheelBuff?: { srBonus: number; ssrBonus: number } | null
): PullResult & { nextUpGuarantee: boolean } {
  const rng = createRng(rngSeed);
  // 消耗一点随机性（避免与 seed 完全重合）
  rng();

  let wasPitySR = false;
  let wasPitySSR = false;

  let rarity: Rarity;
  const weights = { ...BASE_WEIGHTS };
  
  if (wheelBuff) {
    weights.SR += weights.SR * wheelBuff.srBonus;
    weights.SSR += weights.SSR * wheelBuff.ssrBonus;
  }

  if (pullsSinceSSR >= PITY_50 - 1) {
    rarity = "SSR";
    wasPitySSR = true;
  } else if (pullsSinceSR >= PITY_10 - 1) {
    rarity = rng() < 0.4 ? "SSR" : "SR";
    wasPitySR = true;
  } else {
    const adjustedWeights = { ...weights };
    
    if (pullsSinceSSR >= 30) {
      const multiplier = 1 + (pullsSinceSSR - 30) * 0.2;
      adjustedWeights.SSR *= multiplier;
    }
    
    if (pullsSinceSR >= 7) {
      adjustedWeights.SR *= 1.5;
    }
    
    const entries = (Object.keys(adjustedWeights) as Rarity[]).map((r) => ({
      item: r,
      weight: adjustedWeights[r],
    }));
    rarity = pickWeighted(entries, rng);
  }

  const rarityPool = cards.filter((c) => c.rarity === rarity);
  let card = rarityPool[Math.floor(rng() * rarityPool.length)] ?? rarityPool[0];

  let isUp: boolean | undefined;
  let nextUpGuarantee = ssrUpGuarantee;
  if (
    rarity === "SSR" &&
    poolDef.upSsrIds.length > 0 &&
    poolDef.ssrUpRate > 0
  ) {
    const shouldUp = ssrUpGuarantee || rng() < poolDef.ssrUpRate;
    if (shouldUp) {
      const upPool = cards.filter((c) => poolDef.upSsrIds.includes(c.id));
      if (upPool.length > 0) {
        card = upPool[Math.floor(rng() * upPool.length)] ?? upPool[0];
        isUp = true;
        nextUpGuarantee = false;
      } else {
        isUp = false;
        nextUpGuarantee = true;
      }
    } else {
      isUp = false;
      nextUpGuarantee = true;
    }
  }

  return {
    card,
    rarity,
    wasPitySR,
    wasPitySSR,
    isUp,
    nextUpGuarantee,
  };
}

export function rollBatch(
  cards: CardDef[],
  poolDef: PoolDef,
  baseSeed: number,
  count: number,
  getState: () => { sr: number; ssr: number; upGuarantee: boolean },
  wheelBuff: { srBonus: number; ssrBonus: number } | null | undefined
): {
  results: PullResult[];
  finalSR: number;
  finalSSR: number;
  finalUpGuarantee: boolean;
} {
  const results: PullResult[] = [];
  let sr = getState().sr;
  let ssr = getState().ssr;
  let upGuarantee = getState().upGuarantee;
  let seed = baseSeed;

  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345 + i) >>> 0;
    const pr = rollSinglePull(
      cards,
      poolDef,
      seed,
      sr,
      ssr,
      upGuarantee,
      wheelBuff
    );
    upGuarantee = pr.nextUpGuarantee;
    const { nextUpGuarantee, ...pure } = pr;
    results.push(pure);
    if (pr.rarity === "SSR") {
      sr = 0;
      ssr = 0;
    } else if (pr.rarity === "SR") {
      sr = 0;
      ssr += 1;
    } else {
      sr += 1;
      ssr += 1;
    }
  }

  return { results, finalSR: sr, finalSSR: ssr, finalUpGuarantee: upGuarantee };
}
