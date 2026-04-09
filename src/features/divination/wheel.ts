import type { WheelBuff } from "../../types";
import { createRng, hashString } from "../../lib/rng";

const BUFFS: WheelBuff[] = [
  { id: "ssr_luck", label: "天机眷顾：SSR 权重 +15%", ssrBonus: 0.15, srBonus: 0 },
  { id: "sr_luck", label: "灵韵加持：SR 权重 +25%", ssrBonus: 0, srBonus: 0.25 },
  { id: "double_coin", label: "财星高照：下次任务奖励 +50%（领取时生效）", ssrBonus: 0, srBonus: 0 },
  { id: "calm", label: "心平气和：今日签文更偏「上签」", ssrBonus: 0, srBonus: 0 },
  { id: "wild", label: "变数之门：十连额外赠送 1 抽（计入统计）", ssrBonus: 0, srBonus: 0 },
];

export function spinWheel(dateKey: string): WheelBuff {
  const seed = hashString(`wheel-${dateKey}`);
  const rng = createRng(seed);
  rng();
  const i = Math.floor(rng() * BUFFS.length);
  return BUFFS[i];
}

export { BUFFS };
