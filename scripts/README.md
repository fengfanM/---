## 本地 Stable Diffusion 一键生成立绘（自动替换）

本项目已支持把 `src/assets/portraits/<cardId>.webp|png` 作为主图，缺失会回退到 SVG。

### 最简单方式（推荐）：A1111/Forge 开启 API

1. 安装并启动 A1111（或 Forge），启动参数包含 `--api`
2. 确认能打开：`http://127.0.0.1:7860/`
3. 在项目根目录运行：

```bash
python3 scripts/gen_portraits_a1111.py --api http://127.0.0.1:7860 --out src/assets/portraits
```

生成完成后刷新页面，图鉴/获卡弹窗/翻牌会自动使用立绘。

### 常用参数

- 画幅：`--width 768 --height 1104`（约 9:13）
- 步数：`--steps 28`
- 采样器：`--sampler "DPM++ 2M Karras"`
- 跳过已有：默认跳过；加 `--no-skip-existing` 重新生成

