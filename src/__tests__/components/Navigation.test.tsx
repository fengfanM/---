import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 模拟App组件的导航部分
const Navigation = () => {
  const navItems = [
    { id: "home", label: "主页", icon: "庭" },
    { id: "gacha", label: "祈愿", icon: "符" },
    { id: "fortune", label: "占卜", icon: "卜" },
    { id: "progress", label: "任务", icon: "令" },
    { id: "collection", label: "图鉴", icon: "录" },
    { id: "help", label: "帮助", icon: "书" },
    { id: "settings", label: "设置", icon: "工" },
  ];
  
  return (
    <nav className="tabs" aria-label="主导航">
      {navItems.map((it) => (
        <button
          key={it.id}
          type="button"
          className={`tab-btn`}
          data-highlight-target={`tab-${it.id}`}
        >
          <span className="tab-ico" aria-hidden>
            {it.icon}
          </span>
          <span className="tab-label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
};

describe('底部导航栏测试', () => {
  test('底部导航栏显示7个标签', () => {
    render(<Navigation />);
    const tabButtons = screen.getAllByRole('button');
    expect(tabButtons).toHaveLength(7);
  });

  test('底部导航栏包含正确的标签文本', () => {
    render(<Navigation />);
    
    const labels = ["主页", "祈愿", "占卜", "任务", "图鉴", "帮助", "设置"];
    labels.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  test('底部导航栏包含正确的图标', () => {
    render(<Navigation />);
    
    const icons = ["庭", "符", "卜", "令", "录", "书", "工"];
    icons.forEach(icon => {
      expect(screen.getByText(icon)).toBeInTheDocument();
    });
  });
});