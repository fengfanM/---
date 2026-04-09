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
} from "../types";
import { rollBatch } from "../features/gacha/gachaEngine";
import { generateDailyFortune } from "../features/divination/fortuneTemplates";
import { spinWheel } from "../features/divination/wheel";
import { createRng, hashString } from "../lib/rng";

const SAVE_VERSION = 1;
const CARDS = cardsJson as CardDef[];
const POOLS = poolsJson as PoolDef[];

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
  { id: "t_pull1", title: "进行一次卜问", target: 1, reward: 15, type: "daily" },
  { id: "t_pull10", title: "进行十次卜问", target: 10, reward: 30, type: "daily" },
  { id: "t_fortune", title: "查看今日运势", target: 1, reward: 20, type: "daily" },
  { id: "t_three", title: "完成一次三牌阵", target: 1, reward: 25, type: "daily" },
  { id: "t_wheel", title: "转动命运轮盘", target: 1, reward: 10, type: "daily" },
  { id: "t_weekly_pull", title: "本周完成 50 次抽卡", target: 50, reward: 150, type: "weekly" },
  { id: "t_weekly_ssr", title: "本周获得 1 张 SSR", target: 1, reward: 100, type: "weekly" },
  { id: "t_weekly_fortune", title: "本周查看 5 次每日运势", target: 5, reward: 80, type: "weekly" },
  { id: "t_weekly_three", title: "本周完成 3 次三牌阵", target: 3, reward: 70, type: "weekly" },
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
> {
  return {
    saveVersion: SAVE_VERSION,
    coins: 50000,
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

        const reward = Math.min(50 + (streak - 1) * 10, 200);

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
        const gachaBuff =
          wb && (wb.srBonus > 0 || wb.ssrBonus > 0)
            ? { srBonus: wb.srBonus, ssrBonus: wb.ssrBonus }
            : null;

        const pool = POOLS.find((p) => p.id === s.activePoolId) ?? POOLS[0]!;
        const { results, finalSR, finalSSR, finalUpGuarantee } = rollBatch(
          CARDS,
          pool,
          seed,
          1,
          () => ({
            sr: s.pullsSinceSR,
            ssr: s.pullsSinceSSR,
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
        const baseCost = 90;
        const wild = s.wheelBuff?.id === "wild";
        const cost = wild ? baseCost - 10 : baseCost;
        if (s.coins < cost) return null;

        const count = wild ? 11 : 10;
        const seed =
          (hashString(`ten-${Date.now()}-${Math.random()}`) ^ s.totalPulls) >>>
          0;
        const wb = s.wheelBuff;
        const gachaBuff =
          wb && (wb.srBonus > 0 || wb.ssrBonus > 0)
            ? { srBonus: wb.srBonus, ssrBonus: wb.ssrBonus }
            : null;

        const pool = POOLS.find((p) => p.id === s.activePoolId) ?? POOLS[0]!;
        const { results, finalSR, finalSSR, finalUpGuarantee } = rollBatch(
          CARDS,
          pool,
          seed,
          count,
          () => ({
            sr: s.pullsSinceSR,
            ssr: s.pullsSinceSSR,
            upGuarantee: s.ssrUpGuarantee,
          }),
          gachaBuff
        );

        set((st) => {
          const inv = { ...st.inventory };
          const stats = { ...st.stats };
          const ach = { ...st.achievements };

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
        for (let i = 0; i < 3; i++) {
          const c = CARDS[Math.floor(rng() * CARDS.length)];
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
        set((s) => {
          let claimed = { ...s.taskClaimed };
          if (s.taskClaimedDay !== t) {
            claimed = {};
          }
          if (claimed[taskId]) return s;
          const prog = s.taskProgress[taskId] ?? 0;
          if (prog < def.target) return s;
          const reward = Math.floor(def.reward * s.taskRewardMultiplier);
          let mult = s.taskRewardMultiplier;
          if (mult > 1) mult = 1;
          const stats = { ...s.stats };
          stats.taskCompletedCount += 1;
          const ach = { ...s.achievements };
          if (stats.taskCompletedCount >= 100) ach.a_task_master = true;
          
          let currentActive = { ...s.dailyActive };
          if (currentActive.date !== t) {
            currentActive = { date: t, points: 0, claimed: {} };
          }
          currentActive.points += 20;
          
          return {
            ...s,
            coins: s.coins + reward,
            taskClaimedDay: t,
            taskClaimed: { ...claimed, [taskId]: true },
            taskRewardMultiplier: mult,
            stats,
            achievements: ach,
            dailyActive: currentActive,
          };
        });
      },
    }),
    {
      name: "web-fortune-game-save",
      version: SAVE_VERSION,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          useGameStore.getState().tickDailyLogin();
          const s = useGameStore.getState();
          if (s.coins < 50000) useGameStore.setState({ coins: 50000 });
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
      }),
    }
  )
);

export { CARDS, TASK_DEFS, ACHIEVEMENTS, COLLECTION_REWARDS };
