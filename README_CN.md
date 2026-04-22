# Spirit Ink · 灵墨 🔮

[**English**](./README.md) | [**中文**](./README_CN.md)

---

<img src="banner.jpg" alt="灵墨" width="100%">

**灵墨** 是一个 AI 驱动的 Token 可视化表达引擎。AI 通过自由文本 Token 表达自身状态，Token 被渲染为动态 3D 粒子形态——飘动的云团、闪烁的火焰、旋转的星河。

## ✨ 功能特性

- **自由 Token 表达** — AI 创造的 Token 是对自身状态的自由描述（一个词、短语或句子），而非预定义标签
- **35 种空间排列** — sphere、cloud、galaxy、flame、heart、dna、tornado、aurora、lotus、blackhole 等
- **13 种持续运动** — drift、orbit、pulse、flicker、flow、ripple、sway、wave 等
- **自动渲染生成** — 未映射的 Token 自动触发二次 AI 调用，生成视觉渲染参数
- **弹簧物理系统** — 所有参数过渡由弹簧-阻尼系统驱动，呈现有机的运动质感
- **多素材包管理** — 创建、切换、导入、导出素材包，实现不同视觉风格
- **Bloom 后处理** — UnrealBloomPass 辉光效果，强度由弹簧系统驱动

## 🚀 快速开始

1. 用现代浏览器（推荐 Chrome/Edge）打开 `index.html`
2. 点击右上角 ⚙ → 粘贴 API Key → 选择模型 → 保存
3. 在输入框输入任何内容 → 回车
4. 观看粒子变换为 AI 的视觉表达

## ⚙️ 配置说明

| 配置项 | 说明 | 范围 |
|--------|------|------|
| AI 提供商 | 智谱 GLM 或自定义 OpenAI 兼容端点 | — |
| API Key | 你的 API 密钥 | — |
| 模型 | 使用的 GLM 模型 | GLM-5.1 / 5 / 5-Turbo / 4.7 / 4.6 / 4.5-Air |
| 粒子数量 | 3D 场景中的粒子数 | 20–500 |

## 🎨 渲染参数

每个 Token 映射定义以下参数：

| 参数 | 说明 | 范围 |
|------|------|------|
| `arrangement` | 3D 空间排列 | 35 种（sphere, cloud, galaxy, ...） |
| `arrangement_scale` | 排列大小 | 0–1 |
| `movement` | 持续运动模式 | 13 种（drift, orbit, pulse, ...） |
| `movement_speed` | 运动速度 | 0.1–2 |
| `movement_amplitude` | 运动幅度 | 0.1–1 |
| `color` | RGB 颜色 | [0–1, 0–1, 0–1] |
| `spread` | 扩散/收缩 | -0.5–0.5 |
| `breathe_amp` | 呼吸幅度 | 0–0.025 |
| `breathe_freq` | 呼吸频率 | 0.5–2.5 Hz |
| `bloom_strength` | 辉光强度 | 0–0.5 |
| `duration` | 过渡时间 | 1000–5000 ms |
| `hold` | 过渡后是否保持 | true/false |

## 🛠 技术栈

- **Three.js** (r170) + WebGL — 自定义 ShaderMaterial 粒子渲染
- **EffectComposer** — UnrealBloomPass + OutputPass 后处理
- **弹簧物理** — 9 参数 SpringPool 驱动所有视觉过渡
- **智谱 GLM API** — AI Token 生成 + 渲染参数生成
- 纯前端，单 HTML 文件，无构建工具，无需服务器

## 📁 文件结构

```
spirit-ink/
├── index.html          # 主程序（v4.0）
├── providers.js        # AI 提供商模块（智谱 + 自定义）
├── AGENTS.md           # AI Agent 开发指引
├── DEVELOPMENT.md      # v4 设计文档
├── docs/
│   └── v3-new-proposal.md
├── README.md           # English docs
└── README_CN.md        # 中文文档
```

## 📄 License

MIT
