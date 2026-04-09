import { useGameStore } from '../store/gameStore';

export function LoadingOverlay() {
  const isLoading = useGameStore((s) => s.isLoading);
  const loadingMessage = useGameStore((s) => s.loadingMessage);

  if (!isLoading) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner" />
        {loadingMessage && (
          <div className="loading-text">
            {loadingMessage}
            <span className="loading-dots">
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
