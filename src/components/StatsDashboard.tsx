import { useMemo } from 'react';
import { useGameStore, CARDS } from '../store/gameStore';

export function StatsDashboard() {
  const inventory = useGameStore((s) => s.inventory);
  const stats = useGameStore((s) => s.stats);
  const totalPulls = useGameStore((s) => s.totalPulls);
  const pullsSinceSR = useGameStore((s) => s.pullsSinceSR);
  const pullsSinceSSR = useGameStore((s) => s.pullsSinceSSR);

  const collectionStats = useMemo(() => {
    const totalCards = CARDS.length;
    const collectedCards = Object.keys(inventory).length;
    const collectionPercent = Math.round((collectedCards / totalCards) * 100);

    const rarityCount = { N: 0, R: 0, SR: 0, SSR: 0 };
    CARDS.forEach((card) => {
      if (inventory[card.id]) {
        rarityCount[card.rarity as keyof typeof rarityCount]++;
      }
    });

    return { totalCards, collectedCards, collectionPercent, rarityCount };
  }, [inventory]);

  const srProbability = Math.round(((stats.totalSr || 1) / (stats.totalPulls || 1)) * 100);
  const ssrProbability = Math.round(((stats.totalSsr || 1) / (stats.totalPulls || 1)) * 100);

  return (
    <div className="stats-dashboard">
      <div className="stats-header">
        <h2 className="stats-title">📊 游戏数据</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{totalPulls}</div>
          <div className="stat-label">总抽卡次数</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{stats.totalSr}</div>
          <div className="stat-label">获得SR卡</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🌟</div>
          <div className="stat-value">{stats.totalSsr}</div>
          <div className="stat-label">获得SSR卡</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-value">{collectionStats.collectionPercent}%</div>
          <div className="stat-label">图鉴完成度</div>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">保底状态</h3>
        <div className="pity-stats">
          <div className="pity-item">
            <span className="pity-label">SR 保底</span>
            <span className={`pity-value ${pullsSinceSR >= 7 ? 'warning' : ''}`}>
              {10 - pullsSinceSR}/10
            </span>
          </div>
          <div className="pity-item">
            <span className="pity-label">SSR 保底</span>
            <span className={`pity-value ${pullsSinceSSR >= 40 ? 'warning' : ''}`}>
              {50 - pullsSinceSSR}/50
            </span>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">出货率统计</h3>
        <div className="probability-stats">
          <div className="probability-bar">
            <div className="probability-label">SR 出货率</div>
            <div className="probability-track">
              <div 
                className="probability-fill sr" 
                style={{ width: `${Math.min(srProbability, 20)}%` }} 
              />
            </div>
            <span className="probability-percent">{srProbability}%</span>
          </div>
          <div className="probability-bar">
            <div className="probability-label">SSR 出货率</div>
            <div className="probability-track">
              <div 
                className="probability-fill ssr" 
                style={{ width: `${Math.min(ssrProbability, 5)}%` }} 
              />
            </div>
            <span className="probability-percent">{ssrProbability}%</span>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">图鉴收集</h3>
        <div className="collection-stats">
          <div className="collection-item">
            <span className="collection-rarity n">N</span>
            <span className="collection-count">
              {collectionStats.rarityCount.N}/{CARDS.filter(c => c.rarity === 'N').length}
            </span>
          </div>
          <div className="collection-item">
            <span className="collection-rarity r">R</span>
            <span className="collection-count">
              {collectionStats.rarityCount.R}/{CARDS.filter(c => c.rarity === 'R').length}
            </span>
          </div>
          <div className="collection-item">
            <span className="collection-rarity sr">SR</span>
            <span className="collection-count">
              {collectionStats.rarityCount.SR}/{CARDS.filter(c => c.rarity === 'SR').length}
            </span>
          </div>
          <div className="collection-item">
            <span className="collection-rarity ssr">SSR</span>
            <span className="collection-count">
              {collectionStats.rarityCount.SSR}/{CARDS.filter(c => c.rarity === 'SSR').length}
            </span>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">游戏记录</h3>
        <div className="record-stats">
          <div className="record-item">
            <span className="record-label">运势查看</span>
            <span className="record-value">{stats.fortuneReadCount}</span>
          </div>
          <div className="record-item">
            <span className="record-label">三牌阵</span>
            <span className="record-value">{stats.threeDrawCount}</span>
          </div>
          <div className="record-item">
            <span className="record-label">命运轮盘</span>
            <span className="record-value">{stats.wheelSpinCount}</span>
          </div>
          <div className="record-item">
            <span className="record-label">任务完成</span>
            <span className="record-value">{stats.taskCompletedCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
