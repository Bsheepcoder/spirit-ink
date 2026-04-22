# AGENTS.md

## 项目概述

Spirit Ink（灵墨）v4.0 — AI 驱动的 Token 可视化表达引擎。纯前端，无构建工具、无 Node.js。

## 开发方式

- 直接浏览器打开 `index.html` 即可运行
- 无 `package.json`、无 npm、无构建步骤
- Three.js 通过 CDN importmap 加载（`unpkg.com/three@0.170.0`）
- 不存在 lint/test/typecheck 命令

## 架构

- **单文件应用**：`index.html` 包含全部 CSS + JS（~1200 行）
- **唯一外部模块**：`providers.js` — 多模型 AI API 封装（智谱/OpenAI/Claude/Kimi/MiniMax/自定义），通过 `<script>` 标签引入，暴露 `window.SIProviders`
- Three.js 使用 ES Module（`type="module"` + importmap），`providers.js` 使用传统 `<script>`

## v4.0 两层包系统

```
Token 词典包（语义层）  → AI 看这个，决定返回什么 token 名
  ↓ token name（字符串）
素材映射包（渲染层）    → 引擎看这个，决定怎么画
```

- 同一个 token（如 "happy"），换个素材包就换一种画风（粒子→图片→GIF）
- AI 可以返回词典中不存在的 token → 用户弹窗添加
- 两个包都持久化到 localStorage（`si_dict` / `si_pack`）

## 数据流

```
用户输入 → PromptBuilder(读词典) → AI API → {"content":"...","tokens":["happy","heart"]}
→ TokenEngine.resolve() → 词典查表 + 素材包查映射
→ SpringPool 弹性插值 → Three.js 粒子渲染
```

## 关键约定

- AI 回复必须是纯 JSON：`{"content":"文字","tokens":["token1","token2"]}`
- 粒子颜色使用自定义属性 `aColor`（非 Three.js 内置 `color`）
- `providers.js` 同时支持 OpenAI 和 Anthropic 两种 API 格式
- `providers.js` 的 `call()` 内置 429 速率限制自动重试（5 秒）
- 对话历史限制 20 条，存内存（刷新丢失）
- SpringPool 替代了 v3 的内联 lerp，统一所有参数的过渡物理

## 代码内部结构（单文件内）

| Section | 内容 |
|---------|------|
| DEFAULT_DICTIONARY | 内联词典 JSON（25 个 token） |
| DEFAULT_ASSET_PACK | 内联粒子素材包 JSON |
| Spring + SpringPool | 弹簧物理，驱动颜色/扩散/呼吸/Bloom 过渡 |
| SHAPES | 8 个形状生成器（sphere/heart/ring/...） |
| TokenEngine | 加载词典/素材包、resolve 查表、compose 展开、未知 token 检测 |
| PromptBuilder | 从词典动态生成 system prompt |
| ParticleRenderer | Three.js + Bloom + ShaderMaterial |
| AI System | callAI 解析 tokens 字段、4 层 JSON 容错 |

## 注意事项

- 修改 `index.html` 时注意同时包含 `<style>` 和 `<script type="module">`
- JS 部分依赖全局 `SIProviders`（来自 providers.js 的传统脚本，必须在 module script 之前加载）
- 新增 token 只需修改 `DEFAULT_DICTIONARY` 和 `DEFAULT_ASSET_PACK` 两个 JSON 对象
- v4 重构方向详见 `DEVELOPMENT.md`（Phase 2: 图片/视频 Token, Phase 3: Agent 接入）
