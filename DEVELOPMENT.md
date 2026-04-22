# Spirit Ink v4.0 — Design Token 驱动的可视化表达引擎

> 完整开发文档 | 2026-04-22
> 作者：XD Q + Hermes

---

## 一、项目概述

### 1.1 一句话定义

Spirit Ink 是一个 **AI 驱动的可视化表达引擎**——AI 输出抽象 Token 名，引擎查表映射为粒子动画、图片、GIF、视频等视觉内容，实现「想法即画面」。

### 1.2 核心设计原则

**Token 与素材解耦**——这是 v4 架构的灵魂：

```
Token 是语义概念：  "happy" → 开心
素材是渲染实现：    粒子包: happy → 金色+扩散
                    图片包: happy → 奶龙笑脸.jpg
                    GIF包:  happy → 奶龙跳舞.gif
```

同一个 token，换个素材包就换一种画风。AI 只需要知道有哪些 token 可以用，不需要知道怎么渲染。

**越用越灵活**——AI 可以返回词典中不存在的 token，用户可选择添加到词典和素材包，系统越用越丰富。

### 1.3 核心变革（v3 → v4）

| 维度 | v3 灵墨 | v4 灵墨 |
|------|---------|---------|
| AI 输出 | `body: {feel: {emotion:"joy", intensity:0.7}}` | `tokens: ["happy", "heart"]` |
| 视觉样式 | 单一（发光粒子） | 可扩展（粒子/图片/GIF/视频） |
| 扩展方式 | 改 prompt + 改代码 | 加素材包，零代码 |
| AI 职责 | 既要想「说什么」又要懂「怎么渲染」 | 只管「说什么」，渲染交给素材包 |
| 情绪映射 | 12 种硬编码在 JS 里 | Token 词典 + 素材包，数据驱动 |
| 参数过渡 | 内联 lerp（0.01/0.03） | SpringPool 统一弹性插值 |
| 新表达 | 不支持 | AI 可返回新 token，用户添加后即可用 |

### 1.4 产品愿景

用户只需要：
1. 对 AI 说话
2. AI 返回 token 名
3. 系统查当前素材包渲染画面
4. 想换画风？换一个素材包，同样的 token，不同的表达
5. AI 用了新 token？一键添加到词典和素材包

最终目标：**基础词典 → 载入不同素材包切换画风 → AI 自生长新 token → Agent 接入生图生视频 → 表达引擎自进化。**

---

## 二、当前状态

### 2.1 实际存在的代码

| 文件 | 说明 | 行数 |
|------|------|------|
| `index.html` | v3.0 完整实现（CSS + JS 内嵌） | ~1145 |
| `providers.js` | 多模型 AI API 封装 | ~247 |

### 2.2 v3.0 已有系统能力

| 系统 | 能力 | 硬编码位置 |
|------|------|-----------|
| 粒子物理 | 弹簧阻尼 + 呼吸 + 排斥 + 边界约束 | index.html:656-769 |
| 情绪系统 | 12 种情绪 → 颜色/扩散/呼吸映射 | index.html:375-388 (applyEmotion) |
| 形状系统 | 8 种形状生成器 (sphere/heart/ring/...) | index.html:400-442 (applyMove) |
| 动作系统 | feel/move/pose/detail/points/sequence/_learn/action | index.html:287-348 (processBodyCommand) |
| AI 对话 | System prompt 构建 + 4 层 JSON 容错解析 | index.html:828-1065 |
| 动作记忆 | localStorage 持久化 + 学习/调用 | index.html:179-220 |
| Three.js 渲染 | Bloom 后处理 + 自定义 ShaderMaterial + aColor | index.html:779-825, 1091-1137 |

### 2.3 v3.0 的结构性问题

1. **情绪映射硬编码**——`applyEmotion()` 中 12 种情绪的 RGB/扩散/呼吸参数全写死在 JS 里
2. **AI 负担太重**——AI 需同时决定「说什么」和「怎么渲染」（RGB 值、坐标、速度参数）
3. **无统一过渡物理**——颜色用 `lerp 0.01`，位置用 `stiffness * ease`，不同参数平滑度不一致
4. **不可扩展**——加一种新情绪或新形状必须改代码

---

## 三、架构设计

### 3.1 两层包架构

```
┌─────────────────────────────────────────┐
│           Token 词典包（语义层）           │
│  AI 看这个，决定返回什么 token             │
│  纯语义：token 名 + 显示名 + 触发提示      │
│  与渲染完全无关                            │
│                                         │
│  "happy"    → 开心 · 用户表达开心         │
│  "heart"    → 心形 · 变成心形             │
│  "greeting" → 打招呼 · compose:[happy,ring]│
└──────────────────┬──────────────────────┘
                   │ token name（字符串）
                   ▼
┌─────────────────────────────────────────┐
│         素材映射包（渲染层）               │
│  引擎看这个，决定怎么画                    │
│  同一个 token，不同包 = 不同画风           │
│                                         │
│  粒子包: happy → {color:[0.92,0.78,0.28], spread:0.35}     │
│  图片包: happy → {type:"image", src:"nailong/02_happy.jpg"}│
│  GIF包:  happy → {type:"gif", src:"nailong-gif/happy.gif"} │
└─────────────────────────────────────────┘
```

### 3.2 完整数据流

```
[1] 用户输入 "你好"
       │
[2] PromptBuilder 读 Token 词典包
       │  生成 prompt: "可用 token: happy(开心), sad(悲伤), heart(心形)..."
       │  AI 不知道也不需要知道怎么渲染
       │
[3] AI 返回
       │  {"content": "你好呀！", "tokens": ["happy"]}
       │
[4] TokenEngine.resolve(["happy"])
       │  a. 查词典包: "happy" 存在? → 是, category=emotion
       │  b. 查素材包: "happy" 有映射? → 是, → {color:[0.92,0.78,0.28], spread:0.35}
       │  c. 映射类型判断:
       │     有 color/spread/breathe_* → emotion 型, 设 SpringPool 目标
       │     有 shape → shape 型, 生成粒子位置目标
       │     有 compose → scene 型, 递归展开子 token
       │
[5] SpringPool 接收渲染参数
       │  每帧弹性插值 → 当前值
       │
[6] ParticleRenderer 读取 SpringPool 当前值
       │  更新粒子颜色 + Bloom 参数
       │  渲染
       │
[7] 用户看到画面
```

### 3.3 未知 token 流

```
[3'] AI 返回 {"tokens": ["melancholy"]}
        │
[4'] TokenEngine.resolve(["melancholy"])
        │  a. 查词典包: "melancholy" 不存在
        │  b. 使用 default_mapping 降级渲染（画面不变）
        │  c. UI 弹出提示: 「检测到新 token: "melancholy"」
        │  d. 用户选择:
        │     [添加到词典] → 输入 display_name, trigger_hint
        │     [同时添加映射] → 输入渲染参数（或选模板）
        │     [跳过] → 下次遇到再提示
        │  e. 下次 AI 用 "melancholy" 就能正常渲染
```

### 3.4 单文件内部组织

```
index.html:
  <style> ... </style>
  <body> ... </body>
  <script src="providers.js"></script>
  <script type="importmap"> ... </script>
  <script type="module">

    // ═══ 默认词典包（内联 JSON）═══
    const DEFAULT_DICTIONARY = { ... };

    // ═══ 默认粒子素材包（内联 JSON）═══
    const DEFAULT_ASSET_PACK = { ... };

    // ═══ TokenEngine ═══
    class TokenEngine {
      dictionary; assetPack; activeTokens;
      loadDictionary(json)
      loadAssetPack(json)
      resolve(tokenNames) → renderParams
      addTokenToDictionary(name, def)
      addMappingToAssetPack(name, renderParams)
    }

    // ═══ SpringPool ═══
    class Spring { constructor(k,d); setTarget(t); update(dt) }
    class SpringPool {
      springs: { color_r/g/b, spread, speed, breathe_amp/freq, bloom_strength/threshold }
      applyTargets(renderParams)
      update(dt)
      getCurrentValues()
    }

    // ═══ ShapeGenerators ═══
    const SHAPES = { sphere, point, ring, line, wave, heart, star, spiral }

    // ═══ PromptBuilder ═══
    class PromptBuilder {
      build(dictionary) → systemPrompt  // 只读词典，不读素材包
    }

    // ═══ ParticleRenderer ═══
    // Three.js + Bloom + ShaderMaterial
    // animate loop 从 SpringPool 读取当前值

    // ═══ UI & App ═══
    // send(), saveCfg(), 新 token 添加弹窗, debug 面板

  </script>
```

---

## 四、Token 词典包格式

词典包只管语义，与渲染完全无关。AI 看到的是这个包的描述。

```json
{
  "id": "standard-v1",
  "name": "标准情感词典",
  "version": "1.0.0",
  "description": "基础情感与动作 token 定义",

  "tokens": {
    "happy":    { "display_name": "开心",   "category": "emotion", "trigger_hint": "用户表达开心、高兴、愉快" },
    "sad":      { "display_name": "悲伤",   "category": "emotion", "trigger_hint": "用户表达难过、失落、沮丧" },
    "angry":    { "display_name": "愤怒",   "category": "emotion", "trigger_hint": "用户表达生气、不满、愤怒" },
    "fear":     { "display_name": "恐惧",   "category": "emotion", "trigger_hint": "用户表达害怕、担心、焦虑" },
    "calm":     { "display_name": "平静",   "category": "emotion", "trigger_hint": "默认状态、安静、放松" },
    "love":     { "display_name": "爱意",   "category": "emotion", "trigger_hint": "用户表达喜欢、爱、温暖" },
    "surprise": { "display_name": "惊讶",   "category": "emotion", "trigger_hint": "用户表达吃惊、意外" },
    "think":    { "display_name": "思考",   "category": "emotion", "trigger_hint": "思考、分析、犹豫" },
    "curious":  { "display_name": "好奇",   "category": "emotion", "trigger_hint": "用户表达好奇、疑问" },
    "excited":  { "display_name": "兴奋",   "category": "emotion", "trigger_hint": "用户表达激动、期待、兴奋" },
    "shy":      { "display_name": "害羞",   "category": "emotion", "trigger_hint": "用户表达害羞、不好意思" },
    "proud":    { "display_name": "自豪",   "category": "emotion", "trigger_hint": "用户表达骄傲、自信、自豪" },

    "sphere":   { "display_name": "球体",   "category": "shape",   "trigger_hint": "聚成球形、聚拢" },
    "ring":     { "display_name": "环形",   "category": "shape",   "trigger_hint": "排成环形" },
    "heart":    { "display_name": "心形",   "category": "shape",   "trigger_hint": "变成心形" },
    "star":     { "display_name": "星形",   "category": "shape",   "trigger_hint": "变成星形" },
    "wave":     { "display_name": "波浪",   "category": "shape",   "trigger_hint": "变成波浪形" },
    "line":     { "display_name": "线形",   "category": "shape",   "trigger_hint": "排成直线" },
    "spiral":   { "display_name": "螺旋",   "category": "shape",   "trigger_hint": "变成螺旋形" },
    "point":    { "display_name": "收缩",   "category": "shape",   "trigger_hint": "收缩成点、紧密" },

    "greeting":     { "display_name": "打招呼", "category": "scene", "trigger_hint": "用户打招呼", "compose": ["happy", "ring"] },
    "celebration":  { "display_name": "庆祝",   "category": "scene", "trigger_hint": "庆祝、赞美", "compose": ["excited", "star"] },
    "thinking":     { "display_name": "沉思",   "category": "scene", "trigger_hint": "思考问题", "compose": ["think", "sphere"] },
    "affection":    { "display_name": "温情",   "category": "scene", "trigger_hint": "安慰、关心", "compose": ["love", "heart"] },
    "startled":     { "display_name": "受惊",   "category": "scene", "trigger_hint": "惊吓、意外", "compose": ["surprise", "point"] }
  },

  "ai_rules": "简单回复用 1 个 emotion token。想展示形体加 1 个 shape token。复杂场景用 scene token。你可以自由使用词典中未列出的新 token 名，用户后续可添加。",

  "ai_examples": [
    { "user": "你好",     "response": { "content": "你好呀！",       "tokens": ["happy"] } },
    { "user": "变成心形", "response": { "content": "送你一颗心",     "tokens": ["love", "heart"] } },
    { "user": "我有点难过", "response": { "content": "抱抱你",      "tokens": ["sad", "sphere"] } },
    { "user": "哇！",     "response": { "content": "怎么啦！",       "tokens": ["startled"] } }
  ]
}
```

**词典包关键特性**：

- **纯语义**：无任何渲染参数（无 RGB、无坐标、无速度）
- **AI 可见**：PromptBuilder 将词典内容注入 system prompt
- **可自由扩展**：`ai_rules` 鼓励 AI 使用新 token
- **compose 组合**：scene 类 token 引用其他 token，表达复杂含义
- **MVP 阶段只有一个词典包**，后续支持用户自建多词典

---

## 五、素材映射包格式

素材包把 token 名映射到具体的渲染参数。不同素材包对应不同的 renderer。

### 5.1 粒子素材包

```json
{
  "id": "particle-jarvis-v1",
  "name": "J.A.R.V.I.S 粒子风格",
  "version": "1.0.0",
  "renderer": "particle",

  "config": {
    "particle_count": 100,
    "background": "#08080f",
    "bloom": { "strength": 0.12, "radius": 0.4, "threshold": 0.88 },
    "spring_k": 80,
    "spring_d": 12
  },

  "default_mapping": {
    "color": [0.4, 0.4, 0.45],
    "spread": 0,
    "speed": 0.001,
    "breathe_amp": 0.006,
    "breathe_freq": 1.0
  },

  "mappings": {
    "happy":    { "color": [0.92, 0.78, 0.28], "spread": 0.35, "speed": 0.009, "breathe_amp": 0.014, "breathe_freq": 1.4 },
    "sad":      { "color": [0.28, 0.38, 0.72], "spread": -0.12, "speed": 0.001, "breathe_amp": 0.004, "breathe_freq": 0.6 },
    "angry":    { "color": [0.88, 0.18, 0.12], "spread": 0.45, "speed": 0.018, "breathe_amp": 0.022, "breathe_freq": 2.0 },
    "fear":     { "color": [0.45, 0.25, 0.58], "spread": -0.35, "speed": 0.014, "breathe_amp": 0.003, "breathe_freq": 1.8 },
    "calm":     { "color": [0.28, 0.55, 0.38], "spread": 0, "speed": 0.001, "breathe_amp": 0.008, "breathe_freq": 0.8 },
    "love":     { "color": [0.88, 0.45, 0.58], "spread": 0.18, "speed": 0.003, "breathe_amp": 0.016, "breathe_freq": 0.9 },
    "surprise": { "color": [0.85, 0.85, 0.88], "spread": 0.40, "speed": 0.010, "breathe_amp": 0.020, "breathe_freq": 2.2 },
    "think":    { "color": [0.48, 0.32, 0.68], "spread": -0.18, "speed": 0.001, "breathe_amp": 0.005, "breathe_freq": 0.7 },
    "curious":  { "color": [0.35, 0.62, 0.88], "spread": 0.12, "speed": 0.005, "breathe_amp": 0.007, "breathe_freq": 1.0 },
    "excited":  { "color": [0.92, 0.82, 0.35], "spread": 0.28, "speed": 0.007, "breathe_amp": 0.012, "breathe_freq": 1.2 },
    "shy":      { "color": [0.88, 0.55, 0.50], "spread": -0.15, "speed": 0.002, "breathe_amp": 0.006, "breathe_freq": 0.9 },
    "proud":    { "color": [0.88, 0.78, 0.28], "spread": 0.22, "speed": 0.006, "breathe_amp": 0.010, "breathe_freq": 1.1 },

    "sphere": { "shape": "sphere",  "tightness": 0.5, "motion_speed": "normal", "duration": 2500 },
    "ring":   { "shape": "ring",    "tightness": 0.5, "motion_speed": "normal", "duration": 2500 },
    "heart":  { "shape": "heart",   "tightness": 0.5, "motion_speed": "slow",   "duration": 3000 },
    "star":   { "shape": "star",    "tightness": 0.5, "motion_speed": "normal", "duration": 2500 },
    "wave":   { "shape": "wave",    "tightness": 0.5, "motion_speed": "normal", "duration": 2500 },
    "line":   { "shape": "line",    "tightness": 0.5, "motion_speed": "normal", "duration": 2000 },
    "spiral": { "shape": "spiral",  "tightness": 0.5, "motion_speed": "normal", "duration": 2500 },
    "point":  { "shape": "point",   "tightness": 0.5, "motion_speed": "fast",   "duration": 1500 },

    "greeting":    { "compose": ["happy", "ring"],   "hold": true,  "duration": 3000 },
    "celebration": { "compose": ["excited", "star"], "hold": true,  "duration": 3000 },
    "thinking":    { "compose": ["think", "sphere"], "hold": true,  "duration": 4000 },
    "affection":   { "compose": ["love", "heart"],   "hold": true,  "duration": 4000 },
    "startled":    { "compose": ["surprise", "point"],"hold": false, "duration": 2000 }
  }
}
```

**粒子映射参数说明**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `color` | `[r,g,b]` 0-1 | 主色调，Spring 驱动平滑过渡 |
| `spread` | float | 正=扩散，负=收缩，0=不变 |
| `speed` | float | 运动速度系数 |
| `breathe_amp` | float | 呼吸幅度 |
| `breathe_freq` | float | 呼吸频率 Hz |
| `bloom_strength` | float | Bloom 后处理强度（可选覆盖） |
| `shape` | string | 引用 SHAPES 注册表中的形状生成器 |
| `tightness` | float 0-1 | 形状紧密程度 |
| `motion_speed` | "slow"/"normal"/"fast" | 变形速度 |
| `compose` | `[tokenName,...]` | 递归展开子 token |
| `hold` | bool | 完成后是否保持形状 |
| `duration` | ms | 动作持续时间 |

### 5.2 图片素材包（Phase 2）

```json
{
  "id": "image-nailong-v1",
  "name": "奶龙表情包",
  "renderer": "image",

  "config": {
    "background": "#1a1a2e",
    "transition": "spring_scale"
  },

  "default_mapping": {
    "src": "assets/nailong/01_idle.jpg",
    "scale": 1.0
  },

  "mappings": {
    "happy":   { "src": "assets/nailong/02_happy.jpg" },
    "sad":     { "src": "assets/nailong/08_scared.jpg" },
    "curious": { "src": "assets/nailong/04_curious.jpg" },
    "excited": { "src": "assets/nailong/02_happy.jpg" },
    "shy":     { "src": "assets/nailong/03_shy.jpg" }
  }
}
```

**同一个 token "happy"**：粒子包 → 金色膨胀，图片包 → 奶龙笑脸。换包即换画风。

### 5.3 GIF 素材包（Phase 2）

```json
{
  "id": "gif-nailong-v1",
  "name": "奶龙动图",
  "renderer": "gif",

  "config": {
    "background": "#1a1a2e",
    "transition": "spring_scale"
  },

  "default_mapping": {
    "src": "assets/nailong-gif/idle.gif"
  },

  "mappings": {
    "happy":   { "src": "assets/nailong-gif/happy.gif" },
    "sad":     { "src": "assets/nailong-gif/sad.gif" },
    "shy":     { "src": "assets/nailong-gif/shy.gif" },
    "excited": { "src": "assets/nailong-gif/dance.gif" }
  }
}
```

### 5.4 映射包设计原则

- **key 就是 token name**——与词典包通过字符串名关联，无外键约束
- **词典有、映射没有** → 用 `default_mapping` 降级渲染 + 弹提示
- **映射有、词典没有** → 正常渲染（可能是用户手动加的映射）
- **两者都没有** → 用 `default_mapping` + 弹「添加到词典」提示
- **`default_mapping` 必须存在**——保证任何 token 都有兜底渲染

---

## 六、引擎核心设计

### 6.1 TokenEngine

```javascript
class TokenEngine {
  constructor() {
    this.dictionary = null;     // 当前词典包
    this.assetPack = null;      // 当前素材包
    this.activeTokens = [];     // 当前活跃 token 列表
    this._pendingNewTokens = []; // 待用户确认的新 token
  }

  loadDictionary(json) { this.dictionary = json; }
  loadAssetPack(json) { this.assetPack = json; }

  resolve(tokenNames) {
    // 1. 展开 compose（递归）
    // 2. 查词典 → 未知 token 加入 pendingNewTokens
    // 3. 查素材包 → 未映射 token 用 default_mapping + 记录
    // 4. 分类合并渲染参数
    //    - emotion 类（有 color/spread/breathe_*）：取最后一个
    //    - shape 类（有 shape）：取最后一个
    //    - compose 类：展开后按子 token 处理
    // 5. 返回 { emotionParams, shapeParams, unknownTokens, unmappedTokens }
  }

  addTokenToDictionary(name, def) {
    this.dictionary.tokens[name] = def;
    this._saveDictionary();
  }

  addMappingToAssetPack(name, renderParams) {
    this.assetPack.mappings[name] = renderParams;
    this._saveAssetPack();
  }

  _saveDictionary() { localStorage.setItem('si_dictionary', JSON.stringify(this.dictionary)); }
  _saveAssetPack() { localStorage.setItem('si_asset_pack', JSON.stringify(this.assetPack)); }
}
```

### 6.2 resolve() 详细逻辑

```
输入: ["happy", "heart"]

Step 1: 展开 compose
  "happy" → 非 compose，保留
  "heart" → 非 compose，保留

Step 2: 查词典
  "happy" → 存在, category=emotion ✓
  "heart" → 存在, category=shape ✓

Step 3: 查素材包映射
  "happy" → {color:[0.92,0.78,0.28], spread:0.35, ...}
  "heart" → {shape:"heart", tightness:0.5, ...}

Step 4: 分类
  emotion 类: ["happy"] → 取最后一个 → {color:[0.92,0.78,0.28], spread:0.35, ...}
  shape 类: ["heart"] → 取最后一个 → {shape:"heart", tightness:0.5, ...}

Step 5: 输出
  {
    emotion: { color:[0.92,0.78,0.28], spread:0.35, speed:0.009, ... },
    shape: { shape:"heart", tightness:0.5, duration:3000 },
    unknownTokens: [],
    unmappedTokens: []
  }
```

compose 展开示例：

```
输入: ["greeting"]

Step 1: 查词典 → compose: ["happy", "ring"]
Step 2: 递归 resolve(["happy", "ring"])
Step 3: 素材包 greeting 映射的 hold/duration 覆盖子结果
Step 4: 输出: emotion=happy的参数, shape=ring的参数, hold=true, duration=3000
```

### 6.3 SpringPool

替换 v3 的内联 lerp（`p.cr += (target - p.cr) * 0.01`），统一所有参数的过渡为弹簧物理。

```javascript
class Spring {
  constructor(k = 80, d = 12) {
    this.target = 0;
    this.value = 0;
    this.velocity = 0;
    this.k = k;
    this.d = d;
  }
  setTarget(t) { this.target = t; }
  update(dt) {
    const force = (this.target - this.value) * this.k;
    this.velocity += (force - this.velocity * this.d) * dt;
    this.value += this.velocity * dt;
  }
}

class SpringPool {
  constructor(personality = {}) {
    const k = personality.spring_k || 80;
    const d = personality.spring_d || 12;
    this.springs = {
      color_r:      new Spring(k * 0.4, d * 0.7),
      color_g:      new Spring(k * 0.4, d * 0.7),
      color_b:      new Spring(k * 0.4, d * 0.7),
      spread:       new Spring(k * 0.6, d),
      speed:        new Spring(k * 0.5, d),
      breathe_amp:  new Spring(k * 0.5, d),
      breathe_freq: new Spring(k * 0.7, d),
      bloom_strength: new Spring(k * 0.3, d * 0.7),
      bloom_threshold: new Spring(k * 0.3, d * 0.7),
    };
  }

  applyEmotionParams(params) {
    if (params.color) {
      this.springs.color_r.setTarget(params.color[0]);
      this.springs.color_g.setTarget(params.color[1]);
      this.springs.color_b.setTarget(params.color[2]);
    }
    if (params.spread !== undefined) this.springs.spread.setTarget(params.spread);
    if (params.speed !== undefined) this.springs.speed.setTarget(params.speed);
    if (params.breathe_amp !== undefined) this.springs.breathe_amp.setTarget(params.breathe_amp);
    if (params.breathe_freq !== undefined) this.springs.breathe_freq.setTarget(params.breathe_freq);
    if (params.bloom_strength !== undefined) this.springs.bloom_strength.setTarget(params.bloom_strength);
    if (params.bloom_threshold !== undefined) this.springs.bloom_threshold.setTarget(params.bloom_threshold);
  }

  update(dt) {
    for (const s of Object.values(this.springs)) s.update(dt);
  }

  getCurrentValues() {
    const v = {};
    for (const [name, s] of Object.entries(this.springs)) v[name] = s.value;
    return v;
  }
}
```

**与 v3 的对比**：

| 参数 | v3 过渡方式 | v4 SpringPool |
|------|------------|---------------|
| 颜色 | `p.cr += (target - p.cr) * 0.01` 每帧 | Spring(k:32, d:8.4) 弹性 |
| 扩散 | 直接乘以 intensity | Spring(k:48, d:12) 弹性 |
| 呼吸幅度 | 直接设置 | Spring(k:48, d:12) 弹性 |
| Bloom | 硬编码不变化 | Spring(k:24, d:8.4) 可 token 控制 |
| 位置 | `p.vx += (target - p.x) * stiffness` | 保持 per-particle spring 不变 |

### 6.4 ShapeGenerators

从 v3 `applyMove` 中提取形状生成器为独立注册表：

```javascript
const SHAPES = {
  sphere:  (i, n, p) => { /* fibonacci sphere, radius = 0.15 + p.tightness * 0.55 */ },
  point:   (i, n, p) => { /* tight cluster, radius = p.tightness * 0.08 + 0.02 */ },
  ring:    (i, n, p) => { /* 2D circle, radius = 0.15 + p.tightness * 0.5 */ },
  line:    (i, n, p) => { /* straight line, length = 1.2 * (0.3 + p.tightness * 0.7) */ },
  wave:    (i, n, p) => { /* sine wave */ },
  heart:   (i, n, p) => { /* parametric heart, scale = 0.04 + p.tightness * 0.04 */ },
  star:    (i, n, p) => { /* 5-pointed star */ },
  spiral:  (i, n, p) => { /* spiral */ },
};
```

- 新增形状只需向 `SHAPES` 注册，素材包即可通过 `"shape": "新名字"` 引用
- 粒子位置仍使用 per-particle spring targeting（保持 v3 的丝滑效果）

### 6.5 PromptBuilder

只读词典包，不读素材包。AI 不知道渲染细节。

```javascript
class PromptBuilder {
  build(dictionary) {
    const emotionTokens = Object.entries(dictionary.tokens)
      .filter(([_, d]) => d.category === 'emotion')
      .map(([name, d]) => `- "${name}": ${d.display_name} (${d.trigger_hint})`)
      .join('\n');

    const shapeTokens = Object.entries(dictionary.tokens)
      .filter(([_, d]) => d.category === 'shape')
      .map(([name, d]) => `- "${name}": ${d.display_name} (${d.trigger_hint})`)
      .join('\n');

    const sceneTokens = Object.entries(dictionary.tokens)
      .filter(([_, d]) => d.category === 'scene')
      .map(([name, d]) => `- "${name}": ${d.display_name} (${d.trigger_hint}, = ${d.compose.join('+')})`)
      .join('\n');

    return `你是灵墨，一个有身体的AI。你的身体通过 Token 控制视觉表达。

每次回复必须是 JSON：
{"content":"你说的文字","tokens":["token_name"]}

token 可以是字符串或对象：
- "happy"（默认效果）
- {"name":"heart","hold":true}

## 可用的情感 Token
${emotionTokens}

## 可用的形体 Token
${shapeTokens}

## 可用的场景 Token（自动组合多个 token）
${sceneTokens}

## 使用规则
${dictionary.ai_rules}

## 示例
${dictionary.ai_examples.map(ex =>
  `用户："${ex.user}"\n你：${JSON.stringify(ex.response)}`
).join('\n\n')}

记住：永远只返回一个 JSON 对象。你可以自由使用上面没列出的新 token 名。`;
  }
}
```

---

## 七、Phase 1：粒子 Token 化（MVP）

**目标**：将 v3 的硬编码系统重构为两层包架构，纯 Token 模式，保持单文件。

| # | 任务 | 说明 |
|---|------|------|
| T1 | 定义两层 JSON Schema | 词典包 + 素材映射包格式 |
| T2 | 实现默认词典包 | 25 个 token（12 emotion + 8 shape + 5 scene），内联到 index.html |
| T3 | 实现默认粒子素材包 | 从 v3 的 12 种情绪 + 8 种形状迁移所有映射，内联到 index.html |
| T4 | 实现 SpringPool | 替代 v3 内联 lerp，统一过渡物理 |
| T5 | 实现 TokenEngine | 加载词典/素材包、resolve 查表、compose 展开、未知 token 检测 |
| T6 | 实现 PromptBuilder | 从词典包动态生成 system prompt |
| T7 | 改造渲染器 | 从 SpringPool 读取颜色/Bloom 参数，移除内联 lerp |
| T8 | 改造 AI 调用链 | 解析 `tokens` 字段，走 TokenEngine.resolve，移除 `processBodyCommand` |
| T9 | 新 token 添加 UI | 检测未知/未映射 token → 弹窗让用户编辑并保存到词典和素材包 |
| T10 | 清理 v3 硬编码 | 删除 `applyEmotion`、`emotionMap`、旧 `buildSystemPrompt`、`processBodyCommand` |

### T2 默认词典包内容

| Token 名 | display_name | category | trigger_hint |
|-----------|-------------|----------|-------------|
| happy | 开心 | emotion | 用户表达开心、高兴、愉快 |
| sad | 悲伤 | emotion | 用户表达难过、失落、沮丧 |
| angry | 愤怒 | emotion | 用户表达生气、不满、愤怒 |
| fear | 恐惧 | emotion | 用户表达害怕、担心、焦虑 |
| calm | 平静 | emotion | 默认状态、安静、放松 |
| love | 爱意 | emotion | 用户表达喜欢、爱、温暖 |
| surprise | 惊讶 | emotion | 用户表达吃惊、意外 |
| think | 思考 | emotion | 思考、分析、犹豫 |
| curious | 好奇 | emotion | 用户表达好奇、疑问 |
| excited | 兴奋 | emotion | 用户表达激动、期待、兴奋 |
| shy | 害羞 | emotion | 用户表达害羞、不好意思 |
| proud | 自豪 | emotion | 用户表达骄傲、自信、自豪 |
| sphere | 球体 | shape | 聚成球形、聚拢 |
| ring | 环形 | shape | 排成环形 |
| heart | 心形 | shape | 变成心形 |
| star | 星形 | shape | 变成星形 |
| wave | 波浪 | shape | 变成波浪形 |
| line | 线形 | shape | 排成直线 |
| spiral | 螺旋 | shape | 变成螺旋形 |
| point | 收缩 | shape | 收缩成点、紧密 |
| greeting | 打招呼 | scene | 用户打招呼 |
| celebration | 庆祝 | scene | 庆祝、赞美 |
| thinking | 沉思 | scene | 思考问题 |
| affection | 温情 | scene | 安慰、关心 |
| startled | 受惊 | scene | 惊吓、意外 |

### T3 默认粒子素材包映射

从 v3 `applyEmotion` 硬编码数据逐行迁移：

| Token → 映射 | color (RGB) | spread | speed | breathe_amp | breathe_freq |
|-------------|-------------|--------|-------|-------------|--------------|
| happy | [0.92, 0.78, 0.28] | 0.35 | 0.009 | 0.014 | 1.4 |
| sad | [0.28, 0.38, 0.72] | -0.12 | 0.001 | 0.004 | 0.6 |
| angry | [0.88, 0.18, 0.12] | 0.45 | 0.018 | 0.022 | 2.0 |
| fear | [0.45, 0.25, 0.58] | -0.35 | 0.014 | 0.003 | 1.8 |
| calm | [0.28, 0.55, 0.38] | 0 | 0.001 | 0.008 | 0.8 |
| love | [0.88, 0.45, 0.58] | 0.18 | 0.003 | 0.016 | 0.9 |
| surprise | [0.85, 0.85, 0.88] | 0.40 | 0.010 | 0.020 | 2.2 |
| think | [0.48, 0.32, 0.68] | -0.18 | 0.001 | 0.005 | 0.7 |
| curious | [0.35, 0.62, 0.88] | 0.12 | 0.005 | 0.007 | 1.0 |
| excited | [0.92, 0.82, 0.35] | 0.28 | 0.007 | 0.012 | 1.2 |
| shy | [0.88, 0.55, 0.50] | -0.15 | 0.002 | 0.006 | 0.9 |
| proud | [0.88, 0.78, 0.28] | 0.22 | 0.006 | 0.010 | 1.1 |

shape 映射从 v3 `applyMove` 的 shapes 对象迁移，参数一一对应。

---

## 八、Phase 2：图片/视频 Token

**目标**：支持素材映射包切换为 image/gif/video 类型，同一个 token 换一种表达方式。

| # | 任务 | 说明 |
|---|------|------|
| T11 | ImageRenderer | `<img>` 叠加层，Spring 驱动 opacity/scale 过渡 |
| T12 | GifRenderer | 同 ImageRenderer，GIF 浏览器原生播放 |
| T13 | Renderer 切换逻辑 | TokenEngine 检测素材包 `renderer` 字段，切换渲染器 |
| T14 | 素材包切换 UI | Config 面板下拉切换粒子包/图片包，实时生效 |
| T15 | 素材预加载 | 切换前预加载素材包引用的所有图片/GIF |
| T16 | 素材包导入导出 UI | JSON 文件导入导出 + 映射编辑 |

### T11 ImageRenderer 设计

```
┌──────────────────────────────┐
│  <canvas> (粒子背景, 可选)     │  z-index: 0
├──────────────────────────────┤
│  <img> (主素材)               │  z-index: 1, Spring 驱动 opacity + scale
├──────────────────────────────┤
│  UI 层 (输入框, 面板)          │  z-index: 10+
└──────────────────────────────┘
```

- token 映射中 `src` 指定图片路径
- 切换时：opacity 0→1 + scale 0.8→1.0，Spring 驱动平滑过渡
- 粒子背景可选保留（`config.particle_background: true`）

### T13 Renderer 切换

```javascript
// TokenEngine 检测素材包 renderer 类型
switch (this.assetPack.renderer) {
  case 'particle': useParticleRenderer(resolveResult); break;
  case 'image':    useImageRenderer(resolveResult); break;
  case 'gif':      useGifRenderer(resolveResult); break;
}
```

- 切换素材包时，旧 renderer 隐藏，新 renderer 初始化
- 渲染器只关心映射的渲染参数，不关心 token 的语义

---

## 九、Phase 3：Agent 接入准备

**目标**：为 AI Agent 自主创建 token 和素材做好准备，设计协议和接口。

| # | 任务 | 说明 |
|---|------|------|
| T17 | Agent Protocol | 定义 Agent → Spirit Ink 的标准化通信协议 |
| T18 | 动态 token 注册 API | `addTokenToDictionary()` + `addMappingToAssetPack()` |
| T19 | 生图/生视频管道 | 预留 Agent 调用生图 API → 注册为素材的接口 |
| T20 | 多词典包支持 | 支持创建/切换多个词典包 |
| T21 | 自动添加策略 | Agent 可建议新 token + 映射，用户一键确认 |

### T17 Agent Protocol

```json
// Agent 注册新 token 到词典
{
  "action": "token.register",
  "token": {
    "name": "melancholy",
    "display_name": "忧郁",
    "category": "emotion",
    "trigger_hint": "用户表达忧郁、淡淡的忧伤"
  }
}

// Agent 注册素材映射
{
  "action": "mapping.register",
  "token_name": "melancholy",
  "mapping": {
    "color": [0.35, 0.35, 0.55],
    "spread": -0.08,
    "speed": 0.001,
    "breathe_amp": 0.005,
    "breathe_freq": 0.7
  }
}

// Agent 通过生图模型生成素材并注册
{
  "action": "asset.register",
  "token_name": "sunset",
  "asset": {
    "type": "image",
    "data": "data:image/png;base64,...",
    "metadata": { "generated_by": "dall-e-3", "prompt": "..." }
  }
}
```

### T18 动态注册 API

```javascript
class TokenEngine {
  // Phase 1 已实现的基础版本
  addTokenToDictionary(name, def) { ... }
  addMappingToAssetPack(name, renderParams) { ... }

  // Phase 3 新增
  registerFromAgent(action) {
    switch (action.action) {
      case 'token.register':
        return this.addTokenToDictionary(action.token.name, action.token);
      case 'mapping.register':
        return this.addMappingToAssetPack(action.token_name, action.mapping);
      case 'asset.register':
        // 将生成的素材保存到本地/IndexedDB
        // 注册到当前素材包的 mappings
        break;
    }
  }
}
```

### T19 生图/生视频管道

```javascript
// 预留接口，Phase 3 实际接入
class AssetPipeline {
  async generateImage(prompt, style) {
    // 调用生图 API (DALL-E / SD / etc)
    // → 返回 base64 data URL
  }

  async generateVideo(prompt, style) {
    // 调用生视频 API
    // → 返回 blob URL
  }

  async registerAsMapping(tokenName, assetData) {
    // 将生成的素材保存
    // 自动添加到当前素材包的 mappings
  }
}
```

Agent 调用流程：
```
Agent 判断需要图片表达
  → 调用生图 API
  → 获得图片数据
  → registerAsMapping("generated_sunset", imageData)
  → 后续回复中可使用 tokens: ["generated_sunset"]
```

---

## 十、v3 → v4 迁移对照

| v3 代码/概念 | v4 对应 | 变化 |
|-------------|---------|------|
| `applyEmotion()` + 硬编码 emotionMap (12种) | 素材映射包 `mappings` 中 category:emotion | 数据驱动，可换包 |
| `emotionLayer` 全局变量 | `TokenEngine.activeTokens` | 引擎管理 |
| `applyMove()` 中 shapes 对象 (8种) | `SHAPES` 注册表 + 素材包 `mappings` 中 shape 字段 | 分离注册与数据 |
| `actionQueue` + `currentAction` + `heldAction` | `TokenEngine` 内部动作队列 | 统一管理 |
| 内联 `p.cr += (target - p.cr) * 0.01` | `SpringPool` 的 `color_r/g/b` 弹簧 | 统一过渡物理 |
| `buildSystemPrompt()` 140 行硬编码 | `PromptBuilder.build(dictionary)` | 从词典动态生成 |
| `processBodyCommand(body)` 8 种指令 | `TokenEngine.resolve(tokenNames)` | Token 查表替代指令解析 |
| `actionMemory` / `si_memory` | 词典包 tokens + 素材包 mappings (localStorage) | 统一存储 |
| AI 返回 `{"content":"...", "body":{...}}` | AI 返回 `{"content":"...", "tokens":[...]}` | 纯 Token 名替代结构化指令 |
| 4 层 JSON 容错解析 | 保留，但解析 `tokens` 字段而非 `body` | 字段变更 |
| `providers.js` | **零改动，直接复用** | 不变 |

---

## 十一、技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 文件结构 | 保持单文件 index.html | 最小改动，无构建工具依赖 |
| 内部组织 | class 划分边界 | 清晰可维护 |
| Token 存储 | localStorage (JSON) | 轻量，用户可直接编辑 |
| 词典包数量 | MVP 1 个，后续支持多包 | 先跑通再扩展 |
| AI 输出格式 | 纯 Token 名，无 body | AI 只管语义，不管渲染 |
| Spring 物理 | 自实现 | 代码量极小，无需物理引擎 |
| 渲染器 | Three.js (CDN) + HTML/CSS 叠加 | v3 已验证 |
| AI 接口 | providers.js 零改动复用 | 已支持 6 个提供商 |

---

## 十二、里程碑

| 里程碑 | 内容 | 预估 |
|--------|------|------|
| M1: 引擎核心 | T1-T5: Schema + 词典 + 素材包 + SpringPool + TokenEngine | 2天 |
| M2: AI 跑通 | T6-T8: PromptBuilder + Renderer 适配 + AI 链路 | 1.5天 |
| M3: Phase 1 完成 | T9-T10: 新 token UI + 清理 v3 硬编码 | 1.5天 |
| M4: Phase 2 完成 | T11-T16: 图片/GIF 渲染器 + 素材包切换 | 4天 |
| M5: Phase 3 完成 | T17-T21: Agent 协议 + 动态注册 + 生图管道 | 3天 |

---

## 十三、风险与缓解

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| AI 不遵守 Token 格式，输出了 body 而非 tokens | 高 | 4 层 JSON 解析增加 tokens/body 双字段检测 |
| AI 返回词典中没有的 token | 中 | default_mapping 降级 + UI 提示添加 |
| SpringPool 参数调不好，过渡不如 v3 流畅 | 中 | 保留 v3 的默认 k/d 值为基准，逐参数调优 |
| 素材包与词典包 token 名不一致 | 低 | 词典缺失用 default_mapping 兜底；映射缺失同理 |
| 单文件代码量增长（1145 → ~1500 行） | 低 | class 边界清晰，新增约 300-400 行 |

---

## 附录：完整数据流对比

```
v3 (当前):
  用户 → AI → {"content":"...", "body":{"feel":{"emotion":"joy","intensity":0.7}}}
       → processBodyCommand()
       → 硬编码 emotionMap 查 emotion="joy"
       → 内联 lerp 0.01 过渡颜色
       → 渲染

v4 Phase 1 (粒子 Token):
  用户 → AI → {"content":"...", "tokens":["happy"]}
       → TokenEngine.resolve(["happy"])
       → 词典: happy 存在, category=emotion
       → 素材包: happy → {color:[0.92,0.78,0.28], spread:0.35, ...}
       → SpringPool 弹性过渡
       → 渲染

v4 Phase 2 (图片 Token):
  用户 → AI → {"content":"...", "tokens":["happy"]}
       → TokenEngine.resolve(["happy"])
       → 词典: happy 存在
       → 素材包(图片): happy → {src:"nailong/02_happy.jpg"}
       → ImageRenderer 切换图片
       → 渲染

v4 Phase 3 (Agent 接入):
  Agent → registerFromAgent({action:"token.register", token:{name:"sunset",...}})
       → registerFromAgent({action:"mapping.register", token_name:"sunset", mapping:{...}})
       → AI 后续回复可用 tokens:["sunset"]
```
