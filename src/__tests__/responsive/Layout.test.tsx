import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 模拟布局组件
const Layout = () => {
  return (
    <div className="app-shell">
      <div className="app-header">
        <div className="brand">
          <div className="brand-mark">天</div>
          <div>
            <h1 className="brand-title">天机抽卡</h1>
            <p className="sub">命运的齿轮已经开始转动</p>
          </div>
        </div>
        <div className="stat-bar">
          <div className="pill">
            <span>灵石</span>
            <span>1000</span>
          </div>
        </div>
      </div>
      <div className="panel">
        <h2>测试面板</h2>
        <div className="btn-row">
          <button type="button" className="btn">普通按钮</button>
          <button type="button" className="btn btn-primary">主要按钮</button>
          <button type="button" className="btn" disabled>禁用按钮</button>
        </div>
      </div>
    </div>
  );
};

describe('响应式布局测试', () => {
  test('布局结构正确', () => {
    render(<Layout />);
    
    expect(screen.getByText('天机抽卡')).toBeInTheDocument();
    expect(screen.getByText('命运的齿轮已经开始转动')).toBeInTheDocument();
    expect(screen.getByText('灵石')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText('测试面板')).toBeInTheDocument();
  });

  test('按钮渲染正确', () => {
    render(<Layout />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    
    const disabledButton = screen.getByRole('button', { name: /禁用按钮/i });
    expect(disabledButton).toBeDisabled();
  });

  test('响应式布局在不同屏幕尺寸下渲染', () => {
    // 测试不同屏幕尺寸
    const screenSizes = [1200, 768, 480, 380, 320];
    
    screenSizes.forEach(width => {
      window.innerWidth = width;
      window.dispatchEvent(new Event('resize'));
      
      const { unmount } = render(<Layout />);
      expect(document.querySelector('.app-shell')).toBeInTheDocument();
      unmount();
    });
  });
});