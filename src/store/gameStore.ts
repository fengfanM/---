import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import cardsJson from "../data/cards.json";
import poolsJson from "../data/pools.json";
import type {
  CardDef,
  DailyFortuneResult,
  PoolDef,
  PullResult,
  WheelBuff,
  AchievementLevelReward,
  DailyActiveReward,
  DailyActiveProgress,
  DailyPrivilegeUsage,
  Deck,
  CardSkill,
  CardSet,
  ElementAdvantage,
  CardBreakthroughState,
  Element,
} from "../types";
import { rollBatch } from "../features/gacha/gachaEngine";
import { generateDailyFortune } from "../features/divination/fortuneTemplates";
import { spinWheel } from "../features/divination/wheel";
import { createRng, hashString } from "../lib/rng";

const SAVE_VERSION = 1;
const CARDS = cardsJson as CardDef[];
const POOLS = poolsJson as PoolDef[];

const ELEMENT_ADVANTAGE: ElementAdvantage = {
  金: { strong: ["木"], weak: ["火"] },
  木: { strong: ["土"], weak: ["金"] },
  水: { strong: ["火"], weak: ["土"] },
  火: { strong: ["金"], weak: ["水"] },
  土: { strong: ["水"], weak: ["木"] },
  阴: { strong: ["阳"], weak: ["阳"] },
  阳: { strong: ["阴"], weak: ["阴"] },
};

const CARD_SETS: CardSet[] = [
  {
    id: "four_symbols",
    name: "四象神兽",
    description: "收集四象神兽卡牌，获得强大加成",
    cardIds: [],
    bonuses: [
      { count: 2, description: "SR概率+2%", effect: "increase_luck" as const, value: 2 },
      { count: 4, description: "SSR概率+2%", effect: "increase_luck" as const, value: 2 },
    ],
  },
];

const BREAKTHROUGH_LEVELS = [
  { level: 1, requiredCards: 2, requiredCoins: 300, bonusDescription: "技能效果+10%" },
  { level: 2, requiredCards: 3, requiredCoins: 600, bonusDescription: "技能效果+20%" },
  { level: 3, requiredCards: 5, requiredCoins: 1500, bonusDescription: "技能效果+35%" },
];

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function weekKey(): string {
  const d = new Date();
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

interface TaskDef {
  id: string;
  title: string;
  target: number;
  reward: number;
  type: "daily" | "weekly";
}

const TASK_DEFS: readonly TaskDef[] = [
  { id: "t_pull1", title: "进行一次卜问", target: 1, reward: 10, type: "daily" },
  { id: "t_pull10", title: "进行十次卜问", target: 10, reward: 20, type: "daily" },
  { id: "t_fortune", title: "查看今日运势", target: 1, reward: 12, type: "daily" },
  { id: "t_three", title: "完成一次三牌阵", target: 1, reward: 15, type: "daily" },
  { id: "t_wheel", title: "转动命运轮盘", target: 1, reward: 8, type: "daily" },
  { id: "t_weekly_pull", title: "本周完成 50 次抽卡", target: 50, reward: 100, type: "weekly" },
  { id: "t_weekly_ssr", title: "本周获得 1 张 SSR", target: 1, reward: 70, type: "weekly" },
  { id: "t_weekly_fortune", title: "本周查看 5 次每日运势", target: 5, reward: 50, type: "weekly" },
  { id: "t_weekly_three", title: "本周完成 3 次三牌阵", target: 3, reward: 45, type: "weekly" },
] as const;

const COLLECTION_REWARDS = [
  { id: "cr_25", title: "收集 25% 图鉴", threshold: 0.25, reward: 500 },
  { id: "cr_50", title: "收集 50% 图鉴", threshold: 0.50, reward: 1000 },
  { id: "cr_75", title: "收集 75% 图鉴", threshold: 0.75, reward: 2000 },
  { id: "cr_100", title: "收集 100% 图鉴", threshold: 1.00, reward: 5000 },
] as const;

export const ACHIEVEMENT_LEVEL_REWARDS: readonly AchievementLevelReward[] = [
  { level: 1, title: "初入天机", reward: 100, description: "开启你的修行之路" },
  { level: 2, title: "略窥门径", reward: 200, description: "修行渐入佳境" },
  { level: 3, title: "小有成就", reward: 300, description: "已获小成" },
  { level: 4, title: "登堂入室", reward: 500, description: "技艺渐精" },
  { level: 5, title: "出类拔萃", reward: 800, description: "超越常人" },
  { level: 6, title: "炉火纯青", reward: 1200, description: "技艺精湛" },
  { level: 7, title: "宗师风范", reward: 1800, description: "一代宗师" },
  { level: 8, title: "超凡入圣", reward: 2500, description: "超凡脱俗" },
  { level: 9, title: "天人合一", reward: 3500, description: "与道合一" },
  { level: 10, title: "天机大师", reward: 5000, description: "参透天机" },
] as const;

export const DAILY_ACTIVE_REWARDS: readonly DailyActiveReward[] = [
  { id: "da_20", title: "初露锋芒", points: 20, reward: 30, description: "完成 20 活跃点" },
  { id: "da_50", title: "渐入佳境", points: 50, reward: 80, description: "完成 50 活跃点" },
  { id: "da_100", title: "全情投入", points: 100, reward: 150, description: "完成 100 活跃点" },
  { id: "da_150", title: "活跃达人", points: 150, reward: 250, description: "完成 150 活跃点" },
  { id: "da_200", title: "今日之星", points: 200, reward: 400, description: "完成 200 活跃点" },
] as const;

export const ACHIEVEMENT_SHOP_ITEMS = [
  { id: "shop_coins_100", title: "灵石 100", description: "兑换 100 灵石", cost: 20, type: "coins" as const, value: 100 },
  { id: "shop_coins_500", title: "灵石 500", description: "兑换 500 灵石", cost: 80, type: "coins" as const, value: 500 },
  { id: "shop_coins_1000", title: "灵石 1000", description: "兑换 1000 灵石", cost: 150, type: "coins" as const, value: 1000 },
  { id: "shop_free_pull_1", title: "免费抽 1 次", description: "兑换 1 次免费抽卡", cost: 50, type: "freePulls" as const, value: 1 },
  { id: "shop_free_pull_5", title: "免费抽 5 次", description: "兑换 5 次免费抽卡", cost: 200, type: "freePulls" as const, value: 5 },
] as const;

export const DAILY_PRIVILEGES = [
  { id: "priv_free_pull", title: "每日免费抽", description: "每日可免费抽卡 1 次", requiredLevel: 3 },
  { id: "priv_double_reward", title: "双倍奖励", description: "今日签到奖励翻倍", requiredLevel: 5 },
  { id: "priv_extra_coins", title: "额外灵石", description: "每日额外获得 50 灵石", requiredLevel: 7 },
  { id: "priv_pity_buff", title: "保底加成", description: "SSR 保底进度减 5", requiredLevel: 9 },
] as const;

function isWeekend(): boolean {
  const now = new Date();
  const day = now.getDay();
  return day === 0 || day === 6;
}

function getCurrentWeekendActivity(): { id: string; type: "double_coins" | "double_task"; multiplier: number } | null {
  if (isWeekend()) {
    return { id: "weekend_double", type: "double_coins", multiplier: 2 };
  }
  return null;
}

const ACHIEVEMENTS = [
  { id: "a_first", title: "初次卜问", description: "完成第一次抽卡", points: 10 },
  { id: "a_ssr", title: "天机乍现", description: "获得第一张 SSR", points: 50 },
  { id: "a_10", title: "十连入门", description: "累计抽卡达到 10 次", points: 15 },
  { id: "a_100", title: "百抽成习", description: "累计抽卡达到 100 次", points: 30 },
  { id: "a_500", title: "五百征程", description: "累计抽卡达到 500 次", points: 100 },
  { id: "a_1000", title: "千抽大成", description: "累计抽卡达到 1000 次", points: 200 },
  { id: "a_streak7", title: "七日恒心", description: "连续签到 7 天", points: 25 },
  { id: "a_streak30", title: "一月坚守", description: "连续签到 30 天", points: 80 },
  { id: "a_streak100", title: "百日修行", description: "连续签到 100 天", points: 200 },
  { id: "a_sr_first", title: "灵月初升", description: "获得第一张 SR", points: 20 },
  { id: "a_ssr_5", title: "五星连珠", description: "累计获得 5 张 SSR", points: 100 },
  { id: "a_ssr_10", title: "十全十美", description: "累计获得 10 张 SSR", points: 200 },
  { id: "a_ssr_20", title: "双十成就", description: "累计获得 20 张 SSR", points: 400 },
  { id: "a_ssr_50", title: "SSR 收集大师", description: "累计获得 50 张 SSR", points: 1000 },
  { id: "a_up_ssr", title: "命运眷顾", description: "获得第一张 UP SSR", points: 80 },
  { id: "a_double_ssr", title: "双喜临门", description: "单次抽卡获得 2 张 SSR", points: 150 },
  { id: "a_triple_ssr", title: "三星连珠", description: "单次抽卡获得 3 张 SSR", points: 300 },
  { id: "a_collection_half", title: "半卷天机", description: "图鉴收集达到 50%", points: 50 },
  { id: "a_collection_full", title: "天机全卷", description: "图鉴收集完成 100%", points: 300 },
  { id: "a_fortune_read", title: "观星者", description: "查看 30 次每日运势", points: 30 },
  { id: "a_wheel_spin", title: "转轮师", description: "转动 30 次命运轮盘", points: 30 },
  { id: "a_three_draw", title: "三牌师", description: "完成 30 次三牌阵", points: 30 },
  { id: "a_task_master", title: "勤勉者", description: "完成 100 次每日任务", points: 50 },
  { id: "a_pity_ssr", title: "天道酬勤", description: "触发 SSR 保底机制", points: 40 },
] as const;

interface GameState {
  saveVersion: number;
  coins: number;
  activePoolId: string;
  ssrUpGuarantee: boolean;
  fatePoints: number;
  pullsSinceSR: number;
  pullsSinceSSR: number;
  totalPulls: number;
  inventory: Record<string, number>;
  lastLoginDate: string | null;
  streak: number;
  dailyFortuneDate: string | null;
  dailyFortune: DailyFortuneResult | null;
  threeCardIds: string[] | null;
  wheelDate: string | null;
  wheelBuff: WheelBuff | null;
  taskRewardMultiplier: number;
  freePulls: number;
  /** 今日是否已用运势「心平气和」加成 */
  calmFortune: boolean;
  taskProgress: Record<string, number>;
  taskClaimedDay: string | null;
  taskClaimed: Record<string, boolean>;
  weeklyTaskProgress: Record<string, number>;
  weeklyTaskClaimedWeek: string | null;
  weeklyTaskClaimed: Record<string, boolean>;
  /** 图鉴收集奖励领取记录 */
  collectionRewardsClaimed: Record<string, boolean>;
  /** 成就等级奖励领取记录 */
  achievementLevelRewardsClaimed: Record<number, boolean>;
  /** 每日活跃进度 */
  dailyActive: DailyActiveProgress;
  achievements: Record<string, boolean>;
  history: { id: string; cardId: string; rarity: string; at: number }[];
  settings: { reducedMotion: boolean; soundOn: boolean };
  lastPullResults: PullResult[] | null;
  pendingReveal: PullResult[] | null;
  lastSyncError: string | null;
  /** 统计数据 */
  stats: {
    totalPulls: number;
    totalSr: number;
    totalSsr: number;
    totalUpSsr: number;
    maxSsrsInSinglePull: number;
    maxSrsInSinglePull: number;
    fortuneReadCount: number;
    wheelSpinCount: number;
    threeDrawCount: number;
    taskCompletedCount: number;
    pitySsrTriggered: boolean;
  };
  /** 每日签到相关 */
  checkInDate: string | null;
  checkInStreak: number;
  totalCheckIns: number;
  /** 新手引导 */
  tutorialStep: number;
  tutorialCompleted: boolean;
  /** 智能提示系统 */
  smartTips: {
    hasSeenCollectionTip: boolean;
    hasSeenDeckTip: boolean;
    hasSeenBreakthroughTip: boolean;
    lastTipShown: string | null;
  };
  /** 加载状态 */
  isLoading: boolean;
  loadingMessage: string;
  /** 云存档相关 */
  cloudSaveEnabled: boolean;
  cloudLastSavedAt: string | null;
  cloudLastSyncedAt: string | null;
  /** 用户名 */
  username: string | null;
  usernameSet: boolean;
  /** 成就商店兑换记录 */
  achievementShopPurchased: Record<string, number>;
  /** 每日特权使用记录 */
  dailyPrivilegeUsage: DailyPrivilegeUsage;
  /** 卡组系统 */
  activeDeck: string | null;
  decks: Record<string, Deck>;
  /** 卡牌等级 */
  cardLevels: Record<string, number>;
  /** 卡牌突破等级 */
  cardBreakthroughs: CardBreakthroughState;
  /** 奖励动画状态 */
  rewardAnimation: {
    visible: boolean;
    type: "coins" | "card" | "achievement" | "level";
    amount: number;
  } | null;
  
  /** 成就通知状态 */
  achievementNotification: {
    visible: boolean;
    title: string;
    message: string;
    icon: string;
  };

  /** actions */
  resetAll: () => void;
  tickDailyLogin: () => void;
  pullSingle: () => PullResult[] | null;
  pullTen: () => PullResult[] | null;
  dismissResults: () => void;
  dismissReveal: () => void;
  setActivePoolId: (poolId: string) => void;
  syncFromBackend: () => Promise<void>;
  readDailyFortune: () => void;
  drawThreeCards: () => void;
  spinWheelAction: () => void;
  claimTask: (taskId: string) => void;
  claimWeeklyTask: (taskId: string) => void;
  cardById: (id: string) => CardDef | undefined;
  toggleSound: () => void;
  toggleReducedMotion: () => void;
  checkIn: () => { success: boolean; reward: number };
  achievementPoints: () => number;
  achievementLevel: () => number;
  checkCollectionRewards: () => number;
  claimAchievementLevelReward: (level: number) => { success: boolean; reward: number; title: string };
  addDailyActivePoints: (points: number) => void;
  claimDailyActiveReward: (id: string) => { success: boolean; reward: number; title: string };
  advanceTutorial: () => void;
  skipTutorial: () => void;
  saveToCloud: () => Promise<{ success: boolean; error?: string }>;
  loadFromCloud: () => Promise<{ success: boolean; error?: string; hasData?: boolean }>;
  toggleCloudSave: () => void;
  setUsername: (name: string) => void;
  purchaseFromAchievementShop: (itemId: string) => { success: boolean; error?: string };
  useDailyPrivilege: (privilegeId: string) => { success: boolean; error?: string };
  getCurrentMultiplier: (type: "coins" | "task") => number;
  createDeck: (name: string) => { success: boolean; deckId: string };
  deleteDeck: (deckId: string) => { success: boolean; error?: string };
  addCardToDeck: (deckId: string, cardId: string) => { success: boolean; error?: string };
  removeCardFromDeck: (deckId: string, cardId: string) => { success: boolean; error?: string };
  setActiveDeck: (deckId: string | null) => void;
  upgradeCard: (cardId: string) => { success: boolean; error?: string };
  getDeckCardSkills: () => CardSkill[];
  breakthroughCard: (cardId: string) => { success: boolean; error?: string };
  getElementAdvantage: (element: Element) => { strong: Element[]; weak: Element[] };
  getSetBonuses: () => Array<{ setName: string; bonus: string; effect: string; value: number }>;
  triggerRewardAnimation: (type: "coins" | "card" | "achievement" | "level", amount: number) => void;
  dismissRewardAnimation: () => void;
  triggerAchievementNotification: (title: string, message: string, icon: string) => void;
  dismissAchievementNotification: () => void;
  showSmartTip: (tipType: "collection" | "deck" | "breakthrough") => boolean;
  setLoading: (isLoading: boolean, message?: string) => void;
}

function initialState(): Omit<
  GameState,
  | "resetAll"
  | "tickDailyLogin"
  | "pullSingle"
  | "pullTen"
  | "dismissResults"
  | "dismissReveal"
  | "setActivePoolId"
  | "syncFromBackend"
  | "readDailyFortune"
  | "drawThreeCards"
  | "spinWheelAction"
  | "claimTask"
  | "claimWeeklyTask"
  | "cardById"
  | "toggleSound"
  | "toggleReducedMotion"
  | "checkIn"
  | "achievementPoints"
  | "achievementLevel"
  | "checkCollectionRewards"
  | "claimAchievementLevelReward"
  | "addDailyActivePoints"
  | "claimDailyActiveReward"
  | "advanceTutorial"
  | "skipTutorial"
  | "saveToCloud"
  | "loadFromCloud"
  | "toggleCloudSave"
  | "setUsername"
  | "purchaseFromAchievementShop"
  | "useDailyPrivilege"
  | "getCurrentMultiplier"
  | "createDeck"
  | "deleteDeck"
  | "addCardToDeck"
  | "removeCardFromDeck"
  | "setActiveDeck"
  | "upgradeCard"
  | "getDeckCardSkills"
  | "breakthroughCard"
  | "getElementAdvantage"
  | "getSetBonuses"
  | "triggerRewardAnimation"
  | "dismissRewardAnimation"
  | "triggerAchievementNotification"
  | "dismissAchievementNotification"
  | "showSmartTip"
  | "setLoading"
> {
  return {
    saveVersion: SAVE_VERSION,
    coins: 3000,
    activePoolId: "permanent",
    ssrUpGuarantee: false,
    fatePoints: 0,
    pullsSinceSR: 0,
    pullsSinceSSR: 0,
    totalPulls: 0,
    inventory: {},
    lastLoginDate: null,
    streak: 0,
    dailyFortuneDate: null,
    dailyFortune: null,
    threeCardIds: null,
    wheelDate: null,
    wheelBuff: null,
    taskRewardMultiplier: 1,
    freePulls: 0,
    calmFortune: false,
    taskProgress: {},
    taskClaimedDay: null,
    taskClaimed: {},
    weeklyTaskProgress: {},
    weeklyTaskClaimedWeek: null,
    weeklyTaskClaimed: {},
    collectionRewardsClaimed: {},
    achievementLevelRewardsClaimed: {},
    dailyActive: {
      date: null,
      points: 0,
      claimed: {},
    },
    achievements: {},
    history: [],
    settings: { reducedMotion: false, soundOn: true },
    lastPullResults: null,
    pendingReveal: null,
    lastSyncError: null,
    stats: {
      totalPulls: 0,
      totalSr: 0,
      totalSsr: 0,
      totalUpSsr: 0,
      maxSsrsInSinglePull: 0,
      maxSrsInSinglePull: 0,
      fortuneReadCount: 0,
      wheelSpinCount: 0,
      threeDrawCount: 0,
      taskCompletedCount: 0,
      pitySsrTriggered: false,
    },
    checkInDate: null,
    checkInStreak: 0,
    totalCheckIns: 0,
    tutorialStep: 0,
    tutorialCompleted: false,
    smartTips: {
      hasSeenCollectionTip: false,
      hasSeenDeckTip: false,
      hasSeenBreakthroughTip: false,
      lastTipShown: null,
    },
    isLoading: false,
    loadingMessage: "",
    cloudSaveEnabled: false,
    cloudLastSavedAt: null,
    cloudLastSyncedAt: null,
    username: null,
    usernameSet: false,
    achievementShopPurchased: {},
    dailyPrivilegeUsage: {
      date: null,
      used: {},
    },
    activeDeck: null,
    decks: {},
    cardLevels: {},
    cardBreakthroughs: {},
    rewardAnimation: null,
    achievementNotification: {
      visible: false,
      title: "",
      message: "",
      icon: "",
    },
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      cardById: (id) => CARDS.find((c) => c.id === id),

      toggleSound: () =>
        set((s) => ({
          settings: { ...s.settings, soundOn: !s.settings.soundOn },
        })),

      toggleReducedMotion: () =>
        set((s) => ({
          settings: { ...s.settings, reducedMotion: !s.settings.reducedMotion },
        })),

      resetAll: () => set({ ...initialState() }),

      checkIn: () => {
        const t = todayKey();
        const s = get();
        if (s.checkInDate === t) {
          return { success: false, reward: 0 };
        }

        let streak = s.checkInStreak;
        const last = s.checkInDate;
        if (last === null) {
          streak = 1;
        } else {
          const prev = new Date(last + "T12:00:00");
          const cur = new Date(t + "T12:00:00");
          const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86400000);
          streak = diffDays === 1 ? streak + 1 : 1;
        }

        const baseReward = Math.min(30 + (streak - 1) * 8, 100);
        const multiplier = s.getCurrentMultiplier("coins");
        const reward = baseReward * multiplier;

        set((st) => {
          let currentActive = { ...st.dailyActive };
          if (currentActive.date !== t) {
            currentActive = { date: t, points: 0, claimed: {} };
          }
          currentActive.points += 20;
          return {
            ...st,
            checkInDate: t,
            checkInStreak: streak,
            totalCheckIns: st.totalCheckIns + 1,
            coins: st.coins + reward,
            dailyActive: currentActive,
          };
        });

        get().triggerRewardAnimation("coins", reward);

        return { success: true, reward };
      },

      achievementPoints: () => {
        const s = get();
        let points = 0;
        for (const a of ACHIEVEMENTS) {
          if (s.achievements[a.id]) {
            points += a.points;
          }
        }
        return points;
      },

      achievementLevel: () => {
        const points = get().achievementPoints();
        if (points >= 1000) return 10;
        if (points >= 750) return 9;
        if (points >= 500) return 8;
        if (points >= 350) return 7;
        if (points >= 250) return 6;
        if (points >= 150) return 5;
        if (points >= 100) return 4;
        if (points >= 50) return 3;
        if (points >= 25) return 2;
        return 1;
      },

      checkCollectionRewards: () => {
        const s = get();
        const ownedCount = Object.keys(s.inventory).filter((id) => (s.inventory[id] ?? 0) > 0).length;
        const totalCount = CARDS.length;
        const progress = totalCount > 0 ? ownedCount / totalCount : 0;
        let totalReward = 0;
        const newClaimed = { ...s.collectionRewardsClaimed };

        for (const reward of COLLECTION_REWARDS) {
          if (!newClaimed[reward.id] && progress >= reward.threshold) {
            newClaimed[reward.id] = true;
            totalReward += reward.reward;
          }
        }

        if (totalReward > 0) {
          set((st) => ({
            ...st,
            coins: st.coins + totalReward,
            collectionRewardsClaimed: newClaimed,
          }));
        }
        return totalReward;
      },

      claimAchievementLevelReward: (level) => {
        const s = get();
        const currentLevel = s.achievementLevel();
        const rewardDef = ACHIEVEMENT_LEVEL_REWARDS.find((r) => r.level === level);
        
        if (!rewardDef || currentLevel < level || s.achievementLevelRewardsClaimed[level]) {
          return { success: false, reward: 0, title: "" };
        }

        set((st) => ({
          ...st,
          coins: st.coins + rewardDef.reward,
          achievementLevelRewardsClaimed: {
            ...st.achievementLevelRewardsClaimed,
            [level]: true,
          },
        }));

        get().triggerRewardAnimation("achievement", rewardDef.reward);

        return { success: true, reward: rewardDef.reward, title: rewardDef.title };
      },

      addDailyActivePoints: (points) => {
        const t = todayKey();
        set((st) => {
          let currentActive = { ...st.dailyActive };
          if (currentActive.date !== t) {
            currentActive = { date: t, points: 0, claimed: {} };
          }
          currentActive.points += points;
          return { ...st, dailyActive: currentActive };
        });
      },

      claimDailyActiveReward: (id) => {
        const t = todayKey();
        const s = get();
        
        let currentActive = { ...s.dailyActive };
        if (currentActive.date !== t) {
          currentActive = { date: t, points: 0, claimed: {} };
        }

        const rewardDef = DAILY_ACTIVE_REWARDS.find((r) => r.id === id);
        
        if (!rewardDef || currentActive.points < rewardDef.points || currentActive.claimed[id]) {
          return { success: false, reward: 0, title: "" };
        }

        set((st) => ({
          ...st,
          coins: st.coins + rewardDef.reward,
          dailyActive: {
            ...currentActive,
            claimed: { ...currentActive.claimed, [id]: true },
          },
        }));

        get().triggerRewardAnimation("coins", rewardDef.reward);

        return { success: true, reward: rewardDef.reward, title: rewardDef.title };
      },

      tickDailyLogin: () => {
        const t = todayKey();
        const wk = weekKey();
        set((s) => {
          let weeklyReset = false;
          if (s.lastLoginDate === t) return s;
          if (s.weeklyTaskClaimedWeek !== wk) weeklyReset = true;

          const last = s.lastLoginDate;
          let streak = s.streak;
          if (last === null) {
            streak = 1;
          } else {
            const prev = new Date(last + "T12:00:00");
            const cur = new Date(t + "T12:00:00");
            const diffDays = Math.round(
              (cur.getTime() - prev.getTime()) / 86400000
            );
            streak = diffDays === 1 ? streak + 1 : 1;
          }

          const achievements = { ...s.achievements };
          if (streak >= 7) achievements.a_streak7 = true;

          return {
            ...s,
            lastLoginDate: t,
            streak,
            achievements,
            freePulls: 3,
            taskProgress: {},
            taskClaimed: {},
            taskClaimedDay: null,
            weeklyTaskProgress: weeklyReset ? {} : s.weeklyTaskProgress,
            weeklyTaskClaimed: weeklyReset ? {} : s.weeklyTaskClaimed,
            weeklyTaskClaimedWeek: wk,
            dailyFortuneDate: null,
            dailyFortune: null,
            threeCardIds: null,
            wheelDate: null,
            wheelBuff: null,
            taskRewardMultiplier: 1,
            calmFortune: false,
          };
        });
      },

      dismissResults: () => set({ lastPullResults: null }),
      dismissReveal: () => set({ pendingReveal: null }),
      setActivePoolId: (poolId) => set({ activePoolId: poolId }),
      syncFromBackend: async () => {
        const { fetchInventory } = await import("../backend/api");
        const { getOrCreateUserId } = await import("../backend/userId");
        const { hasSupabase } = await import("../backend/supabaseClient");
        if (!hasSupabase()) return;
        try {
          const userId = getOrCreateUserId();
          const inv = await fetchInventory(userId);
          set({ inventory: inv, lastSyncError: null });
        } catch (e) {
          set({ lastSyncError: (e as Error).message ?? String(e) });
        }
      },

      pullSingle: () => {
        const s = get();
        const cost = 1;
        const useFree = s.freePulls > 0;
        if (!useFree && s.coins < cost * 10) return null;

        const seed =
          (hashString(`pull-${Date.now()}-${Math.random()}`) ^ s.totalPulls) >>>
          0;
        const wb = s.wheelBuff;
        
        let ssrBonus = 0;
        let srBonus = 0;
        let pityReduction = 0;
        
        if (wb) {
          ssrBonus += wb.ssrBonus;
          srBonus += wb.srBonus;
        }
        
        const skills = s.getDeckCardSkills();
        for (const skill of skills) {
          if (skill.effect === "increase_luck") {
            ssrBonus += skill.value * 0.1;
            srBonus += skill.value * 0.05;
          } else if (skill.effect === "decrease_pity") {
            pityReduction += skill.value;
          }
        }
        
        if (s.dailyFortune) {
          if (s.dailyFortune.sign === "上上签") {
            ssrBonus += 3;
            srBonus += 2;
          } else if (s.dailyFortune.sign === "上签") {
            ssrBonus += 1;
            srBonus += 1;
          } else if (s.dailyFortune.sign === "下签" || s.dailyFortune.sign === "下下签") {
            ssrBonus -= 1;
            srBonus -= 1;
          }
        }
        
        const gachaBuff = {
          ssrBonus: Math.max(0, ssrBonus),
          srBonus: Math.max(0, srBonus),
        };

        const pool = POOLS.find((p) => p.id === s.activePoolId) ?? POOLS[0]!;
        const { results, finalSR, finalSSR, finalUpGuarantee } = rollBatch(
          CARDS,
          pool,
          seed,
          1,
          () => ({
            sr: s.pullsSinceSR,
            ssr: Math.max(0, s.pullsSinceSSR - pityReduction),
            upGuarantee: s.ssrUpGuarantee,
          }),
          gachaBuff
        );
        const pr = results[0];
        if (!pr) return null;

        set((st) => {
          const inv = { ...st.inventory };
          inv[pr.card.id] = (inv[pr.card.id] ?? 0) + 1;
          const hist = [
            {
              id: `${Date.now()}-${pr.card.id}`,
              cardId: pr.card.id,
              rarity: pr.rarity,
              at: Date.now(),
            },
            ...st.history,
          ].slice(0, 200);

          const tp = { ...st.taskProgress };
          tp.t_pull1 = (tp.t_pull1 ?? 0) + 1;
          tp.t_pull10 = (tp.t_pull10 ?? 0) + 1;
          const wtp = { ...st.weeklyTaskProgress };
          wtp.t_weekly_pull = (wtp.t_weekly_pull ?? 0) + 1;
          if (pr.rarity === "SSR") {
            wtp.t_weekly_ssr = (wtp.t_weekly_ssr ?? 0) + 1;
          }

          const ach = { ...st.achievements };
          const oldAchievements = { ...st.achievements };
          
          ach.a_first = true;
          if (pr.rarity === "SSR") ach.a_ssr = true;
          if (st.totalPulls + 1 >= 10) ach.a_10 = true;
          if (st.totalPulls + 1 >= 100) ach.a_100 = true;
          if (st.totalPulls + 1 >= 500) ach.a_500 = true;
          if (st.totalPulls + 1 >= 1000) ach.a_1000 = true;
          if (st.streak >= 30) ach.a_streak30 = true;
          if (st.streak >= 100) ach.a_streak100 = true;

          const ssrCount = pr.rarity === "SSR" ? 1 : 0;
          const srCount = pr.rarity === "SR" ? 1 : 0;
          
          const stats = { ...st.stats };
          stats.totalPulls += 1;
          if (pr.rarity === "SR") stats.totalSr += 1;
          if (pr.rarity === "SSR") {
            stats.totalSsr += 1;
            if (pr.isUp) stats.totalUpSsr += 1;
            if (pr.wasPitySSR) stats.pitySsrTriggered = true;
          }
          if (ssrCount > stats.maxSsrsInSinglePull) stats.maxSsrsInSinglePull = ssrCount;
          if (srCount > stats.maxSrsInSinglePull) stats.maxSrsInSinglePull = srCount;
          
          if (stats.totalSr >= 1) ach.a_sr_first = true;
          if (stats.totalSsr >= 5) ach.a_ssr_5 = true;
          if (stats.totalSsr >= 10) ach.a_ssr_10 = true;
          if (stats.totalSsr >= 20) ach.a_ssr_20 = true;
          if (stats.totalSsr >= 50) ach.a_ssr_50 = true;
          if (stats.totalUpSsr >= 1) ach.a_up_ssr = true;
          if (stats.maxSsrsInSinglePull >= 2) ach.a_double_ssr = true;
          if (stats.maxSsrsInSinglePull >= 3) ach.a_triple_ssr = true;
          if (stats.pitySsrTriggered) ach.a_pity_ssr = true;

          const ownedCount = Object.keys(inv).filter((id) => (inv[id] ?? 0) > 0).length;
          if (ownedCount >= CARDS.length / 2) ach.a_collection_half = true;
          if (ownedCount >= CARDS.length) ach.a_collection_full = true;

          // 检查新解锁的成就
          const newlyUnlocked = ACHIEVEMENTS.filter(a => ach[a.id] && !oldAchievements[a.id]);
          for (const achievement of newlyUnlocked) {
            get().triggerAchievementNotification(
              achievement.title,
              achievement.description,
              "🏆"
            );
          }

          const progress = CARDS.length > 0 ? ownedCount / CARDS.length : 0;
          const newClaimed = { ...st.collectionRewardsClaimed };
          let collectionReward = 0;
          for (const reward of COLLECTION_REWARDS) {
            if (!newClaimed[reward.id] && progress >= reward.threshold) {
              newClaimed[reward.id] = true;
              collectionReward += reward.reward;
            }
          }

          const gainedFate = 1;
          const t = todayKey();
          let currentActive = { ...st.dailyActive };
          if (currentActive.date !== t) {
            currentActive = { date: t, points: 0, claimed: {} };
          }
          currentActive.points += 10;
          
          return {
            ...st,
            coins: (useFree ? st.coins : st.coins - cost * 10) + collectionReward,
            freePulls: useFree ? st.freePulls - 1 : st.freePulls,
            pullsSinceSR: finalSR,
            pullsSinceSSR: finalSSR,
            ssrUpGuarantee: finalUpGuarantee,
            totalPulls: st.totalPulls + 1,
            inventory: inv,
            history: hist,
            taskProgress: tp,
            weeklyTaskProgress: wtp,
            achievements: ach,
            stats,
            collectionRewardsClaimed: newClaimed,
            lastPullResults: results,
            pendingReveal: results,
            fatePoints: st.fatePoints + gainedFate,
            dailyActive: currentActive,
          };
        });

        // best-effort backend log
        void (async () => {
          const { hasSupabase } = await import("../backend/supabaseClient");
          if (!hasSupabase()) return;
          const { getOrCreateUserId } = await import("../backend/userId");
          const { postPull, pullResultsToRow } = await import("../backend/api");
          const userId = getOrCreateUserId();
          try {
            await postPull(
              pullResultsToRow(userId, s.activePoolId, results)
            );
          } catch {
            // ignore for now; later we can add retry queue
          }
        })();
        return results;
      },

      pullTen: () => {
        const s = get();
        const baseCost = 80;
        const wild = s.wheelBuff?.id === "wild";
        const cost = wild ? baseCost - 10 : baseCost;
        if (s.coins < cost) return null;

        const count = wild ? 11 : 10;
        const seed =
          (hashString(`ten-${Date.now()}-${Math.random()}`) ^ s.totalPulls) >>>
          0;
        const wb = s.wheelBuff;
        
        let ssrBonus = 0;
        let srBonus = 0;
        let pityReduction = 0;
        
        if (wb) {
          ssrBonus += wb.ssrBonus;
          srBonus += wb.srBonus;
        }
        
        const skills = s.getDeckCardSkills();
        for (const skill of skills) {
          if (skill.effect === "increase_luck") {
            ssrBonus += skill.value * 0.1;
            srBonus += skill.value * 0.05;
          } else if (skill.effect === "decrease_pity") {
            pityReduction += skill.value;
          }
        }
        
        if (s.dailyFortune) {
          if (s.dailyFortune.sign === "上上签") {
            ssrBonus += 3;
            srBonus += 2;
          } else if (s.dailyFortune.sign === "上签") {
            ssrBonus += 1;
            srBonus += 1;
          } else if (s.dailyFortune.sign === "下签" || s.dailyFortune.sign === "下下签") {
            ssrBonus -= 1;
            srBonus -= 1;
          }
        }
        
        const gachaBuff = {
          ssrBonus: Math.max(0, ssrBonus),
          srBonus: Math.max(0, srBonus),
        };

        const pool = POOLS.find((p) => p.id === s.activePoolId) ?? POOLS[0]!;
        const { results, finalSR, finalSSR, finalUpGuarantee } = rollBatch(
          CARDS,
          pool,
          seed,
          count,
          () => ({
            sr: s.pullsSinceSR,
            ssr: Math.max(0, s.pullsSinceSSR - pityReduction),
            upGuarantee: s.ssrUpGuarantee,
          }),
          gachaBuff
        );

        set((st) => {
          const inv = { ...st.inventory };
          const stats = { ...st.stats };
          const ach = { ...st.achievements };
          const oldAchievements = { ...st.achievements };

          let ssrCount = 0;
          let srCount = 0;
          
          for (const pr of results) {
            inv[pr.card.id] = (inv[pr.card.id] ?? 0) + 1;
            stats.totalPulls += 1;
            if (pr.rarity === "SR") {
              stats.totalSr += 1;
              srCount++;
            }
            if (pr.rarity === "SSR") {
              stats.totalSsr += 1;
              if (pr.isUp) stats.totalUpSsr += 1;
              if (pr.wasPitySSR) stats.pitySsrTriggered = true;
              ssrCount++;
            }
          }
          
          if (ssrCount > stats.maxSsrsInSinglePull) stats.maxSsrsInSinglePull = ssrCount;
          if (srCount > stats.maxSrsInSinglePull) stats.maxSrsInSinglePull = srCount;

          const hist = [...st.history];
          for (const pr of results) {
            hist.unshift({
              id: `${Date.now()}-${pr.card.id}-${Math.random()}`,
              cardId: pr.card.id,
              rarity: pr.rarity,
              at: Date.now(),
            });
          }

          const tp = { ...st.taskProgress };
          tp.t_pull1 = (tp.t_pull1 ?? 0) + count;
          tp.t_pull10 = (tp.t_pull10 ?? 0) + count;
          const wtp = { ...st.weeklyTaskProgress };
          wtp.t_weekly_pull = (wtp.t_weekly_pull ?? 0) + count;
          for (const pr of results) {
            if (pr.rarity === "SSR") {
              wtp.t_weekly_ssr = (wtp.t_weekly_ssr ?? 0) + 1;
            }
          }

          ach.a_first = true;
          if (results.some((r) => r.rarity === "SSR")) ach.a_ssr = true;
          if (st.totalPulls + count >= 10) ach.a_10 = true;
          if (st.totalPulls + count >= 100) ach.a_100 = true;
          if (st.totalPulls + count >= 500) ach.a_500 = true;
          if (st.totalPulls + count >= 1000) ach.a_1000 = true;
          if (st.streak >= 30) ach.a_streak30 = true;
          if (st.streak >= 100) ach.a_streak100 = true;
          if (stats.totalSr >= 1) ach.a_sr_first = true;
          if (stats.totalSsr >= 5) ach.a_ssr_5 = true;
          if (stats.totalSsr >= 10) ach.a_ssr_10 = true;
          if (stats.totalSsr >= 20) ach.a_ssr_20 = true;
          if (stats.totalSsr >= 50) ach.a_ssr_50 = true;
          if (stats.totalUpSsr >= 1) ach.a_up_ssr = true;
          if (stats.maxSsrsInSinglePull >= 2) ach.a_double_ssr = true;
          if (stats.maxSsrsInSinglePull >= 3) ach.a_triple_ssr = true;
          if (stats.pitySsrTriggered) ach.a_pity_ssr = true;

          const ownedCount = Object.keys(inv).filter((id) => (inv[id] ?? 0) > 0).length;
          if (ownedCount >= CARDS.length / 2) ach.a_collection_half = true;
          if (ownedCount >= CARDS.length) ach.a_collection_full = true;

          // 检查新解锁的成就
          const newlyUnlocked = ACHIEVEMENTS.filter(a => ach[a.id] && !oldAchievements[a.id]);
          for (const achievement of newlyUnlocked) {
            get().triggerAchievementNotification(
              achievement.title,
              achievement.description,
              "🏆"
            );
          }

          const progress = CARDS.length > 0 ? ownedCount / CARDS.length : 0;
          const newClaimed = { ...st.collectionRewardsClaimed };
          let collectionReward = 0;
          for (const reward of COLLECTION_REWARDS) {
            if (!newClaimed[reward.id] && progress >= reward.threshold) {
              newClaimed[reward.id] = true;
              collectionReward += reward.reward;
            }
          }

          const gainedFate = count;
          const t = todayKey();
          let currentActive = { ...st.dailyActive };
          if (currentActive.date !== t) {
            currentActive = { date: t, points: 0, claimed: {} };
          }
          currentActive.points += 30;
          
          return {
            ...st,
            coins: st.coins - cost + collectionReward,
            pullsSinceSR: finalSR,
            pullsSinceSSR: finalSSR,
            ssrUpGuarantee: finalUpGuarantee,
            totalPulls: st.totalPulls + count,
            inventory: inv,
            history: hist.slice(0, 200),
            taskProgress: tp,
            weeklyTaskProgress: wtp,
            achievements: ach,
            stats,
            collectionRewardsClaimed: newClaimed,
            lastPullResults: results,
            pendingReveal: results,
            fatePoints: st.fatePoints + gainedFate,
            dailyActive: currentActive,
          };
        });

        void (async () => {
          const { hasSupabase } = await import("../backend/supabaseClient");
          if (!hasSupabase()) return;
          const { getOrCreateUserId } = await import("../backend/userId");
          const { postPull, pullResultsToRow } = await import("../backend/api");
          const userId = getOrCreateUserId();
          try {
            await postPull(pullResultsToRow(userId, s.activePoolId, results));
          } catch {
            // ignore for now
          }
        })();
        return results;
      },

      readDailyFortune: () => {
        const t = todayKey();
        set((s) => {
          let fortune = generateDailyFortune(t);
          if (s.wheelBuff?.id === "calm" && fortune.sign === "下下签") {
            fortune = { ...fortune, sign: "中签" };
          }
          const tp = { ...s.taskProgress };
          tp.t_fortune = 1;
          const wtp = { ...s.weeklyTaskProgress };
          wtp.t_weekly_fortune = (wtp.t_weekly_fortune ?? 0) + 1;
          const stats = { ...s.stats };
          stats.fortuneReadCount += 1;
          const ach = { ...s.achievements };
          if (stats.fortuneReadCount >= 30) ach.a_fortune_read = true;
          
          let currentActive = { ...s.dailyActive };
          if (currentActive.date !== t) {
            currentActive = { date: t, points: 0, claimed: {} };
          }
          currentActive.points += 15;
          
          return {
            ...s,
            dailyFortuneDate: t,
            dailyFortune: fortune,
            calmFortune: s.wheelBuff?.id === "calm",
            taskProgress: tp,
            weeklyTaskProgress: wtp,
            stats,
            achievements: ach,
            dailyActive: currentActive,
          };
        });
      },

      drawThreeCards: () => {
        const seed = hashString(`three-${todayKey()}-${Date.now()}`) >>> 0;
        const rng = createRng(seed);
        rng();
        const picks: string[] = [];
        const state = get();
        
        const ownedCardIds = Object.keys(state.inventory).filter((id) => (state.inventory[id] ?? 0) > 0);
        
        for (let i = 0; i < 3; i++) {
          let c;
          if (ownedCardIds.length > 0) {
            c = CARDS.find((card) => card.id === ownedCardIds[Math.floor(rng() * ownedCardIds.length)]);
          }
          if (!c) {
            c = CARDS[Math.floor(rng() * CARDS.length)];
          }
          if (c) picks.push(c.id);
        }
        
        set((s) => {
          const tp = { ...s.taskProgress };
          tp.t_three = 1;
          const wtp = { ...s.weeklyTaskProgress };
          wtp.t_weekly_three = (wtp.t_weekly_three ?? 0) + 1;
          const stats = { ...s.stats };
          stats.threeDrawCount += 1;
          const ach = { ...s.achievements };
          if (stats.threeDrawCount >= 30) ach.a_three_draw = true;
          
          const t = todayKey();
          let currentActive = { ...s.dailyActive };
          if (currentActive.date !== t) {
            currentActive = { date: t, points: 0, claimed: {} };
          }
          currentActive.points += 15;
          
          return { ...s, threeCardIds: picks, taskProgress: tp, weeklyTaskProgress: wtp, stats, achievements: ach, dailyActive: currentActive };
        });
      },

      claimWeeklyTask: (taskId: string) => {
        const wk = weekKey();
        const def = TASK_DEFS.find((d) => d.id === taskId);
        if (!def || def.type !== "weekly") return;
        set((s) => {
          let claimed = { ...s.weeklyTaskClaimed };
          if (s.weeklyTaskClaimedWeek !== wk) {
            claimed = {};
          }
          if (claimed[taskId]) return s;
          const prog = s.weeklyTaskProgress[taskId] ?? 0;
          if (prog < def.target) return s;
          const reward = Math.floor(def.reward * s.taskRewardMultiplier);
          let mult = s.taskRewardMultiplier;
          if (mult > 1) mult = 1;
          const stats = { ...s.stats };
          stats.taskCompletedCount += 1;
          const ach = { ...s.achievements };
          if (stats.taskCompletedCount >= 100) ach.a_task_master = true;
          return {
            ...s,
            coins: s.coins + reward,
            weeklyTaskClaimedWeek: wk,
            weeklyTaskClaimed: { ...claimed, [taskId]: true },
            taskRewardMultiplier: mult,
            stats,
            achievements: ach,
          };
        });
      },

      spinWheelAction: () => {
        const t = todayKey();
        const s0 = get();
        if (s0.wheelDate === t) return;
        const buff = spinWheel(t);
        set((s) => {
          const tp = { ...s.taskProgress };
          tp.t_wheel = 1;
          let freePulls = s.freePulls;
          let mult = s.taskRewardMultiplier;
          if (buff.id === "double_coin") mult = 1.5;
          if (buff.id === "wild") freePulls += 1;
          const stats = { ...s.stats };
          stats.wheelSpinCount += 1;
          const ach = { ...s.achievements };
          if (stats.wheelSpinCount >= 30) ach.a_wheel_spin = true;
          
          let currentActive = { ...s.dailyActive };
          if (currentActive.date !== t) {
            currentActive = { date: t, points: 0, claimed: {} };
          }
          currentActive.points += 15;
          
          return {
            ...s,
            wheelDate: t,
            wheelBuff: buff,
            taskRewardMultiplier: mult,
            freePulls,
            taskProgress: tp,
            stats,
            achievements: ach,
            dailyActive: currentActive,
          };
        });
      },

      claimTask: (taskId: string) => {
        const t = todayKey();
        const def = TASK_DEFS.find((d) => d.id === taskId);
        if (!def) return;
        const state = get();
        let claimed = { ...state.taskClaimed };
        if (state.taskClaimedDay !== t) {
          claimed = {};
        }
        if (claimed[taskId]) return;
        const prog = state.taskProgress[taskId] ?? 0;
        if (prog < def.target) return;
        const activityMultiplier = state.getCurrentMultiplier("coins");
        const reward = Math.floor(def.reward * state.taskRewardMultiplier * activityMultiplier);
        let mult = state.taskRewardMultiplier;
        if (mult > 1) mult = 1;
        const stats = { ...state.stats };
        stats.taskCompletedCount += 1;
        const ach = { ...state.achievements };
        if (stats.taskCompletedCount >= 100) ach.a_task_master = true;
        
        let currentActive = { ...state.dailyActive };
        if (currentActive.date !== t) {
          currentActive = { date: t, points: 0, claimed: {} };
        }
        currentActive.points += 20;
        
        set((s) => ({
          ...s,
          coins: s.coins + reward,
          taskClaimedDay: t,
          taskClaimed: { ...claimed, [taskId]: true },
          taskRewardMultiplier: mult,
          stats,
          achievements: ach,
          dailyActive: currentActive,
        }));
        
        get().triggerRewardAnimation("coins", reward);
      },

      advanceTutorial: () => {
        set((s) => {
          const nextStep = s.tutorialStep + 1;
          if (nextStep >= 6) {
            return { tutorialStep: nextStep, tutorialCompleted: true };
          }
          return { tutorialStep: nextStep };
        });
      },

      skipTutorial: () => {
        set({ tutorialCompleted: true, tutorialStep: 6 });
      },

      toggleCloudSave: () => {
        set((s) => ({ cloudSaveEnabled: !s.cloudSaveEnabled }));
      },

      setUsername: (name: string) => {
        set({ username: name.trim(), usernameSet: true });
      },

      purchaseFromAchievementShop: (itemId: string) => {
        const item = ACHIEVEMENT_SHOP_ITEMS.find((i) => i.id === itemId);
        if (!item) return { success: false, error: "商品不存在" };

        const state = get();
        const currentPoints = state.achievementPoints();

        if (currentPoints < item.cost) {
          return { success: false, error: "成就点数不足" };
        }

        set((s) => {
          let newAchievements = { ...s.achievements };
          let pointsToSpend = item.cost;
          const achievementList = [...ACHIEVEMENTS].sort((a, b) => b.points - a.points);

          for (const ach of achievementList) {
            if (pointsToSpend <= 0) break;
            if (newAchievements[ach.id]) {
              if (ach.points <= pointsToSpend) {
                delete newAchievements[ach.id];
                pointsToSpend -= ach.points;
              }
            }
          }

          let newCoins = s.coins;
          let newFreePulls = s.freePulls;

          if (item.type === "coins") {
            newCoins += item.value;
          } else if (item.type === "freePulls") {
            newFreePulls += item.value;
          }

          return {
            ...s,
            achievements: newAchievements,
            coins: newCoins,
            freePulls: newFreePulls,
            achievementShopPurchased: {
              ...s.achievementShopPurchased,
              [itemId]: (s.achievementShopPurchased[itemId] || 0) + 1,
            },
          };
        });

        return { success: true };
      },

      useDailyPrivilege: (privilegeId: string) => {
        const privilege = DAILY_PRIVILEGES.find((p) => p.id === privilegeId);
        if (!privilege) return { success: false, error: "特权不存在" };

        const state = get();
        const level = state.achievementLevel();
        const t = todayKey();

        if (level < privilege.requiredLevel) {
          return { success: false, error: `需要成就等级 ${privilege.requiredLevel}` };
        }

        let usage = state.dailyPrivilegeUsage;
        if (usage.date !== t) {
          usage = { date: t, used: {} };
        }

        if (usage.used[privilegeId]) {
          return { success: false, error: "今日已使用该特权" };
        }

        set((s) => {
          let newCoins = s.coins;
          let newFreePulls = s.freePulls;
          let newPullsSinceSSR = s.pullsSinceSSR;

          if (privilegeId === "priv_free_pull") {
            newFreePulls += 1;
          } else if (privilegeId === "priv_extra_coins") {
            newCoins += 50;
          } else if (privilegeId === "priv_pity_buff") {
            newPullsSinceSSR = Math.max(0, newPullsSinceSSR - 5);
          }

          return {
            ...s,
            coins: newCoins,
            freePulls: newFreePulls,
            pullsSinceSSR: newPullsSinceSSR,
            dailyPrivilegeUsage: {
              ...usage,
              used: { ...usage.used, [privilegeId]: true },
            },
          };
        });

        return { success: true };
      },

      getCurrentMultiplier: (type: "coins" | "task") => {
        const activity = getCurrentWeekendActivity();
        if (!activity) return 1;

        if (type === "coins" && activity.type === "double_coins") {
          return activity.multiplier;
        }
        if (type === "task" && activity.type === "double_task") {
          return activity.multiplier;
        }
        return 1;
      },

      createDeck: (name: string) => {
        const deckId = "deck_" + Date.now();
        set((s) => ({
          ...s,
          decks: {
            ...s.decks,
            [deckId]: {
              id: deckId,
              name: name.trim(),
              cardIds: [],
            },
          },
        }));
        return { success: true, deckId };
      },

      deleteDeck: (deckId: string) => {
        const state = get();
        if (!state.decks[deckId]) {
          return { success: false, error: "卡组不存在" };
        }
        set((s) => {
          const newDecks = { ...s.decks };
          delete newDecks[deckId];
          return {
            ...s,
            decks: newDecks,
            activeDeck: s.activeDeck === deckId ? null : s.activeDeck,
          };
        });
        return { success: true };
      },

      addCardToDeck: (deckId: string, cardId: string) => {
        const state = get();
        const deck = state.decks[deckId];
        if (!deck) {
          return { success: false, error: "卡组不存在" };
        }
        if ((state.inventory[cardId] ?? 0) <= 0) {
          return { success: false, error: "未拥有该卡牌" };
        }
        if (deck.cardIds.length >= 5) {
          return { success: false, error: "卡组最多 5 张卡牌" };
        }
        if (deck.cardIds.includes(cardId)) {
          return { success: false, error: "已在卡组中" };
        }
        set((s) => ({
          ...s,
          decks: {
            ...s.decks,
            [deckId]: {
              ...deck,
              cardIds: [...deck.cardIds, cardId],
            },
          },
        }));
        return { success: true };
      },

      removeCardFromDeck: (deckId: string, cardId: string) => {
        const state = get();
        const deck = state.decks[deckId];
        if (!deck) {
          return { success: false, error: "卡组不存在" };
        }
        set((s) => ({
          ...s,
          decks: {
            ...s.decks,
            [deckId]: {
              ...deck,
              cardIds: deck.cardIds.filter((id: string) => id !== cardId),
            },
          },
        }));
        return { success: true };
      },

      setActiveDeck: (deckId: string | null) => {
        set({ activeDeck: deckId });
      },

      upgradeCard: (cardId: string) => {
        const state = get();
        if ((state.inventory[cardId] ?? 0) <= 0) {
          return { success: false, error: "未拥有该卡牌" };
        }
        const currentLevel = state.cardLevels[cardId] ?? 1;
        if (currentLevel >= 10) {
          return { success: false, error: "已达到最高等级" };
        }
        const cost = currentLevel * 100;
        if (state.coins < cost) {
          return { success: false, error: "灵石不足" };
        }
        set((s) => ({
          ...s,
          coins: s.coins - cost,
          cardLevels: {
            ...s.cardLevels,
            [cardId]: currentLevel + 1,
          },
        }));
        return { success: true };
      },

      getDeckCardSkills: () => {
        const state = get();
        const skills: CardSkill[] = [];
        if (!state.activeDeck) return skills;
        
        const deck = state.decks[state.activeDeck];
        if (!deck) return skills;
        
        deck.cardIds.forEach((cardId: string) => {
          const card = state.cardById(cardId);
          if (!card) return;
          
          const level = state.cardLevels[cardId] ?? 1;
          const breakthrough = state.cardBreakthroughs[cardId] ?? 0;
          let bonusMultiplier = 1;
          if (breakthrough >= 1) bonusMultiplier += 0.1;
          if (breakthrough >= 2) bonusMultiplier += 0.1;
          if (breakthrough >= 3) bonusMultiplier += 0.15;
          
          if (card.rarity === "SSR") {
            skills.push({
              id: `skill_${cardId}`,
              name: `${card.name}的祝福`,
              description: "SSR 卡牌技能：略微提升运气",
              effect: "increase_luck",
              value: Math.floor((5 + level * 2) * bonusMultiplier),
            });
          } else if (card.rarity === "SR") {
            skills.push({
              id: `skill_${cardId}`,
              name: `${card.name}的庇佑`,
              description: "SR 卡牌技能：减少保底进度",
              effect: "decrease_pity",
              value: Math.floor(Math.floor(level / 2) * bonusMultiplier),
            });
          }
        });
        return skills;
      },

      breakthroughCard: (cardId: string) => {
        const state = get();
        const owned = state.inventory[cardId] ?? 0;
        if (owned <= 0) return { success: false, error: "未拥有该卡牌" };
        
        const currentLevel = state.cardBreakthroughs[cardId] ?? 0;
        if (currentLevel >= BREAKTHROUGH_LEVELS.length) {
          return { success: false, error: "已达到最高突破等级" };
        }
        
        const req = BREAKTHROUGH_LEVELS[currentLevel]!;
        if (owned < req.requiredCards) {
          return { success: false, error: `需要 ${req.requiredCards} 张相同卡牌` };
        }
        if (state.coins < req.requiredCoins) {
          return { success: false, error: "灵石不足" };
        }
        
        set((s) => ({
          ...s,
          coins: s.coins - req.requiredCoins,
          inventory: { ...s.inventory, [cardId]: owned - req.requiredCards + 1 },
          cardBreakthroughs: { ...s.cardBreakthroughs, [cardId]: currentLevel + 1 },
        }));
        
        get().triggerRewardAnimation("level", currentLevel + 1);
        
        return { success: true };
      },

      getElementAdvantage: (element: Element) => {
        return ELEMENT_ADVANTAGE[element] || { strong: [], weak: [] };
      },

      getSetBonuses: () => {
        const state = get();
        const result: Array<{ setName: string; bonus: string; effect: string; value: number }> = [];
        const inventory = state.inventory;
        
        for (const set of CARD_SETS) {
          const ownedCount = set.cardIds.filter((id) => (inventory[id] ?? 0) > 0).length;
          for (const bonus of set.bonuses) {
            if (ownedCount >= bonus.count) {
              result.push({
                setName: set.name,
                bonus: bonus.description,
                effect: bonus.effect,
                value: bonus.value,
              });
            }
          }
        }
        
        return result;
      },

      triggerRewardAnimation: (type: "coins" | "card" | "achievement" | "level", amount: number) => {
        const state = get();
        if (!state.tutorialCompleted) return;
        set({ rewardAnimation: { visible: true, type, amount } });
      },

      dismissRewardAnimation: () => {
        set({ rewardAnimation: null });
      },

      triggerAchievementNotification: (title, message, icon) => {
        set({ 
          achievementNotification: { 
            visible: true, 
            title, 
            message, 
            icon 
          } 
        });
      },

      dismissAchievementNotification: () => {
        set({ 
          achievementNotification: { 
            ...get().achievementNotification, 
            visible: false 
          } 
        });
      },

      showSmartTip: (tipType) => {
        const state = get();
        const key = `hasSeen${tipType.charAt(0).toUpperCase() + tipType.slice(1)}Tip` as keyof typeof state.smartTips;
        if (state.smartTips[key]) return false;
        
        set((s) => ({
          smartTips: {
            ...s.smartTips,
            [key]: true,
            lastTipShown: tipType,
          }
        }));
        return true;
      },

      setLoading: (isLoading, message = "") => {
        set({ isLoading, loadingMessage: message });
      },

      saveToCloud: async () => {
        try {
          const { hasSupabase } = await import("../backend/supabaseClient");
          if (!hasSupabase()) {
            return { success: false, error: "Supabase 未配置，请检查环境变量" };
          }

          const { getOrCreateUserId } = await import("../backend/userId");
          const { saveGameSave, syncInventoryToCloud } = await import("../backend/api");
          const userId = getOrCreateUserId();
          const state = get();

          const saveData = {
            saveVersion: state.saveVersion,
            coins: state.coins,
            activePoolId: state.activePoolId,
            ssrUpGuarantee: state.ssrUpGuarantee,
            fatePoints: state.fatePoints,
            pullsSinceSR: state.pullsSinceSR,
            pullsSinceSSR: state.pullsSinceSSR,
            totalPulls: state.totalPulls,
            inventory: state.inventory,
            lastLoginDate: state.lastLoginDate,
            streak: state.streak,
            dailyFortuneDate: state.dailyFortuneDate,
            dailyFortune: state.dailyFortune,
            threeCardIds: state.threeCardIds,
            wheelDate: state.wheelDate,
            wheelBuff: state.wheelBuff,
            taskRewardMultiplier: state.taskRewardMultiplier,
            freePulls: state.freePulls,
            calmFortune: state.calmFortune,
            taskProgress: state.taskProgress,
            taskClaimedDay: state.taskClaimedDay,
            taskClaimed: state.taskClaimed,
            weeklyTaskProgress: state.weeklyTaskProgress,
            weeklyTaskClaimedWeek: state.weeklyTaskClaimedWeek,
            weeklyTaskClaimed: state.weeklyTaskClaimed,
            collectionRewardsClaimed: state.collectionRewardsClaimed,
            achievementLevelRewardsClaimed: state.achievementLevelRewardsClaimed,
            dailyActive: state.dailyActive,
            achievements: state.achievements,
            history: state.history,
            settings: state.settings,
            stats: state.stats,
            checkInDate: state.checkInDate,
            checkInStreak: state.checkInStreak,
            totalCheckIns: state.totalCheckIns,
            tutorialStep: state.tutorialStep,
            tutorialCompleted: state.tutorialCompleted,
          };

          await saveGameSave(userId, saveData);
          await syncInventoryToCloud(userId, state.inventory);

          set({
            cloudLastSavedAt: new Date().toISOString(),
          });

          return { success: true };
        } catch (error) {
          console.error("保存到云端失败:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
          };
        }
      },

      loadFromCloud: async () => {
        try {
          const { hasSupabase } = await import("../backend/supabaseClient");
          if (!hasSupabase()) {
            return { success: false, error: "Supabase 未配置，请检查环境变量" };
          }

          const { getOrCreateUserId } = await import("../backend/userId");
          const { fetchGameSave } = await import("../backend/api");
          const userId = getOrCreateUserId();

          const cloudSave = await fetchGameSave(userId);

          if (!cloudSave) {
            return { success: true, hasData: false };
          }

          set((s) => ({
            ...s,
            ...cloudSave.save_data,
            cloudLastSyncedAt: new Date().toISOString(),
          }));

          return { success: true, hasData: true };
        } catch (error) {
          console.error("从云端加载失败:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
            hasData: false,
          };
        }
      },
    }),
    {
      name: "web-fortune-game-save",
      version: SAVE_VERSION,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          useGameStore.getState().tickDailyLogin();
        });
      },
      partialize: (s) => ({
        saveVersion: s.saveVersion,
        coins: s.coins,
        activePoolId: s.activePoolId,
        ssrUpGuarantee: s.ssrUpGuarantee,
        fatePoints: s.fatePoints,
        pullsSinceSR: s.pullsSinceSR,
        pullsSinceSSR: s.pullsSinceSSR,
        totalPulls: s.totalPulls,
        inventory: s.inventory,
        lastLoginDate: s.lastLoginDate,
        streak: s.streak,
        dailyFortuneDate: s.dailyFortuneDate,
        dailyFortune: s.dailyFortune,
        threeCardIds: s.threeCardIds,
        wheelDate: s.wheelDate,
        wheelBuff: s.wheelBuff,
        taskRewardMultiplier: s.taskRewardMultiplier,
        freePulls: s.freePulls,
        calmFortune: s.calmFortune,
        taskProgress: s.taskProgress,
        taskClaimedDay: s.taskClaimedDay,
        taskClaimed: s.taskClaimed,
        weeklyTaskProgress: s.weeklyTaskProgress,
        weeklyTaskClaimedWeek: s.weeklyTaskClaimedWeek,
        weeklyTaskClaimed: s.weeklyTaskClaimed,
        collectionRewardsClaimed: s.collectionRewardsClaimed,
        achievementLevelRewardsClaimed: s.achievementLevelRewardsClaimed,
        dailyActive: s.dailyActive,
        achievements: s.achievements,
        history: s.history,
        settings: s.settings,
        stats: s.stats,
        checkInDate: s.checkInDate,
        checkInStreak: s.checkInStreak,
        totalCheckIns: s.totalCheckIns,
        tutorialStep: s.tutorialStep,
        tutorialCompleted: s.tutorialCompleted,
        smartTips: s.smartTips,
        cloudSaveEnabled: s.cloudSaveEnabled,
        cloudLastSavedAt: s.cloudLastSavedAt,
        cloudLastSyncedAt: s.cloudLastSyncedAt,
        username: s.username,
        usernameSet: s.usernameSet,
        achievementShopPurchased: s.achievementShopPurchased,
        dailyPrivilegeUsage: s.dailyPrivilegeUsage,
        activeDeck: s.activeDeck,
        decks: s.decks,
        cardLevels: s.cardLevels,
      }),
    }
  )
);

export { CARDS, TASK_DEFS, ACHIEVEMENTS, COLLECTION_REWARDS };
