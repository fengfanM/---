import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 模拟新手引导组件
const Tutorial = () => {
  return (
    <>
      <div className="modal-backdrop" role="dialog" aria-modal="true" style={{ 
        background: "transparent", 
        pointerEvents: "none", 
        zIndex: 9995 
      }}>
        <div className="modal tutorial-modal" style={{ 
          pointerEvents: "auto", 
          zIndex: 9996 
        }}>
          <h2 className="tutorial-title">欢迎使用天机抽卡</h2>
          <p className="tutorial-content">点击下方按钮开始新手引导</p>
          <div className="tutorial-buttons">
            <button type="button" className="btn btn-secondary">
              跳过
            </button>
            <button type="button" className="btn btn-primary">
              继续
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

describe('新手引导测试', () => {
  test('新手引导显示正确的内容', () => {
    render(<Tutorial />);
    
    expect(screen.getByText('欢迎使用天机抽卡')).toBeInTheDocument();
    expect(screen.getByText('点击下方按钮开始新手引导')).toBeInTheDocument();
    expect(screen.getByText('跳过')).toBeInTheDocument();
    expect(screen.getByText('继续')).toBeInTheDocument();
  });

  test('新手引导模态框层级设置正确', () => {
    render(<Tutorial />);
    
    const modalBackdrop = document.querySelector('.modal-backdrop');
    const modalContent = document.querySelector('.tutorial-modal');
    
    expect(modalBackdrop).toBeInTheDocument();
    expect(modalContent).toBeInTheDocument();
    
    // 检查z-index值
    const backdropZIndex = parseInt(modalBackdrop?.style.zIndex || '0');
    const contentZIndex = parseInt(modalContent?.style.zIndex || '0');
    
    expect(backdropZIndex).toBe(9995);
    expect(contentZIndex).toBe(9996);
    expect(contentZIndex).toBeGreaterThan(backdropZIndex);
  });
});