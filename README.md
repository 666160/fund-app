# 基金持仓管理 (养基宝 Web 版)

基于 Vue 3 + Uni-app + Vite 开发的基金持仓查看与管理工具，支持 H5 环境，并已优化 Vercel 部署。

## 🚀 主要功能

- **实时数据接入**：调用天天基金真实 API 接口，获取最准确的基金数据。
- **智能搜索**：实时搜索全量基金，支持代码与名称匹配。
- **持仓深度解析**：
  - 自动识别 **ETF 联接基金**，穿透显示底层 ETF 的真实重仓股。
  - 支持 **LOF、商品期货基金** 等特殊类型的数据解析。
- **可视化走势**：
  - 采用 **SVG 平滑曲线** 渲染日内走势。
  - 120 个高密度采样点，真实模拟盘中波动。
  - 渐变填充与动态涨跌配色。
- **持仓管理**：记录持有份额与成本，实时计算持有收益与当日损益。

## 🛠️ 技术栈

- **框架**：Vue 3 + Vite
- **跨端**：Uni-app
- **语言**：TypeScript
- **部署**：Vercel (配置了 Serverless Rewrites 解决 API 跨域)

## 📦 快速开始

### 本地开发
```bash
# 安装依赖
npm install

# 运行 H5 端
npm run dev:h5
```

### 构建部署
```bash
# 构建 H5 端
npm run build:h5
```

## ☁️ 部署说明 (Vercel)

本项目已预配置 `vercel.json`，支持一键部署到 Vercel：

1. 将代码推送到 GitHub。
2. 在 Vercel 导入仓库。
3. 确认以下配置：
   - **Framework Preset**: `Other` 或 `Vite`
   - **Build Command**: `npm run build:h5`
   - **Output Directory**: `dist/build/h5`
4. 点击 **Deploy** 即可。

## 📄 开源协议

MIT
