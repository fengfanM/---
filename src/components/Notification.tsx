import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { playSfx } from '../lib/gameAssets';

export function AchievementNotification() {
  const achievementNotification = useGameStore((s) => s.achievementNotification);
  const dismissAchievementNotification = useGameStore((s) => s.dismissAchievementNotification);
  const soundOn = useGameStore((s) => s.settings.soundOn);

  useEffect(() => {
    if (achievementNotification.visible && soundOn) {
      void playSfx('achievement', 0.8);
    }
  }, [achievementNotification.visible, soundOn]);

  if (!achievementNotification.visible) return null;

  return (
    <div className="achievement-notification" role="alert" aria-live="assertive">
      <div className="notification-icon">{achievementNotification.icon}</div>
      <div className="notification-title">{achievementNotification.title}</div>
      <div className="notification-message">{achievementNotification.message}</div>
      <button 
        type="button" 
        className="notification-close" 
        onClick={dismissAchievementNotification}
        aria-label="关闭通知"
      >
        ×
      </button>
    </div>
  );
}
