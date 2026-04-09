import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface SmartTipProps {
  tipType: 'collection' | 'deck' | 'breakthrough';
  title: string;
  message: string;
}

export function SmartTip({ tipType, title, message }: SmartTipProps) {
  const [visible, setVisible] = useState(false);
  const showSmartTip = useGameStore((s) => s.showSmartTip);

  useEffect(() => {
    const shouldShow = showSmartTip(tipType);
    setVisible(shouldShow);
  }, [tipType]);

  if (!visible) return null;

  return (
    <div className="smart-tip">
      <div className="smart-tip-icon">💡</div>
      <div className="smart-tip-content">
        <div className="smart-tip-title">{title}</div>
        <div className="smart-tip-message">{message}</div>
      </div>
      <button 
        type="button" 
        className="smart-tip-close" 
        onClick={() => setVisible(false)}
        aria-label="关闭提示"
      >
        ×
      </button>
    </div>
  );
}
