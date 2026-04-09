import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import {
  useGameStore,
  TASK_DEFS,
  ACHIEVEMENTS,
  COLLECTION_REWARDS,
  todayKey,
  weekKey,
  CARDS,
  DAILY_ACTIVE_REWARDS,
  ACHIEVEMENT_SHOP_ITEMS,
  DAILY_PRIVILEGES,
} from "./store/gameStore";
import type { TabId } from "./types";
import { threeCardNarrative } from "./features/divination/fortuneTemplates";
import type { PullResult } from "./types";
import { GachaScenePixi, type GachaPhase } from "./features/gacha/GachaScenePixi";
import { CardReveal } from "./features/gacha/CardReveal";
import poolsJson from "./data/pools.json";
import type { PoolDef } from "./types";
import { getOrCreateUserId } from "./backend/userId";
import { hasSupabase } from "./backend/supabaseClient";
import { fetchHistory as fetchHistoryApi } from "./backend/api";
import { cardFrontUrl, ensureAudio, playSfx, portraitUrlForId, talismanUrl } from "./lib/gameAssets";
import { ACHIEVEMENT_LEVEL_REWARDS } from "./store/gameStore";
import { PortraitWorkshop } from "./features/portraits/PortraitWorkshop";

function rarityClass(r: string): string {
  if (r === "SSR") return "rarity-ssr";
  if (r === "SR") return "rarity-sr";
  if (r === "R") return "rarity-r";
  return "rarity-n";
}

function rarityTierClass(r: string): string {
  if (r === "SSR") return "tier-ssr";
  if (r === "SR") return "tier-sr";
  if (r === "R") return "tier-r";
  return "tier-n";
}

function Tutorial() {
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const tutorialCompleted = useGameStore((s) => s.tutorialCompleted);
  const advanceTutorial = useGameStore((s) => s.advanceTutorial);
  const skipTutorial = useGameStore((s) => s.skipTutorial);
  const checkIn = useGameStore((s) => s.checkIn);
  const checkInDate = useGameStore((s) => s.checkInDate);
  const username = useGameStore((s) => s.username);
  const t = todayKey();

  if (tutorialCompleted) return null;

  const tutorialSteps = [
    {
      title: `欢迎${username ? `，${username}` : "来到阴阳寮"}`,
      content: "让我带你熟悉一下游戏的基本操作吧！",
      buttonText: "好的",
      highlight: null,
    },
    {
      title: "每日签到",
      content: "点击下方的「立即签到」按钮，领取今日的灵石奖励！连续签到还有额外加成哦～",
      buttonText: "继续",
      highlight: "checkin-button",
      action: () => {
        if (checkInDate !== t) checkIn();
      },
    },
    {
      title: "抽卡祈愿",
      content: "点击「祈愿」tab，试试你的手气！单抽10灵石，十连80灵石更划算～",
      buttonText: "继续",
      highlight: "tab-gacha",
    },
    {
      title: "试试抽卡",
      content: "点击「单抽」或「十连」按钮，看看你能抽到什么式神！",
      buttonText: "继续",
      highlight: "gacha-ten",
    },
    {
      title: "每日运势",
      content: "点击「占卜」tab，查看今日运势，还能抽三牌阵了解运程哦～",
      buttonText: "继续",
      highlight: "tab-fortune",
    },
    {
      title: "准备就绪！",
      content: "太棒了！你已经掌握了基本玩法，现在开始你的阴阳寮之旅吧！",
      buttonText: "开启旅程",
      highlight: null,
    },
  ];

  const currentStep = tutorialSteps[tutorialStep];
  if (!currentStep) return null;

  const handleClick = () => {
    if (currentStep.action) {
      currentStep.action();
    }
    advanceTutorial();
  };

  return (
    <>
      <div className="modal-backdrop" role="dialog" aria-modal="true" style={{ background: "transparent", pointerEvents: "none", zIndex: 9995 }}>
        <div className="modal tutorial-modal" style={{ pointerEvents: "auto", zIndex: 9996 }}>
          <div className="tutorial-progress">
            {tutorialSteps.map((_, i) => (
              <div
                key={i}
                className={`tutorial-dot ${i <= tutorialStep ? "active" : ""}`}
              />
            ))}
          </div>
          <h2 className="tutorial-title">{currentStep.title}</h2>
          <p className="tutorial-content">{currentStep.content}</p>
          <div className="tutorial-buttons">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={skipTutorial}
            >
              跳过
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleClick}
            >
              {currentStep.buttonText}
            </button>
          </div>
        </div>
      </div>
      {currentStep.highlight && <HighlightOverlay target={currentStep.highlight} />}
    </>
  );
}

function HighlightOverlay({ target }: { target: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    
    const updateRect = () => {
      const el = document.querySelector(`[data-highlight-target="${target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(new DOMRect(
          r.left - 8,
          r.top - 8,
          r.width + 16,
          r.height + 16
        ));
      } else {
        setRect(null);
      }
    };

    updateRect();
    
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateRect);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect);
    
    const tabObserver = new MutationObserver(updateRect);
    const nav = document.querySelector('.tabs');
    if (nav) {
      tabObserver.observe(nav, { childList: true, subtree: true, attributes: true });
    }

    return () => {
      observer.disconnect();
      tabObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [target]);

  if (!rect) return null;

  const path = `
    M 0 0
    H ${window.innerWidth}
    V ${window.innerHeight}
    H 0
    Z
    M ${rect.left} ${rect.top}
    h ${rect.width}
    v ${rect.height}
    h -${rect.width}
    Z
  `;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9990,
      pointerEvents: "none",
    }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path
          d={path}
          fill="rgba(0,0,0,0.7)"
          style={{ pointerEvents: "none" }}
        />
      </svg>
      <div style={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        border: "3px solid #ffd700",
        borderRadius: "12px",
        boxShadow: "0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 215, 0, 0.3)",
        animation: "pulse 1s ease-in-out infinite",
        pointerEvents: "none",
      }}>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 215, 0, 0.3);
          }
          50% {
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.9), inset 0 0 30px rgba(255, 215, 0, 0.5);
          }
        }
      `}</style>
    </div>
  );
}

function PullModal({
  results,
  onClose,
}: {
  results: PullResult[];
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);
  const [sharing, setSharing] = useState(false);
  const artCacheRef = useRef<Map<string, string>>(new Map());
  const activePoolId = useGameStore((s) => s.activePoolId);
  const pools = poolsJson as PoolDef[];
  const activePool = pools.find((p: PoolDef) => p.id === activePoolId) ?? pools[0];
  const triggerRewardAnimation = useGameStore((s) => s.triggerRewardAnimation);
  const tutorialCompleted = useGameStore((s) => s.tutorialCompleted);
  
  useEffect(() => {
    if (!tutorialCompleted) return;
    
    const ssrCount = results.filter((r) => r.rarity === "SSR").length;
    const srCount = results.filter((r) => r.rarity === "SR").length;
    
    if (ssrCount > 0) {
      triggerRewardAnimation("card", ssrCount);
    } else if (srCount > 0) {
      triggerRewardAnimation("card", srCount);
    } else if (results.length > 0) {
      triggerRewardAnimation("card", results.length);
    }
  }, []);

  const getArt = (r: PullResult) => {
    const id = r.card.id;
    const cached = artCacheRef.current.get(id);
    if (cached) return cached;
    const url =
      portraitUrlForId(r.card.id) ??
      cardFrontUrl({
        id: r.card.id,
        name: r.card.name,
        rarity: r.rarity,
        element: r.card.element,
        keywords: r.card.keywords,
      });
    artCacheRef.current.set(id, url);
    return url;
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const { shareContent } = await import("./utils/share");
      const shareData = {
        title: `🎴 天机抽卡 - ${activePool.name}`,
        text: (() => {
          const ssrCount = results.filter((r) => r.rarity === "SSR").length;
          const srCount = results.filter((r) => r.rarity === "SR").length;

          let resultText = "";
          if (results.length === 1) {
            resultText = `抽到了「${results[0].card.name}」(${results[0].rarity})！`;
          } else {
            resultText = `获得 ${ssrCount} 张 SSR，${srCount} 张 SR！`;
            if (results.length > 0) {
              const topCards = results.slice(0, 3).map((r) => r.card.name).join("、");
              resultText += ` 包含：${topCards}${results.length > 3 ? "…" : ""}`;
            }
          }

          return `【${activePool.name}】
${resultText}

来「天机抽卡」一起探索命运吧！`;
        })(),
      };
      await shareContent(shareData);
    } catch (error) {
      console.error("分享失败:", error);
    } finally {
      setSharing(false);
    }
  };

  const cur = results[active];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal modal-wide">
        <h2 style={{ marginTop: 0 }}>获卡</h2>

        <div className="pull-layout">
          <div className="pull-grid pull-grid2">
            {results.map((r, i) => {
              const hasPortrait = !!portraitUrlForId(r.card.id);
              return (
                <button
                  key={`${r.card.id}-${i}`}
                  type="button"
                  className={`pull-item ${i === active ? "active" : ""}`}
                  onClick={() => setActive(i)}
                >
                  <div
                    className={`pull-thumb ${hasPortrait ? "has-portrait" : ""} ${rarityTierClass(r.rarity)}`}
                    style={{ backgroundImage: `url("${getArt(r)}")` }}
                  />
                  <div className="pull-info">
                    <div className="pull-row1">
                      <span className={`pull-rarity ${rarityClass(r.rarity)}`}>{r.rarity}</span>
                      <span className="pull-name">{r.card.name}</span>
                    </div>
                    <div className="pull-row2">
                      <span className="pull-elem">{r.card.element}</span>
                      {r.card.keywords.slice(0, 2).map((k) => (
                        <span key={k} className="pull-skill">
                          {k}
                        </span>
                      ))}
                      {r.wasPitySSR && <span className="pull-flag">保底SSR</span>}
                      {r.wasPitySR && !r.wasPitySSR && <span className="pull-flag">保底SR+</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {cur && (
            <div className="pull-detail">
              <div
                className={`pull-detail-art ${portraitUrlForId(cur.card.id) ? "has-portrait" : ""} ${rarityTierClass(cur.rarity)}`}
                style={{ backgroundImage: `url("${getArt(cur)}")` }}
              />
              <div className="pull-detail-meta">
                <div className="pull-detail-title">
                  <span className={`pull-rarity ${rarityClass(cur.rarity)}`}>{cur.rarity}</span>
                  <span className="pull-name">{cur.card.name}</span>
                </div>
                <div className="pull-detail-sub">
                  <span className="pull-elem">{cur.card.element}</span>
                  <span className="pull-detail-sep">·</span>
                  <span>{cur.card.keywords.join(" · ")}</span>
                </div>
                <div className="pull-skills">
                  <div className="skill-card">
                    <div className="skill-ico" aria-hidden>
                      技
                    </div>
                    <div>
                      <div className="skill-name">技能</div>
                      <div className="skill-desc">{cur.card.keywords[0]}：触发时获得额外好运。</div>
                    </div>
                  </div>
                  <div className="skill-card">
                    <div className="skill-ico" aria-hidden>
                      奥
                    </div>
                    <div>
                      <div className="skill-name">奥义</div>
                      <div className="skill-desc">{cur.card.keywords[1]}：在关键时刻扭转局势。</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="btn-row" style={{ marginTop: "1rem" }}>
          <button type="button" className="btn btn-paper" onClick={handleShare} disabled={sharing}>
            {sharing ? "分享中…" : "🔗 分享"}
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            收下
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<
    { when: string; poolId: string; lines: string[] }[]
  >([]);
  const lastSyncError = useGameStore((s) => s.lastSyncError);
  const history = useGameStore((s) => s.history);
  const stats = useGameStore((s) => s.stats);
  const inventory = useGameStore((s) => s.inventory);

  if (!open) return null;

  const load = async () => {
    if (!hasSupabase()) return;
    setLoading(true);
    try {
      const uid = getOrCreateUserId();
      const rows = await fetchHistoryApi(uid, 20);
      setItems(
        rows.map((r) => ({
          when: new Date(r.created_at).toLocaleString(),
          poolId: r.pool_id,
          lines: r.results.map((x) => `${x.rarity}${x.is_up ? "·UP" : ""} ${x.card_id}`),
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const totalPulls = stats.totalPulls;
  const totalSsr = stats.totalSsr;
  const totalSr = stats.totalSr;
  const totalR = history.filter((h) => h.rarity === "R").length;
  const totalN = history.filter((h) => h.rarity === "N").length;

  const ssrRate = totalPulls > 0 ? (totalSsr / totalPulls) * 100 : 0;
  const srRate = totalPulls > 0 ? (totalSr / totalPulls) * 100 : 0;
  const rRate = totalPulls > 0 ? (totalR / totalPulls) * 100 : 0;
  const nRate = totalPulls > 0 ? (totalN / totalPulls) * 100 : 0;

  const ownedCount = Object.keys(inventory).filter((id) => (inventory[id] ?? 0) > 0).length;

  const lastSSRIndex = history.findIndex((h) => h.rarity === "SSR");
  const sinceLastSSR = lastSSRIndex === -1 ? totalPulls : lastSSRIndex;

  const lastSRIndex = history.findIndex((h) => h.rarity === "SR");
  const sinceLastSR = lastSRIndex === -1 ? totalPulls : lastSRIndex;

  const localHistory = history.slice(0, 50);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal modal-wide">
        <h2 style={{ marginTop: 0 }}>📊 抽卡分析与历史</h2>
        
        <div style={{ marginBottom: "1.2rem" }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(2, 1fr)", 
            gap: "0.75rem",
            marginBottom: "1rem"
          }}>
            <div style={{ 
              padding: "0.8rem", 
              background: "var(--bg-2)", 
              borderRadius: "0.6rem", 
              border: "1px solid var(--border)" 
            }}>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.3rem" }}>总抽卡次数</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, fontFamily: "\"JetBrains Mono\", monospace" }}>
                {totalPulls}
              </div>
            </div>
            <div style={{ 
              padding: "0.8rem", 
              background: "linear-gradient(135deg, rgba(216,178,93,0.15), rgba(216,178,93,0.05))", 
              borderRadius: "0.6rem", 
              border: "1px solid rgba(216,178,93,0.35)" 
            }}>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.3rem" }}>SSR 获得</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#d8b25d", fontFamily: "\"JetBrains Mono\", monospace" }}>
                {totalSsr}
              </div>
            </div>
            <div style={{ 
              padding: "0.8rem", 
              background: "linear-gradient(135deg, rgba(147,112,219,0.15), rgba(147,112,219,0.05))", 
              borderRadius: "0.6rem", 
              border: "1px solid rgba(147,112,219,0.35)" 
            }}>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.3rem" }}>SR 获得</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#9370db", fontFamily: "\"JetBrains Mono\", monospace" }}>
                {totalSr}
              </div>
            </div>
            <div style={{ 
              padding: "0.8rem", 
              background: "var(--bg-2)", 
              borderRadius: "0.6rem", 
              border: "1px solid var(--border)" 
            }}>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.3rem" }}>图鉴收集</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, fontFamily: "\"JetBrains Mono\", monospace" }}>
                {ownedCount}/{CARDS.length}
              </div>
            </div>
          </div>

          <div style={{ 
            padding: "0.8rem", 
            background: "var(--bg-2)", 
            borderRadius: "0.6rem", 
            border: "1px solid var(--border)",
            marginBottom: "0.8rem"
          }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.6rem", color: "var(--text)" }}>概率统计</div>
            
            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem", gap: "0.6rem" }}>
              <div style={{ width: "60px", fontSize: "0.82rem", color: "var(--muted)" }}>SSR</div>
              <div style={{ flex: 1, height: "12px", background: "rgba(216,178,93,0.15)", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(ssrRate * 10, 100)}%`, height: "100%", background: "linear-gradient(90deg, #d8b25d, #f0d78c)", borderRadius: "6px" }} />
              </div>
              <div style={{ width: "70px", textAlign: "right", fontFamily: "\"JetBrains Mono\", monospace", fontSize: "0.8rem", color: "#d8b25d" }}>
                {ssrRate.toFixed(1)}%
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem", gap: "0.6rem" }}>
              <div style={{ width: "60px", fontSize: "0.82rem", color: "var(--muted)" }}>SR</div>
              <div style={{ flex: 1, height: "12px", background: "rgba(147,112,219,0.15)", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(srRate * 2.5, 100)}%`, height: "100%", background: "linear-gradient(90deg, #9370db, #b495e8)", borderRadius: "6px" }} />
              </div>
              <div style={{ width: "70px", textAlign: "right", fontFamily: "\"JetBrains Mono\", monospace", fontSize: "0.8rem", color: "#9370db" }}>
                {srRate.toFixed(1)}%
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem", gap: "0.6rem" }}>
              <div style={{ width: "60px", fontSize: "0.82rem", color: "var(--muted)" }}>R</div>
              <div style={{ flex: 1, height: "12px", background: "rgba(100,200,255,0.15)", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ width: `${rRate}%`, height: "100%", background: "linear-gradient(90deg, #64c8ff, #96dfff)", borderRadius: "6px" }} />
              </div>
              <div style={{ width: "70px", textAlign: "right", fontFamily: "\"JetBrains Mono\", monospace", fontSize: "0.8rem", color: "#64c8ff" }}>
                {rRate.toFixed(1)}%
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ width: "60px", fontSize: "0.82rem", color: "var(--muted)" }}>N</div>
              <div style={{ flex: 1, height: "12px", background: "rgba(150,150,150,0.15)", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ width: `${nRate}%`, height: "100%", background: "linear-gradient(90deg, #969696, #c0c0c0)", borderRadius: "6px" }} />
              </div>
              <div style={{ width: "70px", textAlign: "right", fontFamily: "\"JetBrains Mono\", monospace", fontSize: "0.8rem", color: "#969696" }}>
                {nRate.toFixed(1)}%
              </div>
            </div>
          </div>

          <div style={{ 
            padding: "0.8rem", 
            background: sinceLastSSR >= 50 ? "linear-gradient(135deg, rgba(255,107,107,0.15), rgba(255,107,107,0.05))" : "var(--bg-2)", 
            borderRadius: "0.6rem", 
            border: sinceLastSSR >= 50 ? "1px solid rgba(255,107,107,0.35)" : "1px solid var(--border)"
          }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text)" }}>当前进度</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
              <div>
                <span style={{ color: "var(--muted)" }}>距上次 SSR：</span>
                <span style={{ 
                  marginLeft: "0.4rem", 
                  fontWeight: 700, 
                  fontFamily: "\"JetBrains Mono\", monospace",
                  color: sinceLastSSR >= 50 ? "#ff6b6b" : sinceLastSSR >= 40 ? "#ff9800" : "var(--text)"
                }}>
                  {sinceLastSSR} 抽
                </span>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>距上次 SR：</span>
                <span style={{ 
                  marginLeft: "0.4rem", 
                  fontWeight: 700, 
                  fontFamily: "\"JetBrains Mono\", monospace"
                }}>
                  {sinceLastSR} 抽
                </span>
              </div>
            </div>
            {sinceLastSSR >= 50 && (
              <div style={{ 
                marginTop: "0.4rem", 
                fontSize: "0.82rem", 
                color: "#ff6b6b",
                fontStyle: "italic"
              }}>
                即将保底！下一张 SSR 已经在路上了！
              </div>
            )}
          </div>
        </div>

        <div style={{ 
          borderTop: "1px solid var(--border)", 
          paddingTop: "1rem",
          marginBottom: "0.75rem"
        }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>📜 本地抽卡历史（最近 50 条）</h3>
          <div style={{ 
            maxHeight: "280px", 
            overflowY: "auto",
            paddingRight: "0.25rem"
          }}>
            {localHistory.length === 0 ? (
              <p className="hint" style={{ margin: 0, textAlign: "center" }}>暂无抽卡记录</p>
            ) : (
              localHistory.map((h) => {
                const card = CARDS.find((c) => c.id === h.cardId);
                return (
                  <div 
                    key={h.id} 
                    className="mini-card" 
                    style={{ 
                      marginBottom: "0.4rem",
                      background: h.rarity === "SSR" ? "linear-gradient(135deg, rgba(216,178,93,0.12), rgba(216,178,93,0.03))" : h.rarity === "SR" ? "linear-gradient(135deg, rgba(147,112,219,0.12), rgba(147,112,219,0.03))" : "var(--bg-2)",
                      borderLeft: h.rarity === "SSR" ? "3px solid #d8b25d" : h.rarity === "SR" ? "3px solid #9370db" : "3px solid transparent"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span className={`pull-rarity ${rarityClass(h.rarity)}`} style={{ fontSize: "0.7rem", padding: "0.1rem 0.35rem", marginRight: "0.4rem" }}>
                          {h.rarity}
                        </span>
                        <span style={{ fontWeight: 600 }}>{card?.name || h.cardId}</span>
                      </div>
                      <div style={{ 
                        fontFamily: "\"JetBrains Mono\", monospace", 
                        fontSize: "0.75rem", 
                        color: "var(--muted)" 
                      }}>
                        {new Date(h.at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {hasSupabase() && (
          <div style={{ 
            borderTop: "1px solid var(--border)", 
            paddingTop: "1rem",
            marginTop: "0.5rem"
          }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>🔌 后端同步历史</h3>
            {lastSyncError && (
              <p className="hint" style={{ color: "var(--danger)", marginBottom: "0.5rem" }}>
                同步错误：{lastSyncError}
              </p>
            )}
            <div className="btn-row" style={{ marginBottom: "0.75rem" }}>
              <button type="button" className="btn btn-primary" onClick={load} disabled={loading}>
                {loading ? "加载中…" : "刷新后端历史"}
              </button>
            </div>
            <div style={{ maxHeight: "150px", overflowY: "auto", paddingRight: "0.25rem" }}>
              {items.length === 0 ? (
                <p className="hint">暂无后端数据</p>
              ) : (
                items.map((it, i) => (
                  <div key={i} className="mini-card" style={{ marginBottom: "0.4rem" }}>
                    <div style={{ fontFamily: "\"JetBrains Mono\", monospace", fontSize: "0.78rem", color: "var(--muted)" }}>
                      {it.when} · {it.poolId}
                    </div>
                    <div style={{ marginTop: "0.25rem", fontSize: "0.85rem", lineHeight: 1.4 }}>
                      {it.lines.join(" / ")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="btn-row" style={{ marginTop: "1rem" }}>
          <button type="button" className="btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function UsernameModal() {
  const usernameSet = useGameStore((s) => s.usernameSet);
  const setUsername = useGameStore((s) => s.setUsername);
  const [inputValue, setInputValue] = useState("");

  if (usernameSet) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim().length >= 1 && inputValue.trim().length <= 20) {
      setUsername(inputValue.trim());
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2 style={{ marginTop: 0, textAlign: "center" }}>欢迎来到阴阳寮</h2>
        <p className="hint" style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          请取一个名字，开启你的占卜之旅！
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="输入你的名字（1-20个字符）"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            maxLength={20}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              fontSize: "1rem",
              borderRadius: "0.5rem",
              border: "2px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              marginBottom: "1rem",
            }}
            autoFocus
          />
          <div className="btn-row">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={inputValue.trim().length < 1}
            >
              确认
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RewardAnimation({
  animation,
  onDismiss,
}: {
  animation: { visible: boolean; type: "coins" | "card" | "achievement" | "level"; amount: number };
  onDismiss: () => void;
}) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onDismiss, 500);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const confettiPieces = Array.from({ length: 50 }, (_, i) => i);

  const getAnimationContent = () => {
    switch (animation.type) {
      case "coins":
        return (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>💰</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d8b25d" }}>
              +{animation.amount} 灵石
            </div>
          </>
        );
      case "card":
        return (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎴</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#9370db" }}>
              获得卡牌！
            </div>
          </>
        );
      case "achievement":
        return (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🏆</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ff6b6b" }}>
              成就解锁！
            </div>
          </>
        );
      case "level":
        return (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>⭐</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#4ecdc4" }}>
              等级提升！
            </div>
          </>
        );
      default:
        return null;
    }
  };

  if (!show && animation.visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {confettiPieces.map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: "8px",
            height: "8px",
            backgroundColor: ["#ff6b6b", "#4ecdc4", "#ffe66d", "#9370db", "#667eea"][i % 5],
            borderRadius: i % 2 === 0 ? "50%" : "0",
            animation: `confettiFall 2.5s ease-out forwards`,
            animationDelay: `${i * 0.03}s`,
            left: `${Math.random() * 100}%`,
            top: "-20px",
          }}
        />
      ))}

      <div
        style={{
          background: "linear-gradient(135deg, rgba(216,178,93,0.95), rgba(147,112,219,0.95))",
          padding: "2rem 3rem",
          borderRadius: "1.5rem",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          textAlign: "center",
          animation: "rewardPopIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
          border: "3px solid rgba(255,255,255,0.3)",
        }}
      >
        {getAnimationContent()}
      </div>

      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes rewardPopIn {
          0% {
            transform: scale(0) rotate(-10deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(2deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabId>("home");
  const [gachaOpen, setGachaOpen] = useState(false);
  const [gachaPhase, setGachaPhase] = useState<GachaPhase>("idle");
  const [revealIndex, setRevealIndex] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ritualReady, setRitualReady] = useState(false);
  const [ssrFxKey, setSsrFxKey] = useState(0);
  const [ssrFxActive, setSsrFxActive] = useState(false);
  const [stageFxKey, setStageFxKey] = useState(0);
  const [stageFxActive, setStageFxActive] = useState(false);
  const [stageFxK, setStageFxK] = useState(0.6);
  const [stageFxVariant, setStageFxVariant] = useState<"base" | "ssr">("base");

  const coins = useGameStore((s) => s.coins);
  const streak = useGameStore((s) => s.streak);
  const pullsSinceSR = useGameStore((s) => s.pullsSinceSR);
  const pullsSinceSSR = useGameStore((s) => s.pullsSinceSSR);
  const freePulls = useGameStore((s) => s.freePulls);
  const wheelBuff = useGameStore((s) => s.wheelBuff);
  const wheelDate = useGameStore((s) => s.wheelDate);
  const lastPullResults = useGameStore((s) => s.lastPullResults);
  const dismissResults = useGameStore((s) => s.dismissResults);
  const pendingReveal = useGameStore((s) => s.pendingReveal);
  const dismissReveal = useGameStore((s) => s.dismissReveal);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const soundOn = useGameStore((s) => s.settings.soundOn);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const toggleReducedMotion = useGameStore((s) => s.toggleReducedMotion);
  const pullSingle = useGameStore((s) => s.pullSingle);
  const pullTen = useGameStore((s) => s.pullTen);
  const activePoolId = useGameStore((s) => s.activePoolId);
  const setActivePoolId = useGameStore((s) => s.setActivePoolId);
  const fatePoints = useGameStore((s) => s.fatePoints);
  const username = useGameStore((s) => s.username);
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const tutorialCompleted = useGameStore((s) => s.tutorialCompleted);
  const rewardAnimation = useGameStore((s) => s.rewardAnimation);
  const dismissRewardAnimation = useGameStore((s) => s.dismissRewardAnimation);

  useEffect(() => {
    if (tutorialCompleted) return;
    if (tutorialStep === 1) setTab("progress");
    else if (tutorialStep === 2) setTab("gacha");
    else if (tutorialStep === 3) setTab("gacha");
    else if (tutorialStep === 4) setTab("fortune");
    else setTab("home");
  }, [tutorialStep, tutorialCompleted]);

  const t = todayKey();
  const currentRevealCard = pendingReveal?.[revealIndex]?.card ?? null;
  const canSkip = !!pendingReveal && pendingReveal.length > 1;

  const gachaStatus = useMemo(() => {
    if (gachaPhase === "charging") return "灵力汇聚中…";
    if (gachaPhase === "burst") return "天机开示！";
    if (gachaPhase === "reveal") return "逐张揭示（可跳过）";
    return "准备就绪";
  }, [gachaPhase]);

  const navItems = useMemo(
    () =>
      [
        { id: "home", label: "主页", icon: "庭" },
        { id: "gacha", label: "祈愿", icon: "符" },
        { id: "fortune", label: "占卜", icon: "卜" },
        { id: "progress", label: "任务", icon: "令" },
        { id: "collection", label: "图鉴", icon: "录" },
        { id: "help", label: "帮助", icon: "书" },
        { id: "settings", label: "设置", icon: "工" },
      ] as const satisfies { id: TabId; label: string; icon: string }[],
    []
  );

  const triggerSsrFx = () => {
    setSsrFxKey((x) => x + 1);
    setSsrFxActive(true);
    window.setTimeout(() => {
      setSsrFxActive(false);
    }, reducedMotion ? 0 : 1200);
  };

  const triggerStageFx = (k: number, variant: "base" | "ssr") => {
    setStageFxKey((x) => x + 1);
    setStageFxK(k);
    setStageFxVariant(variant);
    setStageFxActive(true);
    window.setTimeout(() => {
      setStageFxActive(false);
    }, reducedMotion ? 0 : 300);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden>
            天机
          </div>
          <div>
            <h1 className="brand-title">✨ 天机抽卡 ✨</h1>
            <p className="sub">
              {username ? `${username} · ` : ""}算命 · 占卜 · 抽卡 · 本地存档（纯前端）
            </p>
          </div>
        </div>
        {username && (
          <div className="pill" style={{ 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontWeight: 600
          }}>
            👤 {username}
          </div>
        )}
      </header>

      <div className="stat-bar">
        <span className="pill">灵石 {coins}</span>
        <span className="pill">连签 {streak} 天</span>
        <span className="pill">命运积分 {fatePoints}</span>
        {freePulls > 0 && <span className="pill">免费抽 {freePulls}</span>}
        <div className="guarantee-row">
          <div className="guarantee-item" style={{ 
            animation: pullsSinceSR >= 7 ? "pulse 1s infinite" : "none",
            borderColor: pullsSinceSR >= 7 ? "rgba(255, 107, 107, 0.6)" : "transparent",
            borderWidth: pullsSinceSR >= 7 ? "2px" : "0",
            borderStyle: "solid",
            borderRadius: "16px"
          }}>
            <div className="guarantee-label">SR 保底</div>
            <div className="guarantee-value">
              <div className="guarantee-progress">
                <div 
                  className="guarantee-fill sr" 
                  style={{ 
                    width: `${(pullsSinceSR / 10) * 100}%`,
                    filter: pullsSinceSR >= 5 ? "brightness(1.4)" : pullsSinceSR >= 7 ? "brightness(1.8)" : "none"
                  }} 
                />
              </div>
              <span 
                className={`guarantee-count sr`}
                style={{ 
                  color: pullsSinceSR >= 5 ? "#ffa94d" : pullsSinceSR >= 7 ? "#ff6b6b" : "inherit",
                  fontWeight: pullsSinceSR >= 5 ? 700 : pullsSinceSR >= 7 ? 900 : 600,
                  fontSize: pullsSinceSR >= 7 ? "1.15rem" : "1rem"
                }}
              >
                {10 - pullsSinceSR}/10
              </span>
            </div>
            <div style={{ 
              fontSize: "0.75rem", 
              color: pullsSinceSR >= 7 ? "#ff6b6b" : pullsSinceSR >= 5 ? "#ffa94d" : "var(--muted)", 
              marginTop: "0.2rem",
              fontWeight: pullsSinceSR >= 7 ? 700 : 400
            }}>
              {pullsSinceSR >= 7 ? "🔥 即将保底！下一张就是 SR+" : 
               pullsSinceSR >= 5 ? "⚠️ 即将接近保底" : 
               `进度 ${Math.round((pullsSinceSR / 10) * 100)}%`}
            </div>
          </div>
          <div className="guarantee-item" style={{ 
            animation: pullsSinceSSR >= 40 ? "pulse 1s infinite" : "none",
            borderColor: pullsSinceSSR >= 40 ? "rgba(255, 107, 107, 0.6)" : pullsSinceSSR >= 30 ? "rgba(255, 169, 77, 0.4)" : "transparent",
            borderWidth: pullsSinceSSR >= 30 ? "2px" : "0",
            borderStyle: "solid",
            borderRadius: "16px"
          }}>
            <div className="guarantee-label">SSR 保底</div>
            <div className="guarantee-value">
              <div className="guarantee-progress">
                <div 
                  className="guarantee-fill ssr" 
                  style={{ 
                    width: `${(pullsSinceSSR / 50) * 100}%`,
                    filter: pullsSinceSSR >= 30 ? "brightness(1.4)" : pullsSinceSSR >= 40 ? "brightness(1.8)" : "none"
                  }} 
                />
              </div>
              <span 
                className={`guarantee-count ssr`}
                style={{ 
                  color: pullsSinceSSR >= 30 ? "#ffa94d" : pullsSinceSSR >= 40 ? "#ff6b6b" : "inherit",
                  fontWeight: pullsSinceSSR >= 30 ? 700 : pullsSinceSSR >= 40 ? 900 : 600,
                  fontSize: pullsSinceSSR >= 40 ? "1.15rem" : "1rem"
                }}
              >
                {50 - pullsSinceSSR}/50
              </span>
            </div>
            <div style={{ 
              fontSize: "0.75rem", 
              color: pullsSinceSSR >= 40 ? "#ff6b6b" : pullsSinceSSR >= 30 ? "#ffa94d" : "var(--muted)", 
              marginTop: "0.2rem",
              fontWeight: pullsSinceSSR >= 40 ? 700 : 400
            }}>
              {pullsSinceSSR >= 40 ? "🔥 即将保底！下一张就是 SSR！" : 
               pullsSinceSSR >= 30 ? "⚠️ 即将接近保底" : 
               `进度 ${Math.round((pullsSinceSSR / 50) * 100)}%`}
            </div>
          </div>
        </div>
      </div>

      {wheelBuff && wheelDate === t && (
        <div className="panel panel-compact">
          <div className="panel-title">今日轮盘</div>
          <div className="panel-value">{wheelBuff.label}</div>
        </div>
      )}

      <nav className="tabs" aria-label="主导航">
        {navItems.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`tab-btn ${tab === it.id ? "active" : ""}`}
            data-highlight-target={`tab-${it.id}`}
            onClick={() => {
              if (soundOn && tab !== it.id) void playSfx("click", 0.5);
              setTab(it.id);
            }}
            aria-label={`切换到${it.label}页面`}
            aria-pressed={tab === it.id}
            role="tab"
            aria-selected={tab === it.id}
          >
            <span className="tab-ico" aria-hidden="true">
              {it.icon}
            </span>
            <span className="tab-label">{it.label}</span>
          </button>
        ))}
      </nav>

      {tab === "home" && <HomeTab />}
      {tab === "gacha" && (
        <GachaTab
          pools={poolsJson as PoolDef[]}
          activePoolId={activePoolId}
          setActivePoolId={setActivePoolId}
          onOpenHistory={() => setHistoryOpen(true)}
          onSingle={() => {
            setGachaOpen(true);
            setRevealIndex(0);
            setGachaPhase("charging");
            // 蓄力 900ms → 爆发 350ms → 进入揭示
            window.setTimeout(() => setGachaPhase("burst"), reducedMotion ? 0 : 900);
            window.setTimeout(() => {
              pullSingle();
              setGachaPhase("reveal");
            }, reducedMotion ? 0 : 1250);
          }}
          onTen={() => {
            setGachaOpen(true);
            setRevealIndex(0);
            setGachaPhase("charging");
            window.setTimeout(() => setGachaPhase("burst"), reducedMotion ? 0 : 1100);
            window.setTimeout(() => {
              pullTen();
              setGachaPhase("reveal");
            }, reducedMotion ? 0 : 1500);
          }}
        />
      )}
      {tab === "fortune" && <FortuneTab />}
      {tab === "progress" && <ProgressTab />}
      {tab === "collection" && <CollectionTab />}
      {tab === "help" && <HelpTab />}
      {tab === "settings" && <SettingsTab />}

      {lastPullResults && lastPullResults.length > 0 && (
        <PullModal results={lastPullResults} onClose={dismissResults} />
      )}

      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {gachaOpen && (
        <div className="gacha-overlay" role="dialog" aria-modal="true">
          {ssrFxActive && <SsrBarrier key={ssrFxKey} reducedMotion={reducedMotion} />}
          <div
            className={`gacha-stage ${ssrFxActive && !reducedMotion ? "ssr-shake" : ""} ${stageFxActive && !reducedMotion ? "stage-shake" : ""}`}
            style={{
              ["--shake-k" as never]: stageFxK,
              ["--fx-k" as never]: stageFxK,
            }}
          >
            {stageFxActive && (
              <div
                key={stageFxKey}
                className={`stage-fx ${stageFxVariant === "ssr" ? "ssr" : "base"}`}
                aria-hidden
              />
            )}
            <div className="gacha-ui">
              <div className="gacha-topbar">
                <div className="gacha-title">祈愿 · 抽卡仪式</div>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      toggleSound();
                      void playSfx("tap", 0.55);
                    }}
                  >
                    {soundOn ? "音效 开" : "音效 关"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      toggleReducedMotion();
                      void playSfx("tap", 0.55);
                    }}
                  >
                    {reducedMotion ? "动效 低" : "动效 高"}
                  </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setGachaOpen(false);
                    setGachaPhase("idle");
                    setRevealIndex(0);
                    setRitualReady(false);
                    dismissReveal();
                  }}
                >
                  关闭
                </button>
                </div>
              </div>

              <div className="gacha-mid">
                <GachaScenePixi phase={gachaPhase} reducedMotion={reducedMotion} />

                {pendingReveal && gachaPhase === "reveal" && !ritualReady && (
                  <RitualDrag
                    onDone={() => setRitualReady(true)}
                    reducedMotion={reducedMotion}
                    soundOn={soundOn}
                  />
                )}

                {pendingReveal && currentRevealCard && gachaPhase === "reveal" && ritualReady && (
                  <CardReveal
                    card={currentRevealCard}
                    index={revealIndex}
                    total={pendingReveal.length}
                    canSkip={canSkip}
                    onSkip={() => {
                      setRevealIndex(Math.max(0, (pendingReveal?.length ?? 1) - 1));
                    }}
                    onImpact={(rarity) => {
                      if (reducedMotion) return;
                      if (rarity === "SSR") triggerStageFx(1, "ssr");
                      else if (rarity === "SR") triggerStageFx(0.55, "base");
                      else if (rarity === "R") triggerStageFx(0.45, "base");
                      else triggerStageFx(0.35, "base");
                    }}
                    onSsr={() => {
                      triggerSsrFx();
                    }}
                    onNext={() => {
                      const total = pendingReveal.length;
                      if (revealIndex + 1 >= total) {
                        setGachaOpen(false);
                        setGachaPhase("idle");
                        setRevealIndex(0);
                        setRitualReady(false);
                        dismissReveal();
                        return;
                      }
                      setRevealIndex(revealIndex + 1);
                    }}
                  />
                )}
              </div>

              <div className="gacha-bottom">
                <div className="gacha-status">{gachaStatus}</div>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (gachaPhase === "reveal" && pendingReveal && ritualReady) {
                        setRevealIndex(Math.min(revealIndex + 1, pendingReveal.length - 1));
                      }
                    }}
                    disabled={gachaPhase !== "reveal" || !pendingReveal || !ritualReady}
                  >
                    {gachaPhase === "reveal" ? "继续揭示" : "等待中…"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <UsernameModal />
      <Tutorial />
      
      {rewardAnimation && rewardAnimation.visible && (
        <RewardAnimation 
          animation={rewardAnimation} 
          onDismiss={dismissRewardAnimation} 
        />
      )}
    </div>
  );
}

function SsrBarrier({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      className="ssr-barrier"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.25 }}
      aria-hidden
    >
      <motion.div
        className="ssr-barrier-core"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="ssr-barrier-ink"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="ssr-barrier-kanji"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        极
      </motion.div>
      <motion.div
        className="ssr-barrier-flash"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: reducedMotion ? 0 : 0.9, times: [0, 0.12, 1] }}
      />
    </motion.div>
  );
}

function RitualDrag({
  onDone,
  reducedMotion,
  soundOn,
}: {
  onDone: () => void;
  reducedMotion: boolean;
  soundOn: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const [near, setNear] = useState(false);
  const [bounceHint, setBounceHint] = useState(false);
  const talisman = useMemo(() => talismanUrl(), []);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const talismanRef = useRef<HTMLDivElement | null>(null);
  const nearRef = useRef(false);
  const hintTimerRef = useRef<number | null>(null);
  const doneTimerRef = useRef<number | null>(null);
  const nearTimerRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const submittedRef = useRef(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const draggingRef = useRef(false);

  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
      if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current);
      if (nearTimerRef.current) window.clearTimeout(nearTimerRef.current);
    };
  }, []);

  const computeNear = (x: number, y: number) => {
    const rect = ringRef.current?.getBoundingClientRect();
    if (!rect) return false;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const threshold = Math.min(rect.width, rect.height) * 0.27;
    return dist <= threshold;
  };

  const submit = () => {
    if (doneRef.current || submittedRef.current) return;
    submittedRef.current = true;
    setDragging(false);
    draggingRef.current = false;
    setDone(true);
    setNear(false);
    setBounceHint(false);
    if (hintTimerRef.current) {
      window.clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
    if (nearTimerRef.current) {
      window.clearTimeout(nearTimerRef.current);
      nearTimerRef.current = null;
    }
    if (soundOn) void playSfx("seal", 0.7);

    const ringRect = ringRef.current?.getBoundingClientRect();
    const talRect = talismanRef.current?.getBoundingClientRect();
    if (ringRect && talRect) {
      const rcx = ringRect.left + ringRect.width / 2;
      const rcy = ringRect.top + ringRect.height / 2;
      const tcx = talRect.left + talRect.width / 2;
      const tcy = talRect.top + talRect.height / 2;
      animate(x, x.get() + (rcx - tcx), {
        type: "spring",
        stiffness: 220,
        damping: 18,
        mass: 0.9,
      });
      animate(y, y.get() + (rcy - tcy), {
        type: "spring",
        stiffness: 220,
        damping: 18,
        mass: 0.9,
      });
    }

    doneTimerRef.current = window.setTimeout(() => {
      onDone();
    }, reducedMotion ? 0 : 450);
  };

  return (
    <div className="ritual-layer" aria-hidden={false}>
      <div className="ritual-center">
        <div ref={ringRef} className={`ritual-ring ${near ? "near" : ""}`} />
        <div className="ritual-text">
          <div className="ritual-title">召唤入阵</div>
          <div className="ritual-sub">拖动符纸至阵心，唤醒天机</div>
        </div>
      </div>

      <motion.div
        ref={talismanRef}
        className={`ritual-talisman ${dragging ? "dragging" : ""} ${done ? "done" : ""}`}
        drag
        dragMomentum={false}
        dragElastic={0.2}
        whileDrag={{ rotate: reducedMotion ? 0 : 2, scale: 1.02 }}
        style={{ x, y }}
        onDragStart={() => {
          if (doneRef.current || submittedRef.current) return;
          setDragging(true);
          draggingRef.current = true;
          setNear(false);
          nearRef.current = false;
          setBounceHint(false);
          if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
          if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current);
          if (nearTimerRef.current) window.clearTimeout(nearTimerRef.current);
          if (soundOn) void ensureAudio();
          if (soundOn) void playSfx("tap", 0.45);
        }}
        onDrag={(_, info) => {
          if (doneRef.current || submittedRef.current) return;
          const nextNear = computeNear(info.point.x, info.point.y);
          if (nextNear !== nearRef.current) {
            nearRef.current = nextNear;
            setNear(nextNear);
          }
          if (nextNear && draggingRef.current && !nearTimerRef.current) {
            nearTimerRef.current = window.setTimeout(() => {
              nearTimerRef.current = null;
              if (!draggingRef.current) return;
              if (!nearRef.current) return;
              submit();
            }, 220);
          }
          if (!nextNear && nearTimerRef.current) {
            window.clearTimeout(nearTimerRef.current);
            nearTimerRef.current = null;
          }
        }}
        onDragEnd={(_, info) => {
          if (doneRef.current || submittedRef.current) return;
          setDragging(false);
          draggingRef.current = false;
          if (nearTimerRef.current) {
            window.clearTimeout(nearTimerRef.current);
            nearTimerRef.current = null;
          }
          const ok = computeNear(info.point.x, info.point.y);
          if (ok) {
            submit();
          } else {
            setNear(false);
            setBounceHint(true);
            hintTimerRef.current = window.setTimeout(() => setBounceHint(false), 1200);
            animate(x, 0, { type: "spring", stiffness: 260, damping: 20, mass: 0.9 });
            animate(y, 0, { type: "spring", stiffness: 260, damping: 20, mass: 0.9 });
          }
        }}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="talisman-paper" style={{ backgroundImage: `url(${talisman})` }}>
          <div className="talisman-paper-overlay" aria-hidden />
        </div>
        {bounceHint && !done && (
          <div className="ritual-bounce-hint" aria-hidden>
            拖回阵心
          </div>
        )}
        {done && (
          <div className="ritual-fx" aria-hidden>
            <span className="ritual-fx-paper p1" />
            <span className="ritual-fx-paper p2" />
            <span className="ritual-fx-paper p3" />
            <span className="ritual-fx-ink" />
          </div>
        )}
      </motion.div>
    </div>
  );
}

function HomeTab() {
  const [openId, setOpenId] = useState<string | null>("rules");
  const items = useMemo(
    () => [
      {
        id: "notice",
        icon: "须",
        tag: "须知",
        title: "祈愿消耗",
        meta: "单抽 10 · 十连 80",
        body: "灵石不足时可先做任务与成就，或等轮盘的加成。",
      },
      {
        id: "rules",
        icon: "规",
        tag: "规则",
        title: "保底机制",
        meta: "10 抽 SR+ · 50 抽 SSR",
        body: "限定池存在 UP 与保底逻辑；抽卡页会显示距离保底的剩余抽数。",
      },
      {
        id: "fortune",
        icon: "运",
        tag: "运势",
        title: "每日轮盘",
        meta: "每日一次",
        body: "运势会改变当日抽卡权重或奖励倍率；用好它，省很多灵石。",
      },
      {
        id: "info",
        icon: "告",
        tag: "告示",
        title: "娱乐声明",
        meta: "请理性游戏",
        body: "本游戏为娱乐向内容，不构成任何现实决策建议。",
      },
    ],
    []
  );

  return (
    <div className="panel scroll-panel">
      <div className="scroll-banner" aria-hidden />
      <div className="scroll-head">
        <div className="scroll-kicker">阴阳寮 · 入寮须知</div>
        <div className="scroll-title">天机阁</div>
        <div className="scroll-sub">卷轴会随你每日的运势与抽卡历史而展开。</div>
      </div>

      <div className="scroll-list">
        {items.map((it) => {
          const open = openId === it.id;
          return (
            <div
              key={it.id}
              className={`scroll-item scroll-item-clickable ${open ? "open" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => setOpenId(open ? null : it.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setOpenId(open ? null : it.id);
              }}
            >
              <div className="scroll-main">
                <div className="scroll-row1">
                  <span className="scroll-ico" aria-hidden>
                    {it.icon}
                  </span>
                  <span className="scroll-name">{it.title}</span>
                  <span className="scroll-meta">{it.meta}</span>
                </div>
                <div className={`scroll-row2 ${open ? "show" : ""} ${it.id === "fortune" ? "drawer" : ""}`}>
                  {it.body}
                </div>
              </div>
              <button
                type="button"
                className="seal-tag seal-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenId(open ? null : it.id);
                }}
              >
                {it.tag}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GachaTab({
  pools,
  activePoolId,
  setActivePoolId,
  onOpenHistory,
  onSingle,
  onTen,
}: {
  pools: PoolDef[];
  activePoolId: string;
  setActivePoolId: (id: string) => void;
  onOpenHistory: () => void;
  onSingle: () => void;
  onTen: () => void;
}) {
  const coins = useGameStore((s) => s.coins);
  const freePulls = useGameStore((s) => s.freePulls);
  const wheelBuff = useGameStore((s) => s.wheelBuff);
  const soundOn = useGameStore((s) => s.settings.soundOn);
  const wild = wheelBuff?.id === "wild";
  const tenCost = wild ? 70 : 80;
  const currentPool = pools.find((p) => p.id === activePoolId) ?? pools[0]!;

  return (
    <div>
      <div className="panel gacha-panel">
        <div className="gacha-banner" aria-hidden />
        <div className="gacha-head">
          <div className="gacha-kicker">召唤 · 阴阳寮</div>
          <div className="gacha-title2">祈愿</div>
          <div className="gacha-sub">
            <span className="gacha-poolname">{currentPool.name}</span>
            <span className="gacha-dot">·</span>
            <span className="gacha-pooldesc">{currentPool.desc}</span>
          </div>
        </div>

        <div className="gacha-toolbar">
          <div className="segmented" role="tablist" aria-label="卡池切换">
            {pools.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`seg-btn ${p.id === activePoolId ? "active" : ""}`}
                onClick={() => {
                  if (soundOn && p.id !== activePoolId) void playSfx("click", 0.5);
                  setActivePoolId(p.id);
                }}
                role="tab"
                aria-selected={p.id === activePoolId}
              >
                {p.name}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-paper" onClick={() => {
            if (soundOn) void playSfx("click", 0.5);
            onOpenHistory();
          }}>
            后端历史
          </button>
        </div>

        <div className="gacha-cta">
          <button
            type="button"
            className="btn btn-paper"
            disabled={freePulls <= 0 && coins < 10}
            onClick={() => {
              if (soundOn) void playSfx("tap", 0.6);
              onSingle();
            }}
            data-highlight-target="gacha-single"
          >
            单抽（{freePulls > 0 ? "免费" : "10 灵石"}）
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={coins < tenCost}
            onClick={() => {
              if (soundOn) void playSfx("tap", 0.6);
              onTen();
            }}
            data-highlight-target="gacha-ten"
          >
            {wild ? `十连+1（${tenCost} 灵石）` : `十连（${tenCost} 灵石）`}
          </button>
        </div>

        <div className="gacha-footnote">
          {wild
            ? "轮盘「变数之门」生效：十连 70 灵石并额外抽第 11 张。"
            : "十连更省灵石；轮盘若为 SR/SSR 加成，将提高对应稀有度权重。"}
        </div>
      </div>
    </div>
  );
}

function FortuneTab() {
  const readDailyFortune = useGameStore((s) => s.readDailyFortune);
  const drawThreeCards = useGameStore((s) => s.drawThreeCards);
  const spinWheelAction = useGameStore((s) => s.spinWheelAction);
  const dailyFortune = useGameStore((s) => s.dailyFortune);
  const threeCardIds = useGameStore((s) => s.threeCardIds);
  const wheelDate = useGameStore((s) => s.wheelDate);
  const wheelBuff = useGameStore((s) => s.wheelBuff);
  const cardById = useGameStore((s) => s.cardById);
  const [sharing, setSharing] = useState(false);
  const t = todayKey();

  const threeCards =
    threeCardIds?.map((id) => cardById(id)).filter(Boolean) ?? [];
  const narrative =
    threeCards.length === 3
      ? threeCardNarrative(
          [threeCards[0]!.name, threeCards[1]!.name, threeCards[2]!.name],
          [
            threeCards[0]!.keywords,
            threeCards[1]!.keywords,
            threeCards[2]!.keywords,
          ]
        )
      : null;

  const handleShareFortune = async () => {
    if (!dailyFortune) return;
    setSharing(true);
    try {
      const { shareContent, formatFortuneShare } = await import("./utils/share");
      const shareData = formatFortuneShare(dailyFortune);
      await shareContent(shareData);
    } catch (error) {
      console.error("分享失败:", error);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div>
      <div className="panel">
        <h2>今日运势</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          按日生成签文与幸运元素；若轮盘为「心平气和」，可降低极端下签概率。
        </p>
        <button type="button" className="btn btn-primary" onClick={readDailyFortune} data-highlight-target="fortune-generate">
          生成 / 刷新今日运势
        </button>
        {dailyFortune && (
          <div style={{ marginTop: "0.75rem", fontSize: "0.92rem" }}>
            <p>
              <strong>签运：</strong>
              {dailyFortune.sign} · <strong>气运：</strong>
              {dailyFortune.mood}
            </p>
            <p>
              <strong>幸运元素：</strong>
              {dailyFortune.luckElement} · <strong>幸运数：</strong>
              {dailyFortune.luckNumber}
            </p>
            <p>
              <strong>指引：</strong>
              {dailyFortune.advice}
            </p>
            <div style={{ marginTop: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-paper"
                onClick={handleShareFortune}
                disabled={sharing}
              >
                {sharing ? "分享中…" : "🔗 分享运势"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>三牌阵（过去 / 现在 / 未来）</h2>
        <button type="button" className="btn btn-primary" onClick={drawThreeCards}>
          抽三张
        </button>
        {threeCards.length === 3 && (
          <div style={{ marginTop: "0.75rem" }}>
            <div className="card-grid">
              {threeCards.map((c) => (
                <div key={c!.id} className="mini-card">
                  <div className={rarityClass(c!.rarity)}>{c!.rarity}</div>
                  <div>{c!.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                    {c!.keywords.join(" · ")}
                  </div>
                </div>
              ))}
            </div>
            {narrative && <p className="hint">{narrative}</p>}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>命运轮盘（每日一次）</h2>
        <div
          className={`wheel-visual ${wheelDate === t ? "paused" : ""}`}
          aria-hidden
        >
          <span style={{ fontSize: "0.85rem", textAlign: "center" }}>
            {wheelDate === t ? "✦ 已转动 ✦" : "✦ 待转动 ✦"}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={wheelDate === t}
          onClick={spinWheelAction}
        >
          {wheelDate === t ? "今日已抽取运势" : "转动轮盘"}
        </button>
        {wheelBuff && wheelDate === t && (
          <p className="hint" style={{ marginTop: "0.75rem" }}>
            <strong>效果：</strong>
            {wheelBuff.label}
          </p>
        )}
      </div>
    </div>
  );
}

function ProgressTab() {
  const taskProgress = useGameStore((s) => s.taskProgress);
  const taskClaimed = useGameStore((s) => s.taskClaimed);
  const taskClaimedDay = useGameStore((s) => s.taskClaimedDay);
  const claimTask = useGameStore((s) => s.claimTask);
  const weeklyTaskProgress = useGameStore((s) => s.weeklyTaskProgress);
  const weeklyTaskClaimed = useGameStore((s) => s.weeklyTaskClaimed);
  const weeklyTaskClaimedWeek = useGameStore((s) => s.weeklyTaskClaimedWeek);
  const claimWeeklyTask = useGameStore((s) => s.claimWeeklyTask);
  const achievements = useGameStore((s) => s.achievements);
  const resetAll = useGameStore((s) => s.resetAll);
  const checkIn = useGameStore((s) => s.checkIn);
  const achievementPoints = useGameStore((s) => s.achievementPoints);
  const achievementLevel = useGameStore((s) => s.achievementLevel);
  const checkInDate = useGameStore((s) => s.checkInDate);
  const checkInStreak = useGameStore((s) => s.checkInStreak);
  const totalCheckIns = useGameStore((s) => s.totalCheckIns);
  const stats = useGameStore((s) => s.stats);
  const inventory = useGameStore((s) => s.inventory);
  const collectionRewardsClaimed = useGameStore((s) => s.collectionRewardsClaimed);
  const achievementLevelRewardsClaimed = useGameStore((s) => s.achievementLevelRewardsClaimed);
  const claimAchievementLevelReward = useGameStore((s) => s.claimAchievementLevelReward);
  const dailyActive = useGameStore((s) => s.dailyActive);
  const claimDailyActiveReward = useGameStore((s) => s.claimDailyActiveReward);
  const purchaseFromAchievementShop = useGameStore((s) => s.purchaseFromAchievementShop);
  const useDailyPrivilege = useGameStore((s) => s.useDailyPrivilege);
  const achievementShopPurchased = useGameStore((s) => s.achievementShopPurchased);
  const dailyPrivilegeUsage = useGameStore((s) => s.dailyPrivilegeUsage);
  const soundOn = useGameStore((s) => s.settings.soundOn);
  const t = todayKey();
  const wk = weekKey();
  const [sparkTaskId, setSparkTaskId] = useState<string | null>(null);
  const sparkTimerRef = useRef<number | null>(null);
  const [checkInAnimation, setCheckInAnimation] = useState(false);
  const [lastReward, setLastReward] = useState<number>(0);

  useEffect(() => {
    return () => {
      if (sparkTimerRef.current) window.clearTimeout(sparkTimerRef.current);
    };
  }, []);

  const ownedCount = Object.keys(inventory).filter((id) => (inventory[id] ?? 0) > 0).length;
  const totalCount = CARDS.length;
  const collectionProgress = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  const handleCheckIn = () => {
    if (soundOn) void playSfx("reward", 0.7);
    const result = checkIn();
    if (result.success) {
      setLastReward(result.reward);
      setCheckInAnimation(true);
      setTimeout(() => setCheckInAnimation(false), 2000);
    }
  };

  const isCheckedInToday = checkInDate === t;

  return (
    <div className="panel scroll-panel">
      <div className="scroll-banner scroll-banner-tasks" aria-hidden />
      <div className="scroll-head">
        <div className="scroll-kicker">阴阳寮 · 日课</div>
        <div className="scroll-title">任务与成就</div>
        <div className="scroll-sub">
          轮盘「财星高照」时，下一次领取任务奖励会 ×1.5（领取后归零）。
        </div>
      </div>

      {(() => {
        const now = new Date();
        const day = now.getDay();
        const isWeekend = day === 0 || day === 6;
        if (!isWeekend) return null;
        return (
          <div className="scroll-section">
            <div style={{
              background: "linear-gradient(135deg, #ff6b6b, #ffd93d)",
              padding: "1rem",
              borderRadius: "0.75rem",
              color: "#2d3436",
              fontWeight: 700,
              textAlign: "center"
            }}>
              🎉 周末双倍活动进行中！签到和任务奖励翻倍！
            </div>
          </div>
        );
      })()}

      <div className="scroll-section">
        <div className="scroll-section-title">每日签到</div>
        <div className="scroll-list">
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">今日签到</span>
                <span className="scroll-meta">
                  连续 {checkInStreak} 天 · 累计 {totalCheckIns} 次
                </span>
              </div>
              <div className="scroll-row2">
                每日签到可获得卦石，连续签到奖励递增
              </div>
            </div>
            <div>
              {checkInAnimation && (
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: "var(--success)",
                  color: "white",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  fontWeight: 700,
                  animation: "popIn 0.3s ease-out"
                }}>
                  +{lastReward} 卦石
                </div>
              )}
              <button
                type="button"
                className={isCheckedInToday ? "btn btn-paper" : "btn btn-primary"}
                disabled={isCheckedInToday}
                onClick={handleCheckIn}
                data-highlight-target="checkin-button"
                aria-label={isCheckedInToday ? "今日已签到" : "点击立即签到领取灵石奖励"}
                aria-pressed={isCheckedInToday}
              >
                {isCheckedInToday ? "已签到" : "立即签到"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">成就等级</div>
        <div className="scroll-list">
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">成就等级 {achievementLevel()}</span>
                <span className="scroll-meta">
                  {achievementPoints()} 点成就点数
                </span>
              </div>
              <div className="scroll-row2">
                收集更多卡牌、完成每日任务来提升成就等级
              </div>
            </div>
            <div className="achv-badge ok">
              <span className="status-text">Lv.{achievementLevel()}</span>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">图鉴收集</span>
                <span className="scroll-meta">
                  {ownedCount} / {totalCount} · {collectionProgress}%
                </span>
              </div>
              <div className="progressbar" style={{ marginTop: "0.5rem" }} aria-hidden>
                <div className="progressbar-fill" style={{ width: `${collectionProgress}%` }} />
              </div>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">游戏统计</span>
              </div>
              <div className="scroll-row2" style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0.5rem",
                marginTop: "0.5rem"
              }}>
                <div style={{ background: "var(--bg-2)", padding: "0.5rem", borderRadius: "0.35rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>总抽卡</div>
                  <div style={{ fontWeight: 700 }}>{stats.totalPulls}</div>
                </div>
                <div style={{ background: "var(--bg-2)", padding: "0.5rem", borderRadius: "0.35rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>SSR 获得</div>
                  <div style={{ fontWeight: 700, color: "var(--accent)" }}>{stats.totalSsr}</div>
                </div>
                <div style={{ background: "var(--bg-2)", padding: "0.5rem", borderRadius: "0.35rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>SR 获得</div>
                  <div style={{ fontWeight: 700, color: "#ff9f43" }}>{stats.totalSr}</div>
                </div>
                <div style={{ background: "var(--bg-2)", padding: "0.5rem", borderRadius: "0.35rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>任务完成</div>
                  <div style={{ fontWeight: 700 }}>{stats.taskCompletedCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">成就等级奖励</div>
        <div className="scroll-list">
          {ACHIEVEMENT_LEVEL_REWARDS.map((reward) => {
            const isClaimed = achievementLevelRewardsClaimed[reward.level];
            const isUnlocked = achievementLevel() >= reward.level;
            const canClaim = isUnlocked && !isClaimed;

            const handleClaim = () => {
              if (!canClaim) return;
              if (soundOn) void playSfx("achievement", 0.8);
              claimAchievementLevelReward(reward.level);
            };

            return (
              <div key={reward.level} className={`task-card ${isClaimed ? "claimed" : ""}`}>
                <div className="task-ico" aria-hidden>
                  级
                </div>
                <div className="task-main">
                  <div className="task-row1">
                    <div className="task-title">{reward.title}</div>
                    <div className="task-meta">
                      Lv.{reward.level}
                    </div>
                  </div>
                  {reward.description && (
                    <div className="task-row2" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                      {reward.description}
                    </div>
                  )}
                </div>
                <div className="task-side">
                  <div className="task-reward">
                    <span className="reward-ico" aria-hidden>
                      石
                    </span>
                    <span className="reward-num">{reward.reward}</span>
                  </div>
                  <button
                    type="button"
                    className={canClaim ? "btn btn-primary" : "btn btn-paper"}
                    disabled={!canClaim}
                    onClick={handleClaim}
                  >
                    {isClaimed ? "已领取" : isUnlocked ? "领取奖励" : "未解锁"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">每日特权</div>
        <div className="scroll-list">
          {DAILY_PRIVILEGES.map((priv) => {
            const isUnlocked = achievementLevel() >= priv.requiredLevel;
            const usage = dailyPrivilegeUsage;
            const isUsed = usage.date === t && usage.used[priv.id];

            const handleUse = () => {
              if (!isUnlocked || isUsed) return;
              if (soundOn) void playSfx("success", 0.7);
              const result = useDailyPrivilege(priv.id);
              if (result.success && (priv.id === "priv_free_pull" || priv.id === "priv_extra_coins")) {
                setLastReward(priv.id === "priv_extra_coins" ? 50 : 1);
                setCheckInAnimation(true);
                setTimeout(() => setCheckInAnimation(false), 2000);
              }
            };

            return (
              <div key={priv.id} className={`task-card ${isUsed ? "claimed" : ""}`}>
                <div className="task-ico" aria-hidden>
                  权
                </div>
                <div className="task-main">
                  <div className="task-row1">
                    <div className="task-title">{priv.title}</div>
                    <div className="task-meta">
                      Lv.{priv.requiredLevel}
                    </div>
                  </div>
                  <div className="task-row2" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    {priv.description}
                  </div>
                </div>
                <div className="task-side">
                  <button
                    type="button"
                    className={isUnlocked && !isUsed ? "btn btn-primary" : "btn btn-paper"}
                    disabled={!isUnlocked || isUsed}
                    onClick={handleUse}
                  >
                    {isUsed ? "今日已用" : isUnlocked ? "立即使用" : "未解锁"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">成就商店</div>
        <div className="scroll-list">
          {ACHIEVEMENT_SHOP_ITEMS.map((item) => {
            const canAfford = achievementPoints() >= item.cost;
            const purchased = achievementShopPurchased[item.id] || 0;

            const handlePurchase = () => {
              if (!canAfford) return;
              if (soundOn) void playSfx("reward", 0.7);
              const result = purchaseFromAchievementShop(item.id);
              if (result.success) {
                setLastReward(item.value);
                setCheckInAnimation(true);
                setTimeout(() => setCheckInAnimation(false), 2000);
              }
            };

            return (
              <div key={item.id} className="task-card">
                <div className="task-ico" aria-hidden>
                  商
                </div>
                <div className="task-main">
                  <div className="task-row1">
                    <div className="task-title">{item.title}</div>
                    <div className="task-meta">
                      {purchased} 次兑换
                    </div>
                  </div>
                  <div className="task-row2" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    {item.description}
                  </div>
                </div>
                <div className="task-side">
                  <div className="task-reward">
                    <span className="reward-ico" aria-hidden>
                      点
                    </span>
                    <span className="reward-num">{item.cost}</span>
                  </div>
                  <button
                    type="button"
                    className={canAfford ? "btn btn-primary" : "btn btn-paper"}
                    disabled={!canAfford}
                    onClick={handlePurchase}
                  >
                    兑换
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">每日活跃奖励</div>
        <div className="scroll-list">
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">今日活跃</span>
                <span className="scroll-meta">
                  {dailyActive.points} 活跃点
                </span>
              </div>
              <div className="progressbar" aria-hidden>
                <div 
                  className="progressbar-fill" 
                  style={{ 
                    width: `${Math.min(100, (dailyActive.points / 200) * 100)}%`,
                    background: "var(--accent)"
                  }} 
                />
              </div>
            </div>
          </div>
          {DAILY_ACTIVE_REWARDS.map((reward) => {
            const isClaimed = dailyActive.claimed[reward.id];
            const isUnlocked = dailyActive.points >= reward.points;
            const canClaim = isUnlocked && !isClaimed;

            const handleClaim = () => {
              if (!canClaim) return;
              if (soundOn) void playSfx("achievement", 0.8);
              const result = claimDailyActiveReward(reward.id);
              if (result.success) {
                setLastReward(result.reward);
                setCheckInAnimation(true);
                setTimeout(() => setCheckInAnimation(false), 2000);
              }
            };

            return (
              <div key={reward.id} className={`task-card ${isClaimed ? "claimed" : ""}`}>
                <div className="task-ico" aria-hidden>
                  活
                </div>
                <div className="task-main">
                  <div className="task-row1">
                    <div className="task-title">{reward.title}</div>
                    <div className="task-meta">
                      {reward.points} 活跃点
                    </div>
                  </div>
                  {reward.description && (
                    <div className="task-row2" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                      {reward.description}
                    </div>
                  )}
                </div>
                <div className="task-side">
                  <div className="task-reward">
                    <span className="reward-ico" aria-hidden>
                      石
                    </span>
                    <span className="reward-num">{reward.reward}</span>
                  </div>
                  <button
                    type="button"
                    className={canClaim ? "btn btn-primary" : "btn btn-paper"}
                    disabled={!canClaim}
                    onClick={handleClaim}
                  >
                    {isClaimed ? "已领取" : isUnlocked ? "领取奖励" : "未解锁"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">图鉴收集奖励</div>
        <div className="scroll-list">
          {COLLECTION_REWARDS.map((reward) => {
            const isClaimed = collectionRewardsClaimed[reward.id];
            const progress = totalCount > 0 ? Math.min(1, ownedCount / totalCount) : 0;
            const isUnlocked = progress >= reward.threshold;

            return (
              <div key={reward.id} className={`task-card ${isClaimed ? "claimed" : ""}`}>
                <div className="task-ico" aria-hidden>
                  藏
                </div>
                <div className="task-main">
                  <div className="task-row1">
                    <div className="task-title">{reward.title}</div>
                    <div className="task-meta">
                      {Math.round(reward.threshold * 100)}%
                    </div>
                  </div>
                  <div className="progressbar" aria-hidden>
                    <div 
                      className="progressbar-fill" 
                      style={{ 
                        width: `${Math.min(1, progress / reward.threshold) * 100}%`,
                        background: isUnlocked ? "var(--success)" : "var(--accent)"
                      }} 
                    />
                  </div>
                </div>
                <div className="task-side">
                  <div className="task-reward">
                    <span className="reward-ico" aria-hidden>
                      石
                    </span>
                    <span className="reward-num">{reward.reward}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-paper"
                    disabled
                  >
                    {isClaimed ? "已领取" : isUnlocked ? "已解锁" : "进行中"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">每日任务</div>
        <div className="scroll-list">
          {TASK_DEFS.filter((def) => def.type === "daily").map((def) => {
            const prog = taskProgress[def.id] ?? 0;
            const claimed = taskClaimedDay === t && taskClaimed[def.id];
            const done = prog >= def.target;
            const ratio = Math.min(1, prog / def.target);
            const status = claimed
              ? { icon: "✓", label: "已领取", cls: "ok" }
              : done
                ? { icon: "★", label: "可领取", cls: "ready" }
                : { icon: "○", label: "未完成", cls: "todo" };

            const claim = () => {
              if (!done || claimed) return;
              if (soundOn) void playSfx("success", 0.7);
              if (sparkTimerRef.current) window.clearTimeout(sparkTimerRef.current);
              setSparkTaskId(def.id);
              sparkTimerRef.current = window.setTimeout(() => setSparkTaskId(null), 650);
              claimTask(def.id);
            };

            return (
              <div key={def.id} className={`task-card ${claimed ? "claimed" : done ? "done" : ""}`}>
                <div className="task-ico" aria-hidden>
                  令
                </div>
                <div className="task-main">
                  <div className="task-row1">
                    <div className="task-title">{def.title}</div>
                    <div className="task-meta">
                      {Math.min(prog, def.target)} / {def.target}
                    </div>
                  </div>
                  <div className="progressbar" aria-hidden>
                    <div className="progressbar-fill" style={{ width: `${ratio * 100}%` }} />
                  </div>
                </div>
                <div className="task-side">
                  <div className={`task-reward ${sparkTaskId === def.id ? "spark" : ""}`}>
                    <span className="reward-ico" aria-hidden>
                      石
                    </span>
                    <span className="reward-num">{def.reward}</span>
                  </div>
                  <button
                    type="button"
                    className={done && !claimed ? "btn btn-primary" : "btn btn-paper"}
                    disabled={!done || claimed}
                    onClick={claim}
                  >
                    <span className={`status-ico ${status.cls} ${sparkTaskId === def.id ? "spark" : ""}`} aria-hidden>
                      {status.cls === "ok" ? (
                        <svg className="check-svg" viewBox="0 0 24 24">
                          <path d="M5 12.5 L10 17.2 L19 7.8" />
                        </svg>
                      ) : (
                        status.icon
                      )}
                    </span>
                    <span>{claimed ? "已领取" : done ? "领取奖励" : "未完成"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">周任务</div>
        <div className="scroll-list">
          {TASK_DEFS.filter((def) => def.type === "weekly").map((def) => {
            const prog = weeklyTaskProgress[def.id] ?? 0;
            const claimed = weeklyTaskClaimedWeek === wk && weeklyTaskClaimed[def.id];
            const done = prog >= def.target;
            const ratio = Math.min(1, prog / def.target);
            const status = claimed
              ? { icon: "✓", label: "已领取", cls: "ok" }
              : done
                ? { icon: "★", label: "可领取", cls: "ready" }
                : { icon: "○", label: "未完成", cls: "todo" };

            const claim = () => {
              if (!done || claimed) return;
              if (soundOn) void playSfx("success", 0.7);
              if (sparkTimerRef.current) window.clearTimeout(sparkTimerRef.current);
              setSparkTaskId(def.id);
              sparkTimerRef.current = window.setTimeout(() => setSparkTaskId(null), 650);
              claimWeeklyTask(def.id);
            };

            return (
              <div key={def.id} className={`task-card ${claimed ? "claimed" : done ? "done" : ""}`}>
                <div className="task-ico" aria-hidden>
                  期
                </div>
                <div className="task-main">
                  <div className="task-row1">
                    <div className="task-title">{def.title}</div>
                    <div className="task-meta">
                      {Math.min(prog, def.target)} / {def.target}
                    </div>
                  </div>
                  <div className="progressbar" aria-hidden>
                    <div className="progressbar-fill" style={{ width: `${ratio * 100}%` }} />
                  </div>
                </div>
                <div className="task-side">
                  <div className={`task-reward ${sparkTaskId === def.id ? "spark" : ""}`}>
                    <span className="reward-ico" aria-hidden>
                      石
                    </span>
                    <span className="reward-num">{def.reward}</span>
                  </div>
                  <button
                    type="button"
                    className={done && !claimed ? "btn btn-primary" : "btn btn-paper"}
                    disabled={!done || claimed}
                    onClick={claim}
                  >
                    <span className={`status-ico ${status.cls} ${sparkTaskId === def.id ? "spark" : ""}`} aria-hidden>
                      {status.cls === "ok" ? (
                        <svg className="check-svg" viewBox="0 0 24 24">
                          <path d="M5 12.5 L10 17.2 L19 7.8" />
                        </svg>
                      ) : (
                        status.icon
                      )}
                    </span>
                    <span>{claimed ? "已领取" : done ? "领取奖励" : "未完成"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">成就</div>
        <div className="scroll-list">
          {ACHIEVEMENTS.map((a) => {
            const ok = !!achievements[a.id];
            return (
              <div key={a.id} className={`scroll-item ${ok ? "" : "scroll-item-dim"}`}>
                <div className="scroll-main">
                  <div className="scroll-row1">
                    <span className="scroll-name">{a.title}</span>
                    <span className="scroll-meta" style={{ color: ok ? "var(--accent)" : "var(--muted)" }}>
                      +{a.points} 点
                    </span>
                  </div>
                  <div className="scroll-row2">{a.description}</div>
                </div>
                <div className={`achv-badge ${ok ? "ok" : "muted"}`}>
                  <span className="status-ico" aria-hidden>
                    {ok ? (
                      <svg className="check-svg" viewBox="0 0 24 24">
                        <path d="M5 12.5 L10 17.2 L19 7.8" />
                      </svg>
                    ) : (
                      "○"
                    )}
                  </span>
                  <span className="status-text">{ok ? "达成" : "未达成"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">危险操作</div>
        <div className="scroll-list">
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">重置存档</span>
                <span className="scroll-meta">清空本地 LocalStorage</span>
              </div>
              <div className="scroll-actions">
                <button type="button" className="btn btn-paper" onClick={resetAll}>
                  清空本地存档并重置游戏
                </button>
              </div>
            </div>
            <div className="seal-tag seal-danger">慎</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionTab() {
  const inventory = useGameStore((s) => s.inventory);
  const decks = useGameStore((s) => s.decks);
  const activeDeck = useGameStore((s) => s.activeDeck);
  const createDeck = useGameStore((s) => s.createDeck);
  const deleteDeck = useGameStore((s) => s.deleteDeck);
  const addCardToDeck = useGameStore((s) => s.addCardToDeck);
  const removeCardFromDeck = useGameStore((s) => s.removeCardFromDeck);
  const setActiveDeck = useGameStore((s) => s.setActiveDeck);
  const getDeckCardSkills = useGameStore((s) => s.getDeckCardSkills);
  
  const [rarity, setRarity] = useState<"ALL" | "SSR" | "SR" | "R" | "N">("ALL");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [missingOnly, setMissingOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"rarity" | "name">("rarity");
  const [search, setSearch] = useState("");
  const [selectedCard, setSelectedCard] = useState<(typeof CARDS)[number] | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [showDeckManager, setShowDeckManager] = useState(false);
  
  const rarityD = useDeferredValue(rarity);
  const ownedOnlyD = useDeferredValue(ownedOnly);
  const missingOnlyD = useDeferredValue(missingOnly);
  const sortByD = useDeferredValue(sortBy);
  const searchD = useDeferredValue(search);
  const artCacheRef = useRef<Map<string, string>>(new Map());
  const [artRev, setArtRev] = useState(0);

  const resetFilters = () => {
    setRarity("ALL");
    setOwnedOnly(false);
    setMissingOnly(false);
    setSortBy("rarity");
    setSearch("");
  };

  const handleCreateDeck = () => {
    if (newDeckName.trim()) {
      const result = createDeck(newDeckName);
      if (result.success) {
        setNewDeckName("");
        setSelectedDeckId(result.deckId);
      }
    }
  };

  const handleDeleteDeck = (deckId: string) => {
    if (confirm("确定要删除这个卡组吗？")) {
      deleteDeck(deckId);
      if (selectedDeckId === deckId) {
        setSelectedDeckId(null);
      }
    }
  };

  const handleToggleCardInDeck = (cardId: string) => {
    if (!selectedDeckId) return;
    const deck = decks[selectedDeckId];
    if (!deck) return;
    
    if (deck.cardIds.includes(cardId)) {
      removeCardFromDeck(selectedDeckId, cardId);
    } else {
      addCardToDeck(selectedDeckId, cardId);
    }
  };

  const getArt = (c: (typeof CARDS)[number]) => {
    const cached = artCacheRef.current.get(c.id);
    if (cached) return cached;
    const url =
      portraitUrlForId(c.id) ??
      cardFrontUrl({
        id: c.id,
        name: c.name,
        rarity: c.rarity,
        element: c.element,
        keywords: c.keywords,
      });
    artCacheRef.current.set(c.id, url);
    return url;
  };

  useEffect(() => {
    const on = () => {
      artCacheRef.current.clear();
      setArtRev((x) => x + 1);
    };
    window.addEventListener("wfg:portrait-changed", on as EventListener);
    return () => window.removeEventListener("wfg:portrait-changed", on as EventListener);
  }, []);

  const total = CARDS.length;
  const owned = CARDS.reduce((acc, c) => acc + ((inventory[c.id] ?? 0) > 0 ? 1 : 0), 0);
  const ratio = total ? owned / total : 0;
  const list = useMemo(() => {
    return CARDS.filter((c) => (rarityD === "ALL" ? true : c.rarity === rarityD))
      .filter((c) => {
        if (ownedOnlyD) return (inventory[c.id] ?? 0) > 0;
        if (missingOnlyD) return (inventory[c.id] ?? 0) === 0;
        return true;
      })
      .filter((c) => {
        if (!searchD) return true;
        const q = searchD.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.keywords.some((k) => k.toLowerCase().includes(q)) ||
          c.element.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const an = inventory[a.id] ?? 0;
        const bn = inventory[b.id] ?? 0;
        if ((bn > 0) !== (an > 0)) return bn > 0 ? 1 : -1;
        
        if (sortByD === "rarity") {
          const order: Record<string, number> = { SSR: 4, SR: 3, R: 2, N: 1 };
          const dr = (order[b.rarity] ?? 0) - (order[a.rarity] ?? 0);
          if (dr !== 0) return dr;
          return a.name.localeCompare(b.name, "zh");
        } else {
          return a.name.localeCompare(b.name, "zh");
        }
      });
  }, [inventory, ownedOnlyD, missingOnlyD, rarityD, artRev, sortByD, searchD]);

  const deckList = Object.values(decks);
  const currentSkills = getDeckCardSkills();

  return (
    <div className="panel scroll-panel">
      <div className="scroll-banner scroll-banner-book" aria-hidden />
      <div className="scroll-head">
        <div className="scroll-kicker">阴阳寮 · 宝库</div>
        <div className="scroll-title">宝藏图鉴</div>
        <div className="scroll-sub">收集进度 {owned}/{total}</div>
        <div className="progressbar" aria-hidden style={{ marginTop: "0.6rem" }}>
          <div className="progressbar-fill" style={{ width: `${ratio * 100}%` }} />
        </div>
      </div>

      <div style={{ 
        marginBottom: "1rem", 
        padding: "0.8rem",
        background: "var(--bg-2)",
        borderRadius: "0.6rem",
        border: "1px solid var(--border)"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "0.6rem"
        }}>
          <span style={{ fontWeight: 700, color: "var(--text)" }}>卡组管理</span>
          <button
            type="button"
            className="btn btn-paper"
            onClick={() => setShowDeckManager(!showDeckManager)}
          >
            {showDeckManager ? "收起" : "展开"}
          </button>
        </div>
        
        {showDeckManager && (
          <>
            <div style={{ 
              display: "flex", 
              gap: "0.6rem", 
              marginBottom: "0.8rem",
              alignItems: "center"
            }}>
              <input
                type="text"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="输入新卡组名称"
                style={{ 
                  flex: 1,
                  padding: "0.6rem 0.8rem",
                  borderRadius: "0.5rem",
                  border: "2px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)"
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateDeck}
                disabled={!newDeckName.trim()}
              >
                创建卡组
              </button>
            </div>

            {deckList.length > 0 && (
              <div style={{ marginBottom: "0.8rem" }}>
                <div style={{ 
                  fontSize: "0.85rem", 
                  color: "var(--muted)", 
                  marginBottom: "0.4rem" 
                }}>
                  选择卡组进行编辑：
                </div>
                <div style={{ 
                  display: "flex", 
                  flexWrap: "wrap", 
                  gap: "0.5rem" 
                }}>
                  {deckList.map((deck) => (
                    <button
                      key={deck.id}
                      type="button"
                      style={{
                        padding: "0.5rem 0.9rem",
                        borderRadius: "0.5rem",
                        border: activeDeck === deck.id 
                          ? "2px solid #d8b25d" 
                          : selectedDeckId === deck.id 
                            ? "2px solid var(--accent)" 
                            : "2px solid var(--border)",
                        background: activeDeck === deck.id 
                          ? "linear-gradient(135deg, rgba(216,178,93,0.2), rgba(9,10,14,0.3))" 
                          : "var(--bg)",
                        color: "var(--text)",
                        fontSize: "0.9rem",
                        cursor: "pointer"
                      }}
                      onClick={() => setSelectedDeckId(deck.id)}
                    >
                      {deck.name}
                      {activeDeck === deck.id && " ✓"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedDeckId && decks[selectedDeckId] && (
              <div style={{ 
                padding: "0.7rem",
                background: "linear-gradient(135deg, rgba(147,112,219,0.1), rgba(9,10,14,0.3))",
                borderRadius: "0.5rem",
                border: "1px solid rgba(147,112,219,0.35)",
                marginBottom: "0.6rem"
              }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  marginBottom: "0.5rem"
                }}>
                  <div style={{ fontWeight: 700 }}>
                    「{decks[selectedDeckId].name}」
                    <span style={{ 
                      marginLeft: "0.5rem", 
                      fontSize: "0.85rem", 
                      color: "var(--muted)" 
                    }}>
                      ({decks[selectedDeckId].cardIds.length} 张卡牌)
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      type="button"
                      className="btn btn-paper"
                      onClick={() => setActiveDeck(
                        activeDeck === selectedDeckId ? null : selectedDeckId
                      )}
                    >
                      {activeDeck === selectedDeckId ? "取消激活" : "设为激活"}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleDeleteDeck(selectedDeckId)}
                    >
                      删除
                    </button>
                  </div>
                </div>
                
                {currentSkills.length > 0 && activeDeck === selectedDeckId && (
                  <div style={{ 
                    padding: "0.5rem",
                    background: "var(--bg-2)",
                    borderRadius: "0.4rem",
                    marginTop: "0.5rem"
                  }}>
                    <div style={{ 
                      fontSize: "0.82rem", 
                      fontWeight: 700, 
                      color: "var(--text)", 
                      marginBottom: "0.3rem" 
                    }}>
                      当前卡组技能：
                    </div>
                    {currentSkills.map((skill) => (
                      <div key={skill.id} style={{ 
                        fontSize: "0.8rem", 
                        color: "var(--muted)",
                        marginTop: "0.2rem"
                      }}>
                        • {skill.name}：{skill.description}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ 
                  fontSize: "0.8rem", 
                  color: "var(--muted)",
                  marginTop: "0.4rem"
                }}>
                  提示：点击下方的卡牌可以添加/移除到当前卡组（仅已拥有的卡牌可添加）
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="treasure-toolbar">
        <div style={{ marginBottom: "0.65rem" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索卡牌名称、关键词或元素…"
            className="search-input"
          />
        </div>
        <div className="segmented" role="tablist" aria-label="稀有度筛选">
          {(["ALL", "SSR", "SR", "R", "N"] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`seg-btn ${rarity === r ? "active" : ""}`}
              onClick={() => setRarity(r)}
              role="tab"
              aria-selected={rarity === r}
            >
              {r === "ALL" ? "全部" : r}
            </button>
          ))}
        </div>
        <div className="btn-row" style={{ gap: "0.45rem" }}>
          <button
            type="button"
            className={sortBy === "rarity" ? "btn btn-primary" : "btn btn-paper"}
            onClick={() => setSortBy("rarity")}
          >
            按稀有度
          </button>
          <button
            type="button"
            className={sortBy === "name" ? "btn btn-primary" : "btn btn-paper"}
            onClick={() => setSortBy("name")}
          >
            按名称
          </button>
          <button
            type="button"
            className={ownedOnly ? "btn btn-primary" : "btn btn-paper"}
            onClick={() => {
              setOwnedOnly(!ownedOnly);
              if (!ownedOnly) setMissingOnly(false);
            }}
          >
            只看已拥有
          </button>
          <button
            type="button"
            className={missingOnly ? "btn btn-primary" : "btn btn-paper"}
            onClick={() => {
              setMissingOnly(!missingOnly);
              if (!missingOnly) setOwnedOnly(false);
            }}
          >
            只看未获得
          </button>
          <button
            type="button"
            className="btn btn-paper"
            onClick={resetFilters}
          >
            重置
          </button>
        </div>
      </div>

      <PortraitWorkshop cards={CARDS} />

      <div className="treasure-grid">
        {list.map((c) => {
          const n = inventory[c.id] ?? 0;
          const hasPortrait = !!portraitUrlForId(c.id);
          const isInDeck = selectedDeckId && decks[selectedDeckId]?.cardIds.includes(c.id);
          const canAddToDeck = selectedDeckId && n > 0;
          return (
            <div
              key={c.id}
              className={`treasure-card ${n > 0 ? "owned" : "locked"} ${hasPortrait ? "has-portrait" : ""} ${rarityTierClass(c.rarity)}`}
              style={{ 
                outline: isInDeck ? "3px solid #667eea" : "none",
                outlineOffset: "-3px"
              }}
            >
              <div className="treasure-art" style={{ backgroundImage: `url("${getArt(c)}")` }} />
              <div className="treasure-top">
                <button
                  type="button"
                  className={`treasure-rarity ${rarityClass(c.rarity)}`}
                  onClick={() => setSelectedCard(c)}
                  aria-label={`查看${c.name}详情`}
                >
                  {c.rarity}
                </button>
                <span className="treasure-count">{n > 0 ? `×${n}` : "未获得"}</span>
              </div>
              <div className="treasure-bottom">
                <div className="treasure-name">{c.name}</div>
                <div className="treasure-tags">
                  {c.keywords.slice(0, 2).map((k) => (
                    <span key={k} className="treasure-tag">
                      {k}
                    </span>
                  ))}
                </div>
                {canAddToDeck && (
                  <button
                    type="button"
                    style={{
                      marginTop: "0.4rem",
                      padding: "0.3rem 0.6rem",
                      borderRadius: "0.4rem",
                      border: "1px solid var(--border)",
                      background: isInDeck ? "rgba(102,126,234,0.2)" : "var(--bg-2)",
                      color: "var(--text)",
                      fontSize: "0.75rem",
                      cursor: "pointer"
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCardInDeck(c.id);
                    }}
                  >
                    {isInDeck ? "移出卡组" : "加入卡组"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedCard && (
        <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} count={inventory[selectedCard.id] ?? 0} />
      )}
    </div>
  );
}

function CardDetailModal({
  card,
  onClose,
  count,
}: {
  card: (typeof CARDS)[number];
  onClose: () => void;
  count: number;
}) {
  const artCacheRef = useRef<Map<string, string>>(new Map());
  const cardLevels = useGameStore((s) => s.cardLevels);
  const cardBreakthroughs = useGameStore((s) => s.cardBreakthroughs);
  const upgradeCard = useGameStore((s) => s.upgradeCard);
  const breakthroughCard = useGameStore((s) => s.breakthroughCard);
  const coins = useGameStore((s) => s.coins);
  const currentLevel = cardLevels[card.id] ?? 1;
  const upgradeCost = currentLevel * 100;
  const canUpgrade = count > 0 && currentLevel < 10 && coins >= upgradeCost;
  
  const currentBreakthrough = cardBreakthroughs[card.id] ?? 0;
  const BREAKTHROUGH_LEVELS = [
    { level: 1, requiredCards: 3, requiredCoins: 500, bonusDescription: "技能效果+10%" },
    { level: 2, requiredCards: 5, requiredCoins: 1000, bonusDescription: "技能效果+20%" },
    { level: 3, requiredCards: 10, requiredCoins: 2500, bonusDescription: "技能效果+35%" },
  ];
  const nextBreakthrough = BREAKTHROUGH_LEVELS[currentBreakthrough];
  const canBreakthrough = 
    count > 0 && 
    currentBreakthrough < BREAKTHROUGH_LEVELS.length && 
    nextBreakthrough && 
    count >= nextBreakthrough.requiredCards && 
    coins >= nextBreakthrough.requiredCoins;

  const getArt = (c: (typeof CARDS)[number]) => {
    const cached = artCacheRef.current.get(c.id);
    if (cached) return cached;
    const url =
      portraitUrlForId(c.id) ??
      cardFrontUrl({
        id: c.id,
        name: c.name,
        rarity: c.rarity,
        element: c.element,
        keywords: c.keywords,
      });
    artCacheRef.current.set(c.id, url);
    return url;
  };

  const hasPortrait = !!portraitUrlForId(card.id);

  const getRarityDescription = (rarity: string) => {
    switch (rarity) {
      case "SSR": return "天地异象，千载难逢的至宝";
      case "SR": return "非凡之物，百年一遇的奇珍";
      case "R": return "不凡之品，十年难得的良品";
      default: return "寻常之物，随手可得";
    }
  };

  const getElementMeaning = (element: string) => {
    switch (element) {
      case "空": return "虚无之道，包容万象";
      case "日": return "阳刚之力，光明正大";
      case "月": return "阴柔之美，神秘莫测";
      case "星": return "灵动之机，变幻无常";
      default: return "自然之道，顺应天时";
    }
  };

  const getSkillEffect = () => {
    if (card.rarity === "SSR") {
      const bonus = 5 + currentLevel * 2;
      return `SSR 卡牌技能：略微提升运气（${bonus}% SSR、${Math.floor(bonus * 0.5)}% SR 概率加成）`;
    } else if (card.rarity === "SR") {
      const bonus = Math.floor(currentLevel / 2);
      return `SR 卡牌技能：减少保底进度（${bonus} 抽）`;
    }
    return "该稀有度暂无技能效果";
  };

  const handleUpgrade = () => {
    const result = upgradeCard(card.id);
    if (!result.success) {
      alert(result.error);
    }
  };

  const handleBreakthrough = () => {
    const result = breakthroughCard(card.id);
    if (!result.success) {
      alert(result.error);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal modal-wide">
        <h2 style={{ marginTop: 0 }}>卡牌详情</h2>

        <div className="pull-layout">
          <div
            className={`pull-detail-art ${hasPortrait ? "has-portrait" : ""} ${rarityTierClass(card.rarity)}`}
            style={{ backgroundImage: `url("${getArt(card)}")` }}
          />
          <div className="pull-detail-meta">
            <div className="pull-detail-title">
              <span className={`pull-rarity ${rarityClass(card.rarity)}`}>{card.rarity}</span>
              <span className="pull-name">{card.name}</span>
            </div>
            <div className="pull-detail-sub">
              <span>{card.element}</span>
              <span className="pull-detail-sep">·</span>
              <span>{card.keywords.join(" · ")}</span>
            </div>
            
            <div style={{ 
              marginTop: "1rem", 
              marginBottom: "1rem", 
              padding: "0.7rem",
              background: "var(--bg-2)",
              borderRadius: "0.6rem",
              border: "1px solid var(--border)"
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: "0.4rem"
              }}>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>拥有状态</span>
                <span style={{ 
                  fontFamily: "\"JetBrains Mono\", monospace", 
                  fontSize: "0.9rem",
                  color: count > 0 ? "var(--success)" : "var(--muted)"
                }}>
                  {count > 0 ? `×${count}` : "未获得"}
                </span>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: "1.5" }}>
                {count > 0 
                  ? `此卡已收入囊中${count > 1 ? `，共 ${count} 张` : ""}。` 
                  : "此卡尚未入手，继续努力！"
                }
              </div>
            </div>

            {count > 0 && (
              <div style={{ 
                marginBottom: "1rem", 
                padding: "0.7rem",
                background: "linear-gradient(135deg, rgba(216,178,93,0.1), rgba(9,10,14,0.3))",
                borderRadius: "0.6rem",
                border: "1px solid rgba(216,178,93,0.35)"
              }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  marginBottom: "0.6rem"
                }}>
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>卡牌等级</span>
                  <span style={{ 
                    fontFamily: "\"JetBrains Mono\", monospace", 
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "#d8b25d"
                  }}>
                    Lv.{currentLevel}/10
                  </span>
                </div>
                <div style={{ marginBottom: "0.6rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                  {getSkillEffect()}
                </div>
                {currentLevel < 10 && (
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    gap: "0.6rem"
                  }}>
                    <div style={{ 
                      flex: 1,
                      fontSize: "0.85rem",
                      color: "var(--muted)"
                    }}>
                      升级消耗：<span style={{ 
                        fontFamily: "\"JetBrains Mono\", monospace", 
                        color: coins >= upgradeCost ? "var(--accent)" : "var(--danger)"
                      }}>
                        {upgradeCost} 灵石
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleUpgrade}
                      disabled={!canUpgrade}
                    >
                      升级
                    </button>
                  </div>
                )}
                {currentLevel >= 10 && (
                  <div style={{ 
                    fontSize: "0.85rem",
                    color: "#d8b25d",
                    fontWeight: 700,
                    textAlign: "center"
                  }}>
                    ✨ 已达到最高等级！
                  </div>
                )}
              </div>
            )}

            {count > 0 && (currentBreakthrough > 0 || (card.rarity === "SSR" || card.rarity === "SR")) && (
              <div style={{ 
                marginBottom: "1rem", 
                padding: "0.7rem",
                background: "linear-gradient(135deg, rgba(147,112,219,0.1), rgba(9,10,14,0.3))",
                borderRadius: "0.6rem",
                border: "1px solid rgba(147,112,219,0.35)"
              }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  marginBottom: "0.6rem"
                }}>
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>突破等级</span>
                  <span style={{ 
                    fontFamily: "\"JetBrains Mono\", monospace", 
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "#9370db"
                  }}>
                    突破 {currentBreakthrough}/3
                  </span>
                </div>
                {currentBreakthrough > 0 && (
                  <div style={{ 
                    marginBottom: "0.6rem", 
                    fontSize: "0.82rem", 
                    color: "var(--muted)" 
                  }}>
                    当前加成：技能效果 +{currentBreakthrough >= 3 ? 35 : currentBreakthrough >= 2 ? 20 : 10}%
                  </div>
                )}
                {currentBreakthrough < 3 && nextBreakthrough && (
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start",
                    gap: "0.6rem",
                    flexDirection: "column"
                  }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                      下一突破：{nextBreakthrough.bonusDescription}
                    </div>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      gap: "0.6rem",
                      width: "100%"
                    }}>
                      <div style={{ flex: 1, fontSize: "0.85rem", color: "var(--muted)" }}>
                        需要：<span style={{ 
                          fontFamily: "\"JetBrains Mono\", monospace", 
                          color: count >= nextBreakthrough.requiredCards ? "var(--success)" : "var(--danger)"
                        }}>
                          {nextBreakthrough.requiredCards} 张
                        </span>
                        {" · "}
                        <span style={{ 
                          fontFamily: "\"JetBrains Mono\", monospace", 
                          color: coins >= nextBreakthrough.requiredCoins ? "var(--accent)" : "var(--danger)"
                        }}>
                          {nextBreakthrough.requiredCoins} 灵石
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn"
                        onClick={handleBreakthrough}
                        disabled={!canBreakthrough}
                      >
                        突破
                      </button>
                    </div>
                  </div>
                )}
                {currentBreakthrough >= 3 && (
                  <div style={{ 
                    fontSize: "0.85rem",
                    color: "#9370db",
                    fontWeight: 700,
                    textAlign: "center"
                  }}>
                    ⭐ 已达到最高突破！
                  </div>
                )}
              </div>
            )}

            <div style={{ 
              marginTop: "0.8rem", 
              marginBottom: "0.8rem",
              fontSize: "0.86rem",
              color: "var(--muted)",
              lineHeight: "1.6"
            }}>
              <div style={{ marginBottom: "0.35rem" }}>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>【稀有度】</span>
                <span style={{ marginLeft: "0.35rem" }}>{getRarityDescription(card.rarity)}</span>
              </div>
              <div>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>【属性】</span>
                <span style={{ marginLeft: "0.35rem" }}>{getElementMeaning(card.element)}</span>
              </div>
            </div>

            {card.description && (
              <div style={{ marginTop: "1rem", marginBottom: "0.8rem" }}>
                <div style={{ 
                  fontWeight: 700, 
                  marginBottom: "0.45rem", 
                  color: "var(--text)",
                  fontSize: "0.95rem"
                }}>📜 简介</div>
                <p style={{ 
                  margin: 0, 
                  color: "var(--muted)", 
                  lineHeight: "1.8", 
                  fontSize: "0.96rem",
                  padding: "0.5rem 0"
                }}>
                  {card.description}
                </p>
              </div>
            )}
            
            {card.story && (
              <div style={{ marginTop: "1rem", marginBottom: "0.8rem" }}>
                <div style={{ 
                  fontWeight: 700, 
                  marginBottom: "0.45rem", 
                  color: "var(--text)",
                  fontSize: "0.95rem"
                }}>📖 背景故事</div>
                <div style={{ 
                  padding: "0.7rem",
                  background: "linear-gradient(135deg, rgba(216,178,93,0.08), rgba(9,10,14,0.3))",
                  borderRadius: "0.5rem",
                  borderLeft: "3px solid var(--accent)"
                }}>
                  <p style={{ 
                    margin: 0, 
                    color: "var(--muted)", 
                    lineHeight: "1.9", 
                    fontSize: "0.96rem", 
                    fontStyle: "italic"
                  }}>
                    {card.story}
                  </p>
                </div>
              </div>
            )}
            
            <div className="pull-skills" style={{ marginTop: "1rem" }}>
              <div className="skill-card">
                <div className="skill-ico" aria-hidden>
                  技
                </div>
                <div>
                  <div className="skill-name">技能</div>
                  <div className="skill-desc">{card.keywords[0]}：触发时获得额外好运，助你一臂之力。</div>
                </div>
              </div>
              <div className="skill-card">
                <div className="skill-ico" aria-hidden>
                  奥
                </div>
                <div>
                  <div className="skill-name">奥义</div>
                  <div className="skill-desc">{card.keywords[1]}：在关键时刻扭转局势，改变命运的走向。</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="btn-row" style={{ marginTop: "1.2rem" }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const soundOn = useGameStore((s) => s.settings.soundOn);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const toggleReducedMotion = useGameStore((s) => s.toggleReducedMotion);
  const resetAll = useGameStore((s) => s.resetAll);
  const inventory = useGameStore((s) => s.inventory);
  const history = useGameStore((s) => s.history);
  const coins = useGameStore((s) => s.coins);
  const freePulls = useGameStore((s) => s.freePulls);
  const streak = useGameStore((s) => s.streak);
  const totalPulls = useGameStore((s) => s.totalPulls);
  const cloudSaveEnabled = useGameStore((s) => s.cloudSaveEnabled);
  const cloudLastSavedAt = useGameStore((s) => s.cloudLastSavedAt);
  const cloudLastSyncedAt = useGameStore((s) => s.cloudLastSyncedAt);
  const toggleCloudSave = useGameStore((s) => s.toggleCloudSave);
  const saveToCloud = useGameStore((s) => s.saveToCloud);
  const loadFromCloud = useGameStore((s) => s.loadFromCloud);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [savingToCloud, setSavingToCloud] = useState(false);
  const [loadingFromCloud, setLoadingFromCloud] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    setExporting(true);
    const saveData = useGameStore.getState();
    const exportData = {
      ...saveData,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `天机抽卡存档_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 500);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        useGameStore.setState(data);
        alert("存档导入成功！页面即将刷新。");
        location.reload();
      } catch (err) {
        alert("存档导入失败，请检查文件格式是否正确。");
      }
      setImporting(false);
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveToCloud = async () => {
    setSavingToCloud(true);
    const result = await saveToCloud();
    if (result.success) {
      alert("存档已保存到云端！");
    } else {
      alert(`保存失败：${result.error}`);
    }
    setSavingToCloud(false);
  };

  const handleLoadFromCloud = async () => {
    if (!confirm("从云端加载存档会覆盖当前本地存档，确定要继续吗？")) {
      return;
    }
    setLoadingFromCloud(true);
    const result = await loadFromCloud();
    if (result.success) {
      if (result.hasData) {
        alert("云端存档加载成功！");
        location.reload();
      } else {
        alert("云端没有找到存档。");
      }
    } else {
      alert(`加载失败：${result.error}`);
    }
    setLoadingFromCloud(false);
  };

  return (
    <div className="panel scroll-panel">
      <div className="scroll-banner" aria-hidden />
      <div className="scroll-head">
        <div className="scroll-kicker">阴阳寮 · 工房</div>
        <div className="scroll-title">设置</div>
        <div className="scroll-sub">调整游戏体验、管理存档数据。</div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">游戏体验</div>
        <div className="scroll-list">
          <div className="scroll-item scroll-item-clickable" onClick={toggleSound}>
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">音效</span>
                <span className="scroll-meta">{soundOn ? "开启" : "关闭"}</span>
              </div>
              <div className="scroll-row2">点击开启或关闭游戏音效。</div>
            </div>
            <div className={`toggle ${soundOn ? "on" : ""}`}>
              <div className="toggle-dot" />
            </div>
          </div>

          <div className="scroll-item scroll-item-clickable" onClick={toggleReducedMotion}>
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">跳过抽卡动画</span>
                <span className="scroll-meta">{reducedMotion ? "已开启" : "未开启"}</span>
              </div>
              <div className="scroll-row2">开启后将跳过抽卡特效与动画，直接展示结果。</div>
            </div>
            <div className={`toggle ${reducedMotion ? "on" : ""}`}>
              <div className="toggle-dot" />
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">云存档</div>
        <div className="scroll-list">
          <div className="scroll-item scroll-item-clickable" onClick={toggleCloudSave}>
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">云存档功能</span>
                <span className="scroll-meta">{cloudSaveEnabled ? "已启用" : "未启用"}</span>
              </div>
              <div className="scroll-row2">开启后可以将存档同步到云端，跨设备访问。</div>
            </div>
            <div className={`toggle ${cloudSaveEnabled ? "on" : ""}`}>
              <div className="toggle-dot" />
            </div>
          </div>

          {cloudSaveEnabled && (
            <>
              <div className="scroll-item">
                <div className="scroll-main">
                  <div className="scroll-row1">
                    <span className="scroll-name">同步状态</span>
                    <span className="scroll-meta">
                      {cloudLastSavedAt 
                        ? `上次保存：${new Date(cloudLastSavedAt).toLocaleString("zh-CN")}`
                        : "尚未保存到云端"}
                    </span>
                  </div>
                  {cloudLastSyncedAt && (
                    <div className="scroll-row2">
                      上次同步：{new Date(cloudLastSyncedAt).toLocaleString("zh-CN")}
                    </div>
                  )}
                  <div className="scroll-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveToCloud}
                      disabled={savingToCloud}
                    >
                      {savingToCloud ? "保存中…" : "保存到云端"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-paper"
                      onClick={handleLoadFromCloud}
                      disabled={loadingFromCloud}
                    >
                      {loadingFromCloud ? "加载中…" : "从云端加载"}
                    </button>
                  </div>
                </div>
                <div className="seal-tag">云</div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">本地存档</div>
        <div className="scroll-list">
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">导出存档</span>
                <span className="scroll-meta">JSON 文件</span>
              </div>
              <div className="scroll-row2">将当前游戏进度保存为文件，可用于备份或转移。</div>
              <div className="scroll-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? "导出中…" : "导出存档"}
                </button>
              </div>
            </div>
            <div className="seal-tag">存</div>
          </div>

          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">导入存档</span>
                <span className="scroll-meta">覆盖当前</span>
              </div>
              <div className="scroll-row2">从之前导出的文件恢复存档。此操作会覆盖当前进度。</div>
              <div className="scroll-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImport}
                  style={{ display: "none" }}
                  id="import-file"
                />
                <button
                  type="button"
                  className="btn btn-paper"
                  onClick={() => document.getElementById("import-file")?.click()}
                  disabled={importing}
                >
                  {importing ? "导入中…" : "选择文件"}
                </button>
              </div>
            </div>
            <div className="seal-tag">导</div>
          </div>
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">当前状态</div>
        <div className="scroll-list">
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">灵石</span>
                <span className="scroll-meta">{coins}</span>
              </div>
              <div className="scroll-row2">当前拥有的灵石数量。</div>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">免费抽</span>
                <span className="scroll-meta">{freePulls}</span>
              </div>
              <div className="scroll-row2">剩余可使用的免费抽次数。</div>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">连签</span>
                <span className="scroll-meta">{streak} 天</span>
              </div>
              <div className="scroll-row2">连续登录签到天数。</div>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">总抽数</span>
                <span className="scroll-meta">{totalPulls}</span>
              </div>
              <div className="scroll-row2">累计抽卡次数。</div>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">收集</span>
                <span className="scroll-meta">
                  {Object.keys(inventory).filter((id) => (inventory[id] ?? 0) > 0).length}/{CARDS.length}
                </span>
              </div>
              <div className="scroll-row2">图鉴收集进度。</div>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">历史记录</span>
                <span className="scroll-meta">{history.length} 条</span>
              </div>
              <div className="scroll-row2">抽卡历史记录数量。</div>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">危险操作</div>
        <div className="scroll-list">
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">重置存档</span>
                <span className="scroll-meta">清空本地 LocalStorage</span>
              </div>
              <div className="scroll-actions">
                <button type="button" className="btn btn-paper" onClick={resetAll}>
                  清空本地存档并重置游戏
                </button>
              </div>
            </div>
            <div className="seal-tag seal-danger">慎</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpTab() {
  return (
    <div className="panel scroll-panel">
      <div className="scroll-banner" aria-hidden />
      <div className="scroll-head">
        <div className="scroll-kicker">阴阳寮 · 典籍</div>
        <div className="scroll-title">游戏帮助</div>
        <div className="scroll-sub">快速了解天机抽卡的玩法与规则。</div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">入门指南</div>
        <div className="scroll-list">
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">祈愿（抽卡）</span>
                <span className="scroll-meta">核心玩法</span>
              </div>
              <div className="scroll-row2">
                消耗灵石进行抽卡。单抽 10 灵石，十连 90 灵石更划算。也可以通过任务和轮盘获取免费抽。
              </div>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">每日任务</span>
                <span className="scroll-meta">稳定收入</span>
              </div>
              <div className="scroll-row2">
                完成每日任务可以获得灵石奖励。记得每天来看看！
              </div>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">运势轮盘</span>
                <span className="scroll-meta">每日一次</span>
              </div>
              <div className="scroll-row2">
                每日可转动一次运势轮盘，获得各种加成：灵石加倍、抽卡加成、免费抽等。
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">保底机制</div>
        <div className="scroll-list">
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">SR 保底</span>
                <span className="scroll-meta">10 抽</span>
              </div>
              <div className="scroll-row2">
                连续 10 抽没有获得 SR 或 SSR 时，第 10 抽必定保底 SR 及以上。
              </div>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">SSR 保底</span>
                <span className="scroll-meta">60 抽</span>
              </div>
              <div className="scroll-row2">
                连续 60 抽没有获得 SSR 时，第 60 抽必定保底 SSR。
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">图鉴与立绘</div>
        <div className="scroll-list">
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">收集图鉴</span>
                <span className="scroll-meta">记录收藏</span>
              </div>
              <div className="scroll-row2">
                在图鉴页面可以查看所有卡牌，包括你已经获得和尚未获得的。
              </div>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">上传立绘</span>
                <span className="scroll-meta">自定义卡牌</span>
              </div>
              <div className="scroll-row2">
                你可以为喜欢的卡牌上传自定义立绘图片，让它们更符合你的喜好！
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">卡牌深度系统</div>
        <div className="scroll-list">
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">属性相克</span>
                <span className="scroll-meta">金木水火土阴阳</span>
              </div>
              <div className="scroll-row2">
                每张卡牌都有属性！属性相生相克：金克木，木克土，土克水，水克火，火克金，阴阳互克。组成卡组时可搭配克制敌人的属性！
              </div>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">套装效果</span>
                <span className="scroll-meta">收集特定卡牌</span>
              </div>
              <div className="scroll-row2">
                收集特定组合的卡牌可触发套装加成！提升抽卡运气、减少保底、灵石加倍等！
              </div>
            </div>
          </div>
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">卡牌突破</span>
                <span className="scroll-meta">消耗卡牌与灵石</span>
              </div>
              <div className="scroll-row2">
                SR及以上卡牌可消耗相同卡牌和灵石进行突破！突破1/2/3级分别提升技能效果10%/20%/35%！
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-section">
        <div className="scroll-section-title">关于</div>
        <div className="scroll-list">
          <div className="scroll-item">
            <div className="scroll-main">
              <div className="scroll-row1">
                <span className="scroll-name">纯前端本地存档</span>
                <span className="scroll-meta">数据安全</span>
              </div>
              <div className="scroll-row2">
                所有数据都保存在你的浏览器本地（LocalStorage），不会上传到任何服务器。记得定期导出存档备份！
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
