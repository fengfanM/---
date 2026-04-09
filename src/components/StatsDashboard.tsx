import { useMemo, useState } from 'react';
import { useGameStore, CARDS } from '../store/gameStore';
import StatsDetailModal, { type StatDetailType } from './StatsDetailModal';

export function StatsDashboard() {
  const inventory = useGameStore((s) => s.inventory);
  const stats = useGameStore((s) => s.stats);
  const totalPulls = useGameStore((s) => s.totalPulls);
  const pullsSinceSR = useGameStore((s) => s.pullsSinceSR);
  const pullsSinceSSR = useGameStore((s) => s.pullsSinceSSR);
  const checkInStreak = useGameStore((s) => s.checkInStreak);
  const totalCheckIns = useGameStore((s) => s.totalCheckIns);

  const [detailType, setDetailType] = useState<StatDetailType | null>(null);

  const collectionStats = useMemo(() => {
    const totalCards = CARDS.length;
    const collectedCards = Object.keys(inventory).length;
    const collectionPercent = Math.round((collectedCards / totalCards) * 100);

    const rarityCount = { N: 0, R: 0, SR: 0, SSR: 0 };
    const totalRarityCount = { N: 0, R: 0, SR: 0, SSR: 0 };
    
    CARDS.forEach((card) => {
      totalRarityCount[card.rarity as keyof typeof totalRarityCount]++;
      if (inventory[card.id]) {
        rarityCount[card.rarity as keyof typeof rarityCount]++;
      }
    });

    return { totalCards, collectedCards, collectionPercent, rarityCount, totalRarityCount };
  }, [inventory]);

  const srProbability = totalPulls > 0 ? Math.round(((stats.totalSr || 0) / totalPulls) * 1000) / 10 : 0;
  const ssrProbability = totalPulls > 0 ? Math.round(((stats.totalSsr || 0) / totalPulls) * 1000) / 10 : 0;

  return (
    <div className="stats-dashboard">
      <div className="stats-header">
        <h2 className="stats-title">📊 数据统计中心</h2>
      </div>

      <div className="stats-grid">
        <div 
          className="stat-card stat-card-glow clickable" 
          onClick={() => setDetailType('pulls')}
        >
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{totalPulls}</div>
          <div className="stat-label">总抽卡次数</div>
        </div>

        <div 
          className="stat-card stat-card-glow gold clickable" 
          onClick={() => setDetailType('sr')}
        >
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{stats.totalSr}</div>
          <div className="stat-label">获得SR卡</div>
        </div>

        <div 
          className="stat-card stat-card-glow rainbow clickable" 
          onClick={() => setDetailType('ssr')}
        >
          <div className="stat-icon">🌟</div>
          <div className="stat-value">{stats.totalSsr}</div>
          <div className="stat-label">获得SSR卡</div>
        </div>

        <div 
          className="stat-card stat-card-glow purple clickable" 
          onClick={() => setDetailType('collection')}
        >
          <div className="stat-icon">📚</div>
          <div className="stat-value">{collectionStats.collectionPercent}%</div>
          <div className="stat-label">图鉴完成度</div>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">🎰 保底进度</h3>
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
        <h3 className="stats-section-title">📈 出货率统计</h3>
        <div className="probability-stats">
          <div className="probability-bar">
            <div className="probability-label">SR 出货率</div>
            <div className="probability-track">
              <div 
                className="probability-fill sr animated" 
                style={{ width: `${Math.min(srProbability * 5, 100)}%` }} 
              />
            </div>
            <span className="probability-percent">{srProbability}%</span>
          </div>
          <div className="probability-bar">
            <div className="probability-label">SSR 出货率</div>
            <div className="probability-track">
              <div 
                className="probability-fill ssr animated" 
                style={{ width: `${Math.min(ssrProbability * 20, 100)}%` }} 
              />
            </div>
            <span className="probability-percent">{ssrProbability}%</span>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">🎨 图鉴收集进度</h3>
        <div className="collection-bar-chart">
          <div className="bar-chart-item">
            <div className="bar-chart-label">
              <span className="collection-rarity n">N</span>
            </div>
            <div className="bar-chart-track">
              <div 
                className="bar-chart-fill n"
                style={{ 
                  width: `${(collectionStats.rarityCount.N / collectionStats.totalRarityCount.N) * 100}%` 
                }}
              />
            </div>
            <span className="bar-chart-value">
              {collectionStats.rarityCount.N}/{collectionStats.totalRarityCount.N}
            </span>
          </div>
          <div className="bar-chart-item">
            <div className="bar-chart-label">
              <span className="collection-rarity r">R</span>
            </div>
            <div className="bar-chart-track">
              <div 
                className="bar-chart-fill r"
                style={{ 
                  width: `${(collectionStats.rarityCount.R / collectionStats.totalRarityCount.R) * 100}%` 
                }}
              />
            </div>
            <span className="bar-chart-value">
              {collectionStats.rarityCount.R}/{collectionStats.totalRarityCount.R}
            </span>
          </div>
          <div className="bar-chart-item">
            <div className="bar-chart-label">
              <span className="collection-rarity sr">SR</span>
            </div>
            <div className="bar-chart-track">
              <div 
                className="bar-chart-fill sr"
                style={{ 
                  width: `${(collectionStats.rarityCount.SR / collectionStats.totalRarityCount.SR) * 100}%` 
                }}
              />
            </div>
            <span className="bar-chart-value">
              {collectionStats.rarityCount.SR}/{collectionStats.totalRarityCount.SR}
            </span>
          </div>
          <div className="bar-chart-item">
            <div className="bar-chart-label">
              <span className="collection-rarity ssr">SSR</span>
            </div>
            <div className="bar-chart-track">
              <div 
                className="bar-chart-fill ssr"
                style={{ 
                  width: `${(collectionStats.rarityCount.SSR / collectionStats.totalRarityCount.SSR) * 100}%` 
                }}
              />
            </div>
            <span className="bar-chart-value">
              {collectionStats.rarityCount.SSR}/{collectionStats.totalRarityCount.SSR}
            </span>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">🎲 抽卡统计饼图</h3>
        <div className="pie-chart-container">
          <div 
            className="pie-chart" 
            style={
              {
                '--n-percent': `${((totalPulls - stats.totalSr - stats.totalSsr) / Math.max(totalPulls, 1)) * 100}%`,
                '--r-percent': `${(stats.totalSr / Math.max(totalPulls, 1)) * 100}%`,
                '--sr-percent': `${(stats.totalSr / Math.max(totalPulls, 1)) * 100}%`,
                '--ssr-percent': `${(stats.totalSsr / Math.max(totalPulls, 1)) * 100}%`
              } as React.CSSProperties
            }
          >
            <div className="pie-slice n" />
            <div className="pie-slice r" />
            <div className="pie-slice sr" />
            <div className="pie-slice ssr" />
          </div>
          <div className="pie-legend">
            <div className="pie-legend-item">
              <div className="pie-legend-color n" />
              <span>N/R 卡</span>
              <span className="pie-legend-percent">{Math.round(((totalPulls - stats.totalSr - stats.totalSsr) / Math.max(totalPulls, 1)) * 100)}%</span>
            </div>
            <div className="pie-legend-item">
              <div className="pie-legend-color sr" />
              <span>SR 卡</span>
              <span className="pie-legend-percent">{Math.round((stats.totalSr / Math.max(totalPulls, 1)) * 100)}%</span>
            </div>
            <div className="pie-legend-item">
              <div className="pie-legend-color ssr" />
              <span>SSR 卡</span>
              <span className="pie-legend-percent">{Math.round((stats.totalSsr / Math.max(totalPulls, 1)) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">🔥 签到记录</h3>
        <div className="checkin-stats">
          <div className="checkin-card">
            <div className="checkin-icon">📅</div>
            <div className="checkin-value">{checkInStreak}</div>
            <div className="checkin-label">连续签到</div>
          </div>
          <div className="checkin-card">
            <div className="checkin-icon">✨</div>
            <div className="checkin-value">{totalCheckIns}</div>
            <div className="checkin-label">总签到次数</div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">🎮 游戏记录</h3>
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

      {detailType && (
        <StatsDetailModal 
          type={detailType} 
          onClose={() => setDetailType(null)} 
        />
      )}
    </div>
  );
}
