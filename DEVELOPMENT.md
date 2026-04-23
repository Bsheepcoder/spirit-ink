# Spirit Ink v4.0 — AI 驱动的 Token 可视化表达引擎

> 完整开发文档 | 2026-04-23

---

## 一、项目概述

### 1.1 一句话定义

Spirit Ink 是一个 **AI 驱动的 Token 可视化表达引擎**——AI 通过自由文本 Token 表达自身状态，引擎将 Token 映射为粒子动画（未来支持图片/GIF/视频），实现「AI 有身体」。

### 1.2 核心设计原则

**Token 与素材解耦**：

```
Token 是语义概念：  "流动的云团" → AI 的自由表达
素材是渲染实现：    粒子包: cloud + curl_flow + palette:ocean
                    图片包: cloud.jpg（Phase 2）
```

AI 只决定「说什么」，不关心怎么渲染。同一个 token 换素材包就换画风。

**越用越灵活**：

- 词典初始为空，AI 返回新 token 时自动添加
- 未映射的 token 自动触发二次 AI 调用生成渲染参数
- 系统无需预定义任何 token，完全由 AI 自由表达

### 1.3 产品愿景

```
用户说话 → AI 自由表达 token → 引擎自动查映射/生成映射 → 粒子渲染
          ↓
     换素材包 = 换画风（粒子→图片→GIF→视频）
```

最终目标：AI 完全自主表达 → 多渲染器切换 → Agent 接入生图生视频 → 表达引擎自进化。

---

## 二、架构设计

### 2.1 两层包系统

```
┌─────────────────────────────────────────┐
│           Token 词典（语义层）             │
│  AI 看这个，决定返回什么 token             │
│  初始为空，动态填充                        │
│  token 是 AI 对自身状态的自由描述          │
└──────────────────┬──────────────────────┘
                   │ token name（自由文本）
                   ▼
┌─────────────────────────────────────────┐
│         素材映射包（渲染层）               │
│  引擎看这个，决定怎么画                    │
│  未映射 → 自动调用 RENDER_ANALYZER_PROMPT │
│         → AI 生成渲染参数 → 保存映射      │
└─────────────────────────────────────────┘
```

### 2.2 完整数据流

```
[1] 用户输入 "你好"
       │
[2] PromptBuilder 读 Token 词典
       │  列出已映射/未映射 token
       │  AI 不知道渲染细节
       │
[3] AI 返回
       │  {"content": "你好呀！", "tokens": ["阳光般的喜悦"]}
       │
[4] TokenEngine.resolve(["阳光般的喜悦"])
       │  a. 查词典: 不存在 → 自动添加到词典
       │  b. 查素材包: 无映射 → 加入 pendingRender
       │
[5] 自动渲染生成（新增！）
       │  a. 调用 RENDER_ANALYZER_PROMPT
       │  b. AI 分析 "阳光般的喜悦" 的语义
       │  c. 返回渲染参数:
       │     {arrangement:"bloom", movement:"curl_flow",
       │      palette:"sunset", ...}
       │  d. 保存到素材包映射
       │
[6] 应用渲染参数
       │  SpringPool ← color/spread/breathe/bloom
       │  queueShapeAction ← arrangement + movement
       │
[7] 渲染循环
       │  弹簧物理驱动参数过渡
       │  粒子追踪 arrangement 目标 + movement 偏移
       │  palette 驱动每粒子渐变色
       │  Bloom 后处理
       │
[8] 用户看到画面
```

### 2.3 映射参数体系

一个完整的映射示例：

```json
{
  "arrangement": "cloud",
  "arrangement_scale": 0.6,
  "movement": "curl_flow",
  "movement_speed": 0.3,
  "movement_amplitude": 0.5,
  "noise_freq": 0.8,
  "color": [0.92, 0.94, 0.98],
  "palette": "ocean",
  "color_variation": 0.1,
  "spread": 0.15,
  "breathe_amp": 0.008,
  "breathe_freq": 0.5,
  "bloom_strength": 0.15,
  "duration": 2500,
  "hold": true
}
```

完整参数表：

| 参数 | 类型 | 范围 | 说明 |
|------|------|------|------|
| **空间排列** | | | |
| `arrangement` | string | 35 种 | 粒子 3D 空间排列模式 |
| `arrangement_scale` | float | 0~1 | 排列大小（旧 `tightness` 兼容） |
| **持续运动** | | | |
| `movement` | string | 16 种 | 粒子持续运动模式 |
| `movement_speed` | float | 0.1~2 | 运动速度 |
| `movement_amplitude` | float | 0.1~1 | 运动幅度 |
| `noise_freq` | float | 0.3~2 | 噪声频率（curl 运动用） |
| **色彩** | | | |
| `color` | [r,g,b] | 0~1 | 主色调 |
| `palette` | string | 8 种预设 | 渐变色板（与 color 二选一） |
| `color_variation` | float | 0~0.3 | 每粒子颜色偏差幅度 |
| **氛围** | | | |
| `spread` | float | -0.5~0.5 | 正=扩散，负=收缩 |
| `breathe_amp` | float | 0~0.025 | 呼吸幅度 |
| `breathe_freq` | float | 0.5~2.5 Hz | 呼吸频率 |
| `bloom_strength` | float | 0~0.5 | 辉光强度 |
| **动作** | | | |
| `duration` | int | 1000~5000 ms | 过渡时间 |
| `hold` | bool | — | 完成后是否保持（有 movement 时建议 true） |
| **组合** | | | |
| `compose` | [string] | — | 引用其他 token 名，递归展开 |

向后兼容：旧字段 `shape` → `arrangement`，`tightness` → `arrangement_scale`，自动映射。

---

## 三、文件清单与代码结构

### 3.1 文件清单

```
spirit-ink/
├── index.html          # 主程序（~1787 行，CSS + JS 内嵌）
├── providers.js        # AI 提供商模块（Zhipu GLM + Custom OpenAI 兼容）
├── AGENTS.md           # AI Agent 开发指引
├── DEVELOPMENT.md      # 本文档
├── README.md           # 英文文档
├── README_CN.md        # 中文文档
└── docs/
    └── v3-new-proposal.md  # v3 设计方案（历史参考）
```

无 `package.json`、无 npm、无构建步骤。浏览器直接打开 `index.html` 即可运行。

### 3.2 代码内部组织

```
index.html:
  <style>              ... </style>          行 8-104
  <body>               ... </body>           行 106-193
  <script src="providers.js"></script>       行 194
  <script type="importmap">  ... </script>   行 195-197
  <script type="module">

    // ═══ DEFAULT_DICTIONARY            空词典，动态填充
    // ═══ DEFAULT_ASSET_PACK            空素材包，动态填充
    // ═══ Spring + SpringPool           9 个弹簧参数的弹性过渡
    // ═══ ARRANGEMENTS                  35 个空间排列生成器
    // ═══ SHAPES = ARRANGEMENTS         向后兼容别名
    // ═══ Simplex 3D Noise              程序化噪声基础
    // ═══ Curl Noise                    无散度流体向量场
    // ═══ Cosine Palette                8 种渐变色板
    // ═══ MOVEMENTS                     16 个持续运动函数
    // ═══ TokenEngine                   词典/素材包 CRUD、resolve、compose
    // ═══ PromptBuilder                 动态生成 system prompt
    // ═══ RENDER_ANALYZER_PROMPT        二次 AI 调用 prompt
    // ═══ UI (sidebar, token list, config, debug)
    // ═══ queueShapeAction              排列+运动+调色板入队
    // ═══ Particle System               Three.js + Bloom + ShaderMaterial
    // ═══ Physics Loop                  弹簧追踪 + movement 偏移 + 边界约束
    // ═══ AI System (callAI)            4 层 JSON 容错 + 自动渲染生成
    // ═══ Main Loop                     animate()

  </script>
```

---

## 四、核心系统详解

### 4.1 ARRANGEMENTS（35 种空间排列）

每个 arrangement 是一个函数 `(i, n, params) → [x, y, z]`，为第 i 个粒子（共 n 个）生成目标位置。`params.scale` 控制大小。

| 分类 | 排列 | 视觉特征 |
|------|------|---------|
| **几何** | `sphere` | Fibonacci 球面均匀分布 |
| | `point` | 极紧密聚点 |
| | `ring` | 圆环 |
| | `line` | 直线 |
| | `wave` | 正弦波 |
| | `heart` | 心形曲线 |
| | `star` | 五角星 |
| | `spiral` | 平面螺旋 |
| | `cube` | 立方体表面 |
| | `torus` | 甜甜圈 |
| | `helix` | 螺旋线 |
| | `grid` | 3D 网格 |
| | `diamond` | 菱形（球面径向收缩） |
| **自然** | `cloud` | 多团球形聚合（模拟云朵） |
| | `rain` | 竖直网格（模拟雨幕） |
| | `flame` | 底宽顶窄锥形（模拟火焰） |
| | `snow` | 随机散布 |
| | `mountain` | 高斯峰叠加 |
| | `ocean` | 正弦波浪面 |
| | `aurora` | 带状弧线 |
| | `waterfall` | 竖直下落列 |
| | `tornado` | 底窄顶宽螺旋 |
| **宇宙** | `galaxy` | 双臂螺旋星系 |
| | `nebula` | 多团星云 |
| | `starfield` | 球面随机散布 |
| | `comet` | 紧密头部 + 扩散尾部 |
| | `blackhole` | 吸积盘（密集螺旋） |
| | `supernova` | 不均匀球壳 |
| **抽象** | `vortex` | 圆柱螺旋涡流 |
| | `fountain` | 抛物线喷泉 |
| | `bloom` | 多层花瓣 |
| | `dna` | 双螺旋 |
| | `lotus` | 多层莲花瓣 |
| | `feather` | 中轴 + 侧枝 |
| | `rainbow` | 半圆弧 |

### 4.2 MOVEMENTS（16 种持续运动）

每个 movement 是一个函数 `(i, n, time, params, particle) → [dx, dy, dz]`，返回位置偏移量。偏移叠加到 arrangement 目标上，弹簧物理自动追踪动态目标。

#### 基础运动（13 种）

| 运动 | 视觉 | 实现 |
|------|------|------|
| `drift` | 缓慢随机漂移 | sin/cos + phase 偏移 |
| `float_up` | 缓缓上升 | Y 轴正向 + 轻微摇摆 |
| `fall_down` | 缓缓下落 | Y 轴负向 |
| `orbit` | 环绕旋转 | cos/sin 圆周 |
| `pulse` | 脉冲扩缩 | 基于目标方向的 sin 波 |
| `spiral_motion` | 螺旋运动 | 角度递增的 cos/sin |
| `flicker` | 闪烁抖动 | 随机偏移 + sin 调制 |
| `flow` | 定向流动 | X 轴正向 + sin 摆动 |
| `breathe_motion` | 呼吸起伏 | 三轴同步 sin |
| `ripple` | 波纹扩散 | 基于距离的 sin 波 |
| `sway` | 摇曳摆动 | 多频 sin/cos |
| `vibrate` | 快速振动 | 纯随机 |
| `wave_motion` | 波浪传播 | 基于归一化位置的 sin 波 |

#### 流体运动（3 种，基于 Curl Noise）

| 运动 | 视觉 | noise_freq |
|------|------|-----------|
| `curl_flow` | 丝滑流体流动（云雾/水波） | 0.8（大尺度） |
| `curl_turbulence` | 湍流翻涌（暴风/激荡） | 1.5（细碎） |
| `curl_vortex` | 旋涡上升（龙卷风/能量柱） | 0.5（大尺度+上升偏置） |

流体运动使用 curl noise 计算——基于 Simplex noise 的无散度向量场，保证粒子不会聚团或散开，运动像真实流体一样自然。

### 4.3 NOISE + PALETTE 基础设施

#### Simplex 3D Noise

`noise3D(x, y, z) → [-1, 1]`

Stefan Gustavson 的经典实现，纯 JS ~30 行。所有 curl noise、color variation 的基础。

- **确定性**：相同输入永远返回相同输出（不像 Math.random()）
- **连续性**：相邻输入产生相邻输出（视觉上平滑）
- **用途**：curl noise 向量场、per-particle 颜色变化、未来可用于 noise-driven arrangements

#### Curl Noise

`curlNoise(x, y, z, time, freq) → [vx, vy, vz]`

对三个偏移的 noise 场取旋度（有限差分近似），得到无散度向量场。

- **无散度**：粒子不会压缩或膨胀，像真实流体
- **时间驱动**：`time` 参数让流场持续变化
- **频率控制**：`freq` 低→大尺度流动，高→细碎翻涌

#### Cosine Palette

`cosinePalette(t, a, b, c, d) → [r, g, b]`（Inigo Quilez 公式）

`t ∈ [0,1]` 在色板上取色。`t = particleIndex/N + time*0.05` 产生流动渐变。

预设色板：

| 名称 | 风格 |
|------|------|
| `sunset` | 暖色渐变（橙→粉→紫） |
| `ocean` | 冷色渐变（蓝→青） |
| `rainbow` | 全色谱 |
| `ember` | 火焰渐变（红→橙→黄） |
| `aurora` | 极光渐变（绿→紫） |
| `forest` | 绿色系 |
| `ice` | 冰蓝系 |
| `neon` | 赛博霓虹 |

### 4.4 SpringPool

9 个弹簧参数，统一所有视觉过渡的物理系统。

```javascript
const springs = {
  color_r:      Spring(k*0.4, d*0.7),  // 红通道（慢、柔）
  color_g:      Spring(k*0.4, d*0.7),
  color_b:      Spring(k*0.4, d*0.7),
  spread:       Spring(k*0.6, d),       // 扩散
  speed:        Spring(k*0.5, d),       // 基础速度
  breathe_amp:  Spring(k*0.5, d),       // 呼吸幅度
  breathe_freq: Spring(k*0.7, d),       // 呼吸频率
  bloom_strength: Spring(k*0.3, d*0.7), // 辉光强度
  bloom_threshold: Spring(k*0.3, d*0.7),// 辉光阈值
};
```

默认 k=80, d=12（来自素材包 config）。

每个 Spring 的更新：`force = (target - value) * k; velocity += (force - velocity*d) * dt; value += velocity * dt;`

`applyEmotion(mapping)` 根据 mapping 中的 color/spread/breathe_* 等字段设置对应弹簧的目标值。没有的字段保持当前目标不变。

### 4.5 TokenEngine

#### 核心：resolve(tokenInputs)

```
输入: ["阳光般的喜悦"]

Step 1: 查词典
  不存在 → 自动添加 {created_at, source:"ai"}
  
Step 2: 查素材包映射
  无映射 → 加入 pendingRender

Step 3: 返回 {emotion, shape, pendingRender}
  emotion = default_mapping（降级）
  shape = null
  pendingRender = ["阳光般的喜悦"]

--- 自动渲染生成后 ---

Step 1': 再次 resolve
  有映射 → {arrangement:"bloom", movement:"curl_flow", palette:"sunset", ...}

Step 2': 分类
  有 arrangement/shape → shape 映射 + emotion 映射
  有 color/palette → 设置 SpringPool 目标

Step 3': 应用
  SpringPool.applyEmotion(emotion)
  queueShapeAction(shape)
```

#### compose 组合

```json
"greeting": {"compose": ["happy", "ring"], "hold": true, "duration": 3000}
```

resolve 时递归展开 compose 数组中的子 token，合并 emotion + shape 参数。父级 mapping 的 hold/duration 可覆盖子级。

#### CRUD 方法

| 方法 | 说明 |
|------|------|
| `init()` | 从 localStorage 加载词典和素材包 |
| `resolve(tokenInputs)` | 核心：查词典 + 查映射 + 返回渲染参数 |
| `addMapping(name, params)` | 添加/更新映射，自动保存 |
| `hasMapping(name)` | 检查是否有映射 |
| `listPacks()` | 列出所有素材包 |
| `switchPack(id)` | 切换素材包 |
| `createPack(name)` | 创建新素材包 |
| `importPackData(data)` | 从 JSON 导入素材包 |
| `exportPackData()` | 导出当前素材包为 JSON |
| `reset()` | 重置词典和所有素材包到默认 |

### 4.6 PromptBuilder + RENDER_ANALYZER_PROMPT

#### PromptBuilder

从词典动态生成 system prompt。读词典中的 token 列表，分为"已映射"和"未映射"两组告诉 AI。AI 可以复用已有映射的 token，也可以自由创造新 token。

关键规则：
- AI 必须返回 JSON：`{"content":"文字","tokens":["token"]}`
- Token 是自由表达（词/短语/句子）
- 1-3 个 token，每个代表状态的一个维度
- 不需要知道渲染细节

#### RENDER_ANALYZER_PROMPT

二次 AI 调用的 system prompt，将 token 语义转化为渲染参数。告知 AI 所有可用的 arrangement（35 种）、movement（16 种）、palette（8 种），让 AI 选择最能表达视觉意象的组合。

示例映射：
- "流动的云团" → cloud + curl_flow + palette:ocean
- "心跳加速" → sphere + pulse + palette:ember
- "愤怒的风暴" → tornado + curl_turbulence + palette:neon

### 4.7 粒子物理系统

每帧执行：

```
1. Action queue 管理
   - 取出下一个 action → 设置粒子目标位置
   - action 完成 → hold=true 则转为 heldAction，否则清除目标

2. 对每个粒子：
   a. 呼吸微动:     y += sin(time * breatheFreq + phase) * breatheAmp * 0.003
   b. 邻居排斥:     与相邻 8 个粒子排斥（距离 < 0.06）
   c. 扩散力:       根据 spread 值向/离中心施力
   d. 目标追踪:     计算 arrangement 目标 + movement 偏移
                    弹簧力拉向动态目标
   e. 边界约束:     |x|>1.5, |y|>1.2, |z|>0.8 时拉回
   f. 阻尼:         velocity *= 0.88
   g. 积分:         position += velocity

3. 颜色更新:
   - 有 palette:    cosinePalette(i/N + time*0.05, ...) 渐变
   - 有 color_variation: noise3D(pos, time) * variation 偏差
   - 否则:          SpringPool 驱动的统一颜色
```

#### Three.js 渲染管线

```
Camera (PerspectiveCamera 60°, z=3)
  ↓
OrbitControls (damping 0.08, no pan, distance 1-8)
  ↓
Points (N 个粒子, ShaderMaterial)
  vertexShader:   aColor → vC, gl_PointSize = 14 * uPR / -mv.z
  fragmentShader: 圆形柔光粒子, glow = smoothstep(0.5, 0.0, d)
  ↓
EffectComposer
  RenderPass → UnrealBloomPass → OutputPass
```

自定义属性 `aColor`（非 Three.js 内置 `color`）。Bloom 参数由弹簧系统驱动。

#### 思考动画

AI 思考时（`isThinking = true`），粒子网格绕 Y 轴旋转（`dt*0.5`）+ X 轴摇摆（`sin(t*0.3)*0.15`），表达"正在思考"。

### 4.8 AI 系统

#### callAI 流程

```
1. 检查 API Key → 构建 system prompt (PromptBuilder)
2. 调用 SIProviders.call(systemMsg, userMessages)
3. 429 错误 → 等 5 秒重试
4. 4 层 JSON 容错解析:
   a. 去 markdown code fence → JSON.parse
   b. 大括号深度追踪 → 截取子串 → parse
   c. 修尾逗号 → 首尾大括号 → parse
   d. 全部失败 → 作为纯文本处理
5. 提取 content → 显示回复
6. 提取 tokens → engine.resolve()
7. 应用 emotion (SpringPool) + shape (queueShapeAction)
8. 未映射 token → 自动依次调用 generateRendering()
9. 生成完毕 → 再次 resolve → 应用渲染 → 更新画面
```

#### 对话管理

- 历史限制 20 条，存内存（刷新丢失）
- 发送按钮禁用期间防止重复请求

---

## 五、已实现功能

### Phase 1 — 基础架构 ✅

| 功能 | 状态 |
|------|------|
| 两层包系统（Token 词典 + 素材映射包） | ✅ |
| 自由 Token 表达（非预定义分类） | ✅ |
| SpringPool 弹簧物理（9 参数） | ✅ |
| TokenEngine（resolve/compose/CRUD） | ✅ |
| PromptBuilder（动态 system prompt） | ✅ |
| 4 层 JSON 容错解析 | ✅ |
| 自动渲染生成（RENDER_ANALYZER_PROMPT） | ✅ |
| 多素材包管理（创建/切换/导入/导出） | ✅ |
| 左右抽屉式侧边栏 UI | ✅ |
| 预览映射 / 重新渲染 | ✅ |
| 35 种空间排列 | ✅ |
| 13 种基础运动 | ✅ |

### Phase 1.5 — 表现力跃迁 ✅

| 功能 | 状态 |
|------|------|
| Simplex 3D Noise | ✅ |
| Curl Noise（无散度流体场） | ✅ |
| 3 种 curl 流体运动（curl_flow/turbulence/vortex） | ✅ |
| Cosine Palette（8 种渐变色板） | ✅ |
| Per-particle 颜色（palette + noise variation） | ✅ |

---

## 六、Phase 2 — 图片/GIF 渲染器

**目标**：同一 token 不只映射粒子，还能映射图片和 GIF。切换素材包切换渲染模式。

### 6.1 架构变更

```
当前: TokenEngine → queueShapeAction() → ParticleRenderer

目标: TokenEngine → RendererRouter.apply(mapping)
                        ├── ParticleRenderer  (renderer: "particle")  ← 已实现
                        ├── ImageRenderer     (renderer: "image")      ← 新增
                        └── GifRenderer       (renderer: "gif")        ← 新增
```

### 6.2 任务列表

| # | 任务 | 说明 |
|---|------|------|
| T11 | Renderer 抽象层 | `RendererRouter`：统一接口 `apply(mapping)`, `clear()`, `update(dt)`，根据素材包 `renderer` 字段分发 |
| T12 | ImageRenderer | `<img>` 叠加层（z-index 在 canvas 和 UI 之间），Spring 驱动 opacity/scale 过渡 |
| T13 | GifRenderer | 同 ImageRenderer，浏览器原生 GIF 播放 |
| T14 | Renderer 切换 | 切换素材包时隐藏旧 renderer、初始化新 renderer |
| T15 | 素材预加载 | 切换前预加载素材包引用的所有图片/GIF |
| T16 | 素材管理 UI | 图片映射编辑、素材目录浏览 |

### 6.3 ImageRenderer 设计

```
┌──────────────────────────────┐
│  <canvas> (粒子背景)          │  z-index: 0（粒子渲染器保留或隐藏）
├──────────────────────────────┤
│  <img> (主素材)               │  z-index: 1, Spring 驱动 opacity + scale
├──────────────────────────────┤
│  UI 层 (输入框, 面板)          │  z-index: 10+
└──────────────────────────────┘
```

映射格式：
```json
{
  "happy": {"src": "assets/nailong/02_happy.jpg", "scale": 1.0},
  "sad":   {"src": "assets/nailong/08_scared.jpg"}
}
```

切换时：opacity 0→1 + scale 0.8→1.0，Spring 驱动平滑过渡。

### 6.4 Renderer 切换

```javascript
// TokenEngine 检测素材包 renderer 字段
switch (this.assetPack.renderer) {
  case 'particle': rendererRouter.use(particleRenderer); break;
  case 'image':    rendererRouter.use(imageRenderer); break;
  case 'gif':      rendererRouter.use(gifRenderer); break;
}
```

- 切换素材包时，旧 renderer 隐藏，新 renderer 初始化
- 粒子背景可选保留（`config.particle_background: true`）

---

## 七、Phase 3 — Agent 接入

**目标**：AI Agent 自主创建 token 和素材，系统自进化。

### 7.1 任务列表

| # | 任务 | 说明 |
|---|------|------|
| T17 | Agent Protocol | 定义 Agent → Spirit Ink 的标准化通信协议 |
| T18 | 动态 token 注册 API | 已有 `addTokenToDictionary()` + `addMapping()`，需暴露为协议端点 |
| T19 | 生图/生视频管道 | 预留 Agent 调用生图 API → 注册为素材的接口 |
| T20 | 多词典包支持 | 支持创建/切换多个词典包 |
| T21 | 自动添加策略 | Agent 建议新 token + 映射，用户一键确认 |

### 7.2 Agent Protocol 草案

```json
// 注册新 token
{"action": "token.register", "token": {"name": "melancholy", "created_at": "..."}}

// 注册渲染映射
{"action": "mapping.register", "token_name": "melancholy",
 "mapping": {"arrangement": "cloud", "movement": "curl_flow", "palette": "ocean"}}

// 注册生成的图片素材
{"action": "asset.register", "token_name": "sunset",
 "asset": {"type": "image", "data": "data:image/png;base64,..."}}
```

---

## 八、localStorage 参考

| 键 | 类型 | 用途 |
|----|------|------|
| `si_dict` | JSON | Token 词典 |
| `si_packs` | JSON | 所有素材包（以 pack ID 为 key 的对象） |
| `si_active_pack` | string | 当前活跃素材包 ID |
| `si_provider` | string | AI 提供商 ID（zhipu / custom） |
| `si_k` | string | API Key |
| `si_m` | string | 模型 ID |
| `si_apiBase` | string | 自定义 API 地址（仅 custom 提供商） |
| `si_n` | number | 粒子数量 |

---

## 九、技术决策与路线图

### 9.1 关键技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 文件结构 | 单文件 index.html | 零门槛，无构建工具 |
| 3D 渲染 | Three.js Points + ShaderMaterial | N≤500 时性能充裕，GPU 端渲染 |
| 物理过渡 | SpringPool（自实现） | 代码量极小，效果有机 |
| 程序化噪声 | Simplex 3D（纯 JS） | 60 行零依赖，curl noise/palette 的基础 |
| 粒子运动 | Curl Noise 向量场 | 无散度→流体般自然，替代离散运动模式 |
| 色彩系统 | Cosine Palette | 15 行实现渐变，AI 可选预设 |
| AI 接口 | providers.js（OpenAI 兼容格式） | 支持任意兼容端点 |
| 粒子属性 | 自定义 `aColor` | 避免与 Three.js 内置 `color` 冲突 |

### 9.2 路线图

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 基础架构：两层包 + SpringPool + 35 排列 + 13 运动 + 自动渲染 | ✅ 完成 |
| Phase 1.5 | 表现力跃迁：Simplex Noise + Curl Noise + Palette + 流体运动 | ✅ 完成 |
| Phase 2 | 渲染器扩展：ImageRenderer + GifRenderer + Renderer 切换 | 📋 待开发 |
| Phase 2.5 | 高级表现：SDF 形状融合 + 状态机 + Verlet 物理 | 📋 待开发 |
| Phase 3 | Agent 接入：自主注册 token/素材 + 生图管道 | 📋 待开发 |
