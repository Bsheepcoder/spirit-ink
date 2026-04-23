# AGENTS.md

## 项目概述

Spirit Ink（灵墨）v4.0 — AI 驱动的 Token 可视化表达引擎。纯前端，无构建工具、无 Node.js。

## 开发方式

- 直接浏览器打开 `index.html` 即可运行
- 无 `package.json`、无 npm、无构建步骤
- Three.js 通过 CDN importmap 加载（`unpkg.com/three@0.170.0`）
- 不存在 lint/test/typecheck 命令

## 架构

- **单文件应用**：`index.html` 包含全部 CSS + JS（~1667 行）
- **唯一外部模块**：`providers.js` — AI API 封装（智谱 GLM / 自定义 OpenAI 兼容端点），通过 `<script>` 标签引入，暴露 `window.SIProviders`
- Three.js 使用 ES Module（`type="module"` + importmap），`providers.js` 使用传统 `<script>`

## v4.0 两层包系统

```
Token 词典（语义层）  → AI 看这个，决定返回什么 token 名
  ↓ token name（自由文本）
素材映射包（渲染层）  → 引擎看这个，决定怎么画
```

- Token 是 AI 对自身状态的自由表达（词/短语/句子），不是预定义分类标签
- 词典初始为空，AI 返回新 token 时自动添加
- 未映射的 token 自动触发二次 AI 调用生成渲染参数
- 同一 token 换素材包可换画风
- 持久化到 localStorage（`si_dict` / `si_packs` / `si_active_pack`）

## 数据流

```
用户输入 → PromptBuilder(读词典) → AI API → {"content":"...","tokens":["阳光般的喜悦"]}
→ TokenEngine.resolve() → 词典查表 + 素材包查映射
  → 已映射：直接应用 arrangement + movement + color
  → 未映射：自动调用 RENDER_ANALYZER_PROMPT 生成渲染参数 → 保存到素材包 → 应用
→ SpringPool 弹性插值 → Three.js 粒子渲染
```

## 映射参数体系

```json
{
  "arrangement": "cloud",        // 空间排列（35 种）
  "arrangement_scale": 0.6,      // 排列大小 0~1
  "movement": "drift",           // 持续运动（13 种）
  "movement_speed": 0.3,         // 运动速度 0.1~2
  "movement_amplitude": 0.5,     // 运动幅度 0.1~1
  "color": [0.92, 0.94, 0.98],  // RGB 0~1
  "spread": 0.15,                // 扩散 -0.5~0.5
  "breathe_amp": 0.008,          // 呼吸幅度 0~0.025
  "breathe_freq": 0.5,           // 呼吸频率 0.5~2.5 Hz
  "bloom_strength": 0.15,        // 辉光强度 0~0.5
  "duration": 2500,              // 过渡时间 ms
  "hold": true                   // 保持形状
}
```

### ARRANGEMENTS（35 种空间排列）

| 分类 | 排列 |
|------|------|
| 几何 | sphere, point, ring, line, wave, heart, star, spiral, cube, torus, helix, grid, diamond |
| 自然 | cloud, rain, flame, snow, mountain, ocean, aurora, waterfall, tornado |
| 宇宙 | galaxy, nebula, starfield, comet, blackhole, supernova |
| 抽象 | vortex, fountain, bloom, dna, lotus, feather, rainbow |

### MOVEMENTS（13 种持续运动）

drift, float_up, fall_down, orbit, pulse, spiral_motion, flicker, flow, breathe_motion, ripple, sway, vibrate, wave_motion

## 关键约定

- AI 回复必须是纯 JSON：`{"content":"文字","tokens":["token1","token2"]}`
- 粒子颜色使用自定义属性 `aColor`（非 Three.js 内置 `color`）
- `providers.js` 使用 OpenAI 兼容格式，支持 429 速率限制自动重试（5 秒）
- 对话历史限制 20 条，存内存（刷新丢失）
- SpringPool 管理颜色/扩散/呼吸/Bloom 等 9 个弹簧参数
- 物理循环中 movement 作为位置偏移叠加到 arrangement 目标上，弹簧自动追踪动态目标
- 旧格式 `shape`/`tightness` 自动映射为 `arrangement`/`arrangement_scale`（向后兼容）

## 代码内部结构（单文件内）

| Section | 内容 |
|---------|------|
| DEFAULT_DICTIONARY | 词典 JSON（初始为空，动态填充） |
| DEFAULT_ASSET_PACK | 粒子素材包 JSON（初始为空） |
| Spring + SpringPool | 弹簧物理，驱动 9 个参数的过渡（color_r/g/b, spread, speed, breathe_amp/freq, bloom_strength/threshold） |
| ARRANGEMENTS | 35 个空间排列生成器（sphere/cloud/galaxy/...） |
| MOVEMENTS | 13 个持续运动函数（drift/orbit/pulse/...） |
| TokenEngine | 词典/素材包 CRUD、resolve 查表、compose 展开、未映射 token 自动触发渲染生成 |
| PromptBuilder | 从词典动态生成 system prompt（含已映射/未映射 token 列表） |
| RENDER_ANALYZER_PROMPT | 二次 AI 调用 prompt，将 token 语义转化为 arrangement + movement + color |
| Particle System | Three.js + Bloom + ShaderMaterial + OrbitControls |
| AI System | callAI：4 层 JSON 容错、自动渲染生成、速率限制重试 |

## localStorage 键

| 键 | 用途 |
|----|------|
| `si_dict` | Token 词典 |
| `si_packs` | 所有素材包 |
| `si_active_pack` | 当前活跃素材包 ID |
| `si_provider` | AI 提供商 ID |
| `si_k` | API Key |
| `si_m` | 模型 ID |
| `si_apiBase` | 自定义 API 地址 |
| `si_n` | 粒子数量 |

## 注意事项

- 修改 `index.html` 时注意同时包含 `<style>` 和 `<script type="module">`
- JS 部分依赖全局 `SIProviders`（来自 providers.js 的传统脚本，必须在 module script 之前加载）
- `SHAPES = ARRANGEMENTS`（别名，向后兼容）
- v4 重构方向详见 `DEVELOPMENT.md`
