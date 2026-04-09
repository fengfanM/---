import { createRng, hashString } from "../../lib/rng";
import type { DailyFortuneResult } from "../../types";

const SIGNS = [
  "上上签",
  "上签",
  "中签",
  "下签",
  "下下签",
] as const;

const MOODS = ["明朗", "含蓄", "躁动", "安宁", "试探", "笃定"];

const ADVICE = [
  "宜整理清单，忌拖延承诺。",
  "宜主动沟通，忌闭门造车。",
  "宜小步验证，忌一次押注。",
  "宜倾听反馈，忌固执己见。",
  "宜休息片刻，忌连轴硬撑。",
  "宜记录灵感，忌空谈不落地。",
];

const ELEMENTS = ["木", "火", "土", "金", "水", "风", "雷"];

export function generateDailyFortune(dateKey: string): DailyFortuneResult {
  const seed = hashString(`fortune-${dateKey}`);
  const rng = createRng(seed);
  rng();
  const si = Math.floor(rng() * SIGNS.length);
  const ei = Math.floor(rng() * ELEMENTS.length);
  const luckNumber = 1 + Math.floor(rng() * 99);
  const ai = Math.floor(rng() * ADVICE.length);
  const mi = Math.floor(rng() * MOODS.length);

  return {
    seed: String(seed),
    sign: SIGNS[si],
    luckElement: ELEMENTS[ei],
    luckNumber,
    advice: ADVICE[ai],
    mood: MOODS[mi],
  };
}

export function threeCardNarrative(
  names: [string, string, string],
  keywords: string[][]
): string {
  const [past, present, future] = names;
  const k0 = keywords[0]?.[0] ?? "缘";
  const k1 = keywords[1]?.[0] ?? "机";
  const k2 = keywords[2]?.[0] ?? "果";
  return `过去「${past}」映照「${k0}」；此刻「${present}」牵引「${k1}」；未来「${future}」趋向「${k2}」。顺势而为，心定则路明。`;
}
