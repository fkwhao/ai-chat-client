# 🍎 Ethan's AI Chat Client (Desktop)

[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4fc08d)](https://vuejs.org/)
[![Electron](https://img.shields.io/badge/Electron-Latest-9feaf9)](https://www.electronjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38bdf8)](https://tailwindcss.com/)

基于 **Electron** 与 **Vue 3** 构建的跨平台 AI 对话桌面客户端。本项目不仅追求极致的响应速度，更在 UI 交互上深度致敬了 **iOS 系统美学**。

## 💎 设计语言 (Design Language)
* **Glassmorphism (玻璃拟态)**：全局采用 24px 深度背景模糊（Backdrop Blur）与半透明毛玻璃质感。
* **iOS Interactive**：
    * **3D 悬浮卡片**：使用 `perspective` 与 `rotate` 实现拟真交互视觉。
    * **Bouncy Animation**：采用苹果风格的 `cubic-bezier(0.34, 1.56, 0.64, 1)` 弹性过渡动画。
    * **Dynamic Dark Mode**：原生级深色模式切换，适配长时间编程者的用眼舒适度。
* **Responsive Sidebar**：可折叠式侧边栏，支持对话历史的无缝切换与管理。

## 🚀 核心特性
1. **多模型适配**：支持自定义 API Endpoint 与 Model Name，兼容 OpenAI 格式的各种大模型接口。
2. **本地配置管理**：所有 API 密钥通过 `localStorage` 存储在用户本地，代码级实现物理隐私隔离，无后端存储风险。
3. **Markdown 渲染增强**：集成 `highlight.js` 实现代码高亮，并针对“深度思考”内容提供了专属的折叠显示效果。
4. **Electron 赋能**：支持文件拖拽、剪贴板图片快速粘贴等原生桌面级交互体验。

## 🏗️ 目录结构
```text
src/
├── components/      # UI 组件（侧边栏、模型选择器等）
├── views/           # 页面视图（Chat 主界面、Settings 配置页）
├── router/          # Vue Router 路由管理
├── style.css        # 自定义 iOS 核心样式与动画库
└── main.js          # Vue 入口
electron-main.js     # Electron 主进程配置
