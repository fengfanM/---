export type Rarity = "N" | "R" | "SR" | "SSR";

export type Element = "金" | "木" | "水" | "火" | "土" | "阴" | "阳";

export interface CardDef {
  id: string;
  name: string;
  rarity: Rarity;
  element: Element;
  keywords: string[];
  description?: string;
  story?: string;
  setId?: string;
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

export interface AchievementShopItem {
  id: string;
  title: string;
  description: string;
  cost: number;
  type: "coins" | "freePulls" | "other";
  value: number;
}

export interface DailyPrivilege {
  id: string;
  title: string;
  description: string;
  requiredLevel: number;
}

export interface DailyPrivilegeUsage {
  date: string | null;
  used: Record<string, boolean>;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  type: "double_coins" | "double_pulls" | "double_task";
  startDate: string;
  endDate: string;
  multiplier: number;
}

export interface ActivityState {
  activeActivities: string[];
}

export interface CardSkill {
  id: string;
  name: string;
  description: string;
  effect: "increase_luck" | "decrease_pity" | "extra_coins" | "double_drop";
  value: number;
}

export interface Deck {
  id: string;
  name: string;
  cardIds: string[];
}

export interface DeckState {
  activeDeck: string | null;
  decks: Record<string, Deck>;
}

export interface CardLevel {
  [cardId: string]: number;
}

export interface CardSet {
  id: string;
  name: string;
  description: string;
  cardIds: string[];
  bonuses: Array<{
    count: number;
    description: string;
    effect: "increase_luck" | "decrease_pity" | "extra_coins" | "double_drop";
    value: number;
  }>;
}

export interface ElementAdvantage {
  [key: string]: {
    strong: Element[];
    weak: Element[];
  };
}

export interface CardBreakthrough {
  level: number;
  requiredCards: number;
  requiredCoins: number;
  bonusDescription: string;
}

export interface CardBreakthroughState {
  [cardId: string]: number;
}
