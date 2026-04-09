import { useMemo } from 'react';
import { useGameStore, CARDS } from '../store/gameStore';

export type StatDetailType = 'pulls' | 'sr' | 'ssr' | 'collection';

interface StatsDetailModalProps {
  type: StatDetailType;
  onClose: () => void;
}

export default function StatsDetailModal({ type, onClose }: StatsDetailModalProps) {
  const inventory = useGameStore((s) => s.inventory);
  const history = useGameStore((s) => s.history);

  const detailData = useMemo(() => {
    switch (type) {
      case 'pulls':
        const pullHistory = history.slice().reverse();
        return {
          title: '🎯 抽卡历史记录',
          subtitle: '查看所有抽卡记录',
          columns: [
            { key: 'time', label: '时间' },
            { key: 'card', label: '卡牌' },
            { key: 'rarity', label: '稀有度' },
          ],
          rows: pullHistory.map((record) => {
            const card = CARDS.find(c => c.id === record.cardId);
            return {
              time: new Date(record.at).toLocaleString('zh-CN'),
              card: card?.name || '未知',
              rarity: record.rarity,
              rarityClass: record.rarity,
            };
          }),
        };
      
      case 'sr':
        const srCards = CARDS.filter(c => c.rarity === 'SR');
        return {
          title: '⭐ SR卡牌收集详情',
          subtitle: '所有SR级卡牌的收集状态',
          columns: [
            { key: 'name', label: '式神名称' },
            { key: 'rarity', label: '稀有度' },
            { key: 'element', label: '元素' },
            { key: 'status', label: '收集状态' },
          ],
          rows: srCards.map((card) => ({
            name: card.name,
            rarity: card.rarity,
            rarityClass: card.rarity,
            element: card.element,
            status: inventory[card.id] ? '已收集' : '未收集',
            statusClass: inventory[card.id] ? 'collected' : 'missing',
          })),
        };
      
      case 'ssr':
        const ssrCards = CARDS.filter(c => c.rarity === 'SSR');
        return {
          title: '🌟 SSR卡牌收集详情',
          subtitle: '所有SSR级卡牌的收集状态',
          columns: [
            { key: 'name', label: '式神名称' },
            { key: 'rarity', label: '稀有度' },
            { key: 'element', label: '元素' },
            { key: 'status', label: '收集状态' },
          ],
          rows: ssrCards.map((card) => ({
            name: card.name,
            rarity: card.rarity,
            rarityClass: card.rarity,
            element: card.element,
            status: inventory[card.id] ? '已收集' : '未收集',
            statusClass: inventory[card.id] ? 'collected' : 'missing',
          })),
        };
      
      case 'collection':
        const allCards = CARDS.slice().sort((a, b) => {
          const rarityOrder = { 'SSR': 0, 'SR': 1, 'R': 2, 'N': 3 };
          return rarityOrder[a.rarity as keyof typeof rarityOrder] - rarityOrder[b.rarity as keyof typeof rarityOrder];
        });
        return {
          title: '📚 完整图鉴收集表',
          subtitle: '所有卡牌的完整收集状态',
          columns: [
            { key: 'name', label: '式神名称' },
            { key: 'rarity', label: '稀有度' },
            { key: 'element', label: '元素' },
            { key: 'count', label: '拥有数量' },
          ],
          rows: allCards.map((card) => ({
            name: card.name,
            rarity: card.rarity,
            rarityClass: card.rarity,
            element: card.element,
            count: inventory[card.id] || 0,
            countClass: (inventory[card.id] || 0) > 0 ? 'has' : 'none',
          })),
        };
      
      default:
        return {
          title: '数据详情',
          subtitle: '',
          columns: [],
          rows: [],
        };
    }
  }, [type, inventory, history]);

  const rarityClass = (r: string) => {
    if (r === 'SSR') return 'rarity-ssr';
    if (r === 'SR') return 'rarity-sr';
    if (r === 'R') return 'rarity-r';
    return 'rarity-n';
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal modal-wide stats-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="stats-detail-header">
          <div className="stats-detail-title-row">
            <h2 className="stats-detail-title">{detailData.title}</h2>
            <button type="button" className="btn btn-paper stats-detail-close" onClick={onClose}>
              ✕
            </button>
          </div>
          {detailData.subtitle && (
            <p className="stats-detail-subtitle">{detailData.subtitle}</p>
          )}
        </div>

        <div className="stats-detail-table-container">
          <table className="stats-detail-table">
            <thead>
              <tr>
                {detailData.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detailData.rows.map((row, index) => (
                <tr key={index} className="stats-detail-row">
                  {detailData.columns.map((col) => (
                    <td key={col.key}>
                      {col.key === 'rarity' ? (
                        <span className={`rarity-badge ${rarityClass((row as any).rarityClass || (row as any)[col.key])}`}>
                          {(row as any)[col.key]}
                        </span>
                      ) : col.key === 'status' ? (
                        <span className={`status-badge ${(row as any).statusClass}`}>
                          {(row as any)[col.key]}
                        </span>
                      ) : col.key === 'count' ? (
                        <span className={`count-badge ${(row as any).countClass}`}>
                          {(row as any)[col.key]}
                        </span>
                      ) : (
                        (row as any)[col.key]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stats-detail-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
