import { useMemo, useRef } from 'react';
import { CARDS } from '../store/gameStore';
import { portraitUrlForId, cardFrontUrl } from '../lib/gameAssets';

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

interface CollectionModalProps {
  rarity: 'N' | 'R' | 'SR' | 'SSR';
  inventory: Record<string, number>;
  onClose: () => void;
}

export default function CollectionModal({ rarity, inventory, onClose }: CollectionModalProps) {
  const artCacheRef = useRef<Map<string, string>>(new Map());
  
  const cards = useMemo(() => {
    return CARDS.filter((c) => c.rarity === rarity);
  }, [rarity]);
  
  const getArt = (card: typeof CARDS[0]) => {
    const id = card.id;
    const cached = artCacheRef.current.get(id);
    if (cached) return cached;
    const url =
      portraitUrlForId(card.id) ??
      cardFrontUrl({
        id: card.id,
        name: card.name,
        rarity: card.rarity,
        element: card.element,
        keywords: card.keywords,
      });
    artCacheRef.current.set(id, url);
    return url;
  };
  
  const rarityTitle = {
    'N': 'N 级卡牌',
    'R': 'R 级卡牌',
    'SR': 'SR 级卡牌',
    'SSR': 'SSR 级卡牌'
  };
  
  const collectedCount = cards.filter(c => inventory[c.id]).length;
  
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal modal-wide collection-modal">
        <div className="collection-modal-header">
          <h2 className="collection-modal-title">{rarityTitle[rarity]}</h2>
          <div className="collection-modal-count">
            已收集 {collectedCount}/{cards.length}
          </div>
        </div>
        
        <div className="collection-modal-grid">
          {cards.map((card) => {
            const hasPortrait = !!portraitUrlForId(card.id);
            const isCollected = !!inventory[card.id];
            
            return (
              <div 
                key={card.id} 
                className={`collection-modal-item ${isCollected ? 'collected' : 'locked'}`}
              >
                <div
                  className={`collection-modal-art ${hasPortrait ? 'has-portrait' : ''} ${rarityTierClass(rarity)}`}
                  style={{ 
                    backgroundImage: `url("${getArt(card)}")`,
                    filter: isCollected ? 'none' : 'grayscale(100%) brightness(0.4)'
                  }}
                />
                <div className="collection-modal-info">
                  <span className={`collection-modal-rarity ${rarityClass(rarity)}`}>{rarity}</span>
                  <span className="collection-modal-name">{card.name}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="collection-modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
