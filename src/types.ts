export type Rarity = "N" | "R" | "SR" | "SSR";

export interface CardDef {
  id: string;
  name: string;
  rarity: Rarity;
  element: string;
  keywords: string[];
  description?: string;
  story?: string;
}

export interface PullResult {
  card: CardDef;
  rarity: Rarity;
  wasPitySR: boolean;
  wasPitySSR: boolean;
  /** SSR 是否命中当期 UP（仅限定池） */
  isUp?: boolean;
}

export interface PoolDef {
  id: string;
  name: string;
  desc: string;
  /** SSR 出现时命中 UP 的概率（0-1），仅限定池使用 */
  ssrUpRate: number;
  upSsrIds: string[];
}

export interface DailyFortuneResult {
  seed: string;
  sign: string;
  luckElement: string;
  luckNumber: number;
  advice: string;
  mood: string;
}

export interface WheelBuff {
  id: string;
  label: string;
  /** 0–1 额外 SSR 权重加成 */
  ssrBonus: number;
  /** 0–1 额外 SR 权重加成 */
  srBonus: number;
}

export type TabId = "home" | "gacha" | "fortune" | "progress" | "collection" | "settings" | "help";

export interface TaskDef {
  id: string;
  title: string;
  target: number;
  reward: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  points: number;
}

export interface AchievementLevelReward {
  level: number;
  title: string;
  reward: number;
  description?: string;
}

export interface DailyActiveReward {
  id: string;
  title: string;
  points: number;
  reward: number;
  description?: string;
}

export interface DailyActiveProgress {
  date: string | null;
  points: number;
  claimed: Record<string, boolean>;
}
