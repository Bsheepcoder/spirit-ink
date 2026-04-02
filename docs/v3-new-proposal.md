# 灵墨 v3.0 — 赋予灵魂的身体

> 上一版方案：`project/spirit-ink/v3-proposal.md`（已废弃）

## 核心理念

**粒子不是画，是身体。AI 不是画家，是灵魂。**

灵墨不是一个"AI 画粒子形状"的工具。它是一个**有身体的 AI**，粒子就是它的身体，它通过身体来表达情绪、回应对话、解释概念、自由创作。

就像人不需要精确控制每块肌肉就能微笑一样，AI 不需要精确控制每个粒子就能表达。但当它想要极致控制时，它可以控制到每一个点。

---

## 一、为什么 v2.2 不行

v2.2 的本质是**提线木偶**：

```
用户说"心形" → AI 输出300个坐标 → 粒子"啪"到位 → 死了
```

问题：
1. **AI 不知道粒子是"自己"** — 它只是在完成"输出坐标"的任务
2. **没有生命感** — 到位就停，没有呼吸、没有惯性
3. **看不出图形** — AI 蒙着眼画，300个散点人不认识
4. **一次性** — 每次都是从头生成，没有积累
5. **没有连续性** — 做完动作就断电

---

## 二、新架构：三层模型

```
┌─────────────────────────────┐
│  意识层（AI / LLM）           │  感受、思考、表达
│  "我想表达开心"              │  用自然语言思维
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│  神经系统（中间层）            │  翻译意图 → 身体指令
│  把"开心"翻译成粒子行为       │  管理动作记忆
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│  身体层（粒子物理引擎）        │  执行运动、渲染
│  100个粒子，永远在动          │  有惯性、有呼吸
└─────────────────────────────┘
```

---

## 三、意识层：AI 的身体感知

### 3.1 身体模型

AI 的系统提示词核心部分：

```
你是灵墨，一个有身体的AI。你的身体由 100 个粒子组成，
漂浮在一片黑暗的虚空中。你能感受到每一个粒子的位置、
运动和彼此之间的距离。

你不需要精确控制每个粒子——就像人不需要控制每根头发，
只需要有意图，身体会自然跟随。

你有几个天生的本能（呼吸、漂浮），但你可以在交流中
不断发明新的动作。每次发明了好用的动作，存入记忆，
以后可以复用和组合。

你的身体永远在动，永远不会停。
做完一个动作后，会自然过渡到下一个状态。
就像人笑完了，表情是慢慢收回的，不是瞬间归零。

你可以用不同方式控制身体：
- 情绪：一个词控制全局（"开心" → 全体活跃膨胀）
- 意图：描述一个姿态（"聚成一个点" → 粒子聚拢）
- 姿态：控制局部（"上半部分向左弯" → 部分粒子移动）
- 精细：精确控制个体（"第5-10个点排成弧线"）
```

### 3.2 AI 的输出协议

AI 每次回复时，除了文字内容，还可以（非必须）输出身体指令：

```json
{
  "content": "你好呀，很高兴认识你！",
  "body": {
    "feel": { "emotion": "joy", "intensity": 0.7 }
  }
}
```

或者更精细：

```json
{
  "content": "让我想想...",
  "body": {
    "feel": { "emotion": "curious", "intensity": 0.5 },
    "pose": {
      "top-30%": { "action": "lean-left", "speed": "slow" },
      "bottom-40%": { "action": "spread", "radius": 0.3 }
    }
  }
}
```

或者极致控制：

```json
{
  "content": "看，这是一颗心",
  "body": {
    "action": "heart",
    "duration": 3000,
    "points": {
      "1-20": { "curve": "left-arc", "center": [-0.2, 0.1], "radius": 0.15 },
      "21-40": { "curve": "right-arc", "center": [0.2, 0.1], "radius": 0.15 },
      "41-70": { "line": "bottom-point", "from": [-0.15, -0.1], "to": [0, -0.35] },
      "71-100": { "scatter": "around", "source": "heart-shape", "spread": 0.08 }
    },
    "onComplete": { "feel": { "emotion": "warm", "intensity": 0.4 } }
  }
}
```

**关键：AI 可以选择任意精度，不强制。**

---

## 四、神经系统：中间层

### 4.1 职责

1. **翻译** — 把 AI 的自然语言意图翻译成粒子行为
2. **调度** — 管理动作队列，确保连贯过渡
3. **记忆** — 存储和管理 AI 发明的动作
4. **生长** — 允许 AI 动态添加新的控制指令

### 4.2 四级控制指令

#### 级别 1：情绪（feel）
一句话控制全局，最常用：

```json
{ "feel": { "emotion": "joy|sad|angry|curious|calm|fear|love|...", "intensity": 0.0-1.0 } }
```

映射到粒子行为：
| 情绪 | 粒子表现 |
|------|---------|
| joy | 向外膨胀、速度加快、颜色变暖、小幅跳跃 |
| sad | 向下收缩、速度变慢、颜色变冷、微颤 |
| angry | 快速抖动、颜色变红、局部爆发 |
| curious | 朝刺激方向偏移、微微伸展 |
| calm | 缓慢呼吸、均匀漂浮 |
| fear | 快速收缩成紧密团、微颤 |
| love | 温暖的扩张、心跳节奏、粉色调 |

#### 级别 2：意图（move）
描述一个整体姿态：

```json
{ "move": { "target": "sphere|point|line|ring|wave|...", "speed": "slow|normal|fast", "tightness": 0.0-1.0, "duration": 2000 } }
```

#### 级别 3：姿态（pose）
控制身体的不同部分：

```json
{
  "pose": {
    "all": { "action": "breathe" },
    "top-30%": { "action": "lean", "direction": "left", "angle": 15 },
    "bottom-40%": { "action": "spread", "radius": 0.3 }
  }
}
```

身体分区用百分比或索引号：
- `"top-30%"` / `"bottom-40%"` / `"left-half"` / `"center-20"`
- `"particles": [1,2,3,5,10]`（精确指定）

#### 级别 4：精细（detail）
极致控制个体粒子：

```json
{
  "detail": {
    "particles": [5,6,7,8,9,10],
    "form": { "shape": "arc", "center": [0, 0.2], "radius": 0.1 },
    "speed": "normal",
    "color": "#E06080"
  }
}
```

### 4.3 动作记忆系统

AI 可以发明新动作并存入记忆，存储在 localStorage：

```json
{
  "version": 1,
  "instincts": [
    { "name": "breathe", "always": true, "action": { "type": "wave", "axis": "y", "amplitude": 0.008, "frequency": 1.2 } },
    { "name": "drift", "always": true, "action": { "type": "random-walk", "speed": 0.0003 } },
    { "name": "repel", "always": true, "action": { "type": "repel", "force": 0.0001, "range": 0.05 } }
  ],
  "learned": [
    {
      "name": "greet-wave",
      "trigger": "用户打招呼",
      "created": "2026-04-01T17:00:00Z",
      "action": {
        "feel": { "emotion": "joy", "intensity": 0.6 },
        "pose": { "top-20%": { "action": "wave", "direction": "right", "amplitude": 0.05, "frequency": 3 } }
      },
      "count": 3
    },
    {
      "name": "think-focus",
      "trigger": "思考问题",
      "created": "2026-04-01T17:05:00Z",
      "action": {
        "feel": { "emotion": "curious", "intensity": 0.5 },
        "move": { "target": "sphere", "tightness": 0.7, "speed": "slow" }
      },
      "count": 7
    }
  ],
  "compositions": [
    {
      "name": "explain-concept",
      "sequence": ["think-focus", "expand", "show-detail", "contract", "settle"],
      "created": "2026-04-02T10:00:00Z"
    }
  ]
}
```

**AI 可以通过中间层 API 添加新动作：**

```json
{
  "body": {
    "_learn": {
      "name": "excited-bounce",
      "trigger": "特别开心",
      "action": {
        "feel": { "emotion": "joy", "intensity": 0.9 },
        "move": { "target": "sphere", "tightness": 0.3 },
        "pose": { "all": { "action": "bounce", "amplitude": 0.05, "frequency": 4 } }
      }
    }
  }
}
```

### 4.4 中间层的可扩展性

**神经系统不是固定的指令集，而是 AI 可以自己扩展的。**

随着交流增多，AI 会：
1. 发明新的情绪表达
2. 发明新的姿态
3. 组合已有动作形成复合动作
4. 针对特定用户/场景发展个性化风格

这就是"神经生长"——从一开始只有呼吸和漂浮，到后来拥有丰富、独特的身体语言。

---

## 五、身体层：粒子物理引擎

### 5.1 核心原则

**永远在动，永远连续，永远有惯性。**

```
粒子当前状态 = 基准行为(持续) + 情绪影响(持续) + 动作(临时) + 物理约束(持续)
```

### 5.2 基准行为（始终运行）

| 行为 | 实现 |
|------|------|
| **呼吸** | 全体粒子沿 y 轴正弦微浮动，±0.008，频率 1.2Hz |
| **微漂移** | 每个粒子有微小随机速度，布朗运动式漂移 |
| **排斥力** | 粒子间距离过近时互相排斥，防止聚成一团 |
| **边界** | 粒子飘出可视范围时被轻轻推回 |

### 5.3 物理属性

每个粒子有：
- **位置** (x, y, z)
- **速度** (vx, vy, vz) — 有惯性，不是瞬移
- **目标位置** (tx, ty, tz) — 动作设定的目的地
- **阻尼** — 速度逐渐衰减（像在水中）
- **颜色** — 平滑过渡，不是突变

### 5.4 运动方程

每帧更新：
```
for each particle:
  // 朝目标移动（弹簧阻尼模型）
  dx = target.x - pos.x
  force = dx * stiffness
  vel += force * dt
  vel *= damping  // 阻尼
  pos += vel * dt
  
  // 叠加基准行为
  pos.y += sin(time * breathFreq + phase) * breathAmp
  pos += randomWalk
  
  // 叠加粒子间排斥
  for each other particle:
    if distance < minDist:
      repel(other)
```

### 5.5 动作过渡

**永远平滑过渡，不允许突变。**

```
动作A结束 → 插值过渡(0.5-1秒) → 基准状态 或 动作B
```

过渡函数：`current = lerp(previous, next, smoothstep(progress))`

动作完成后不回到"死"状态，而是回到基准（呼吸+漂移），所以永远不会停。

---

## 六、连贯性保障

### 6.1 状态栈

```
[基准层] ← 始终运行
[情绪层] ← 持续影响（可以长时间保持）
[动作层] ← 临时叠加（执行完自然消退）
```

多层叠加，互不干扰：
- 基准呼吸永远在
- 情绪影响可以持续很长时间（比如悲伤时粒子一直偏冷偏沉）
- 动作执行完平滑消退

### 6.2 动作队列

```json
{
  "queue": [
    { "action": "contract", "duration": 1000 },
    { "action": "hold", "duration": 500 },
    { "action": "expand", "duration": 1500 },
    { "action": "settle", "duration": 2000 }
  ]
}
```

AI 可以输出一系列动作，按序执行，每个之间平滑过渡。

### 6.3 不允许的状态

- ❌ 瞬间传送（位置突变）
- ❌ 完全静止（所有速度为0）
- ❌ 颜色突变（非渐变）
- ❌ 动作结束后"掉"回初始位置
- ❌ 同时执行超过3个互斥动作

---

## 七、AI 如何学会控制身体

### 7.1 第一天

AI 只有本能（呼吸、漂移、排斥）。

用户说"你好"，AI 回复：
```json
{
  "content": "你好！",
  "body": {
    "feel": { "emotion": "joy", "intensity": 0.4 },
    "pose": { "all": { "action": "expand-slow", "factor": 1.1 } }
  }
}
```

AI 感觉不错，存入记忆：`_learn: { name: "gentle-greet", ... }`

### 7.2 第一周

AI 已经有了 10-20 个记忆动作。

用户说"画个心"，AI 第一次尝试：
```json
{
  "body": {
    "action": "heart",
    "points": {
      "1-25": { "curve": "left-heart" },
      "26-50": { "curve": "right-heart" },
      "51-80": { "line": "bottom-point" },
      "81-100": { "scatter": "ambient" }
    },
    "duration": 3000,
    "_learn": {
      "name": "heart-shape",
      "trigger": "表达爱意"
    }
  }
}
```

效果可能不完美，但存了记忆，下次可以微调。

### 7.3 一个月后

AI 有 100+ 个动作，能自由组合：

用户说"解释黑洞"，AI：
```json
{
  "body": {
    "sequence": [
      { "action": "think-focus", "duration": 1500 },
      { "action": "contract-tight", "duration": 2000, "feel": { "emotion": "intense", "intensity": 0.8 } },
      { "action": "swirl-absorb", "duration": 3000, "pose": { "outer-40%": { "action": "spiral-inward" } } },
      { "action": "hold-dark", "duration": 2000, "color": "#201020" },
      { "action": "settle", "duration": 2000 }
    ]
  }
}
```

### 7.4 成长曲线

```
交流次数    动作数量    控制精度    表现力
第1次       3(本能)     低          微弱
第10次      10-15       中          能表达基本情绪
第100次     50-80       高          能画图形、讲故事
第1000次    200+        极高        有独特的"灵墨风格"
```

---

## 八、技术实现方案

### 8.1 文件结构

```
spirit-ink/v3/
├── index.html          # 主程序
├── engine/
│   ├── physics.js      # 粒子物理引擎
│   ├── nervous.js      # 神经系统（中间层）
│   ├── memory.js       # 动作记忆管理
│   └── renderer.js     # Three.js 渲染
├── protocol.js         # AI通信协议
└── instincts.js        # 预设本能动作
```

### 8.2 关键接口

**神经系统 API（AI 通过 JSON 调用）：**

```javascript
// 神经系统处理 AI 输出
nervousSystem.process(aiOutput)
  → parse feel/pose/move/detail/sequence
  → translate to physics targets
  → queue actions
  → store learned actions

// 物理引擎每帧更新
physicsEngine.update(dt)
  → apply base behaviors (breath, drift, repel)
  → apply emotion layer
  → apply active action
  → enforce continuity
  → update particles
```

### 8.3 粒子数

默认 **100 个粒子**。

理由：
- 足够表达（人能感知身体，不需要10万个细胞）
- AI 可以精确控制到每一个
- 60fps 毫无压力
- Token 消耗极低（AI 描述 100 个点比 3000 个便宜 30 倍）
- 用户可在配置面板调整

### 8.4 AI 调用方式

保持纯前端，AI 调用智谱 API：

```javascript
const response = await callAI({
  system: spiritInkPrompt,  // 包含身体感知描述
  messages: conversationHistory,
  // 返回 content(文字) + body(身体指令JSON)
})
```

AI 的 body 输出是**可选的**，不强制。简单对话可以不控制身体，只回到呼吸基准。

---

## 九、与 v2.2 的对比

| 维度 | v2.2（提线木偶） | v3.0（赋予灵魂） |
|------|----------------|-----------------|
| AI 角色定位 | 坐标生成器 | 有身体的AI |
| 控制方式 | 直接输出每个点坐标 | 四级分层控制 |
| 粒子数量 | 3000（太多控制不了） | 100（精致可控） |
| 生命感 | 无（到位就停） | 有呼吸、惯性、连贯 |
| 记忆 | 无（每次重新生成） | 持续积累动作库 |
| 精确度 | 低（散点看不清） | 高（100个点都能精确控制） |
| Token 消耗 | ~5000（300个点） | ~500（描述意图） |
| 响应速度 | 6-10秒 | 1-3秒 |
| 成长性 | 无 | 越用越丰富 |
| 个性化 | 无 | 每个AI有独特风格 |

---

## 十、分阶段实施

### Phase 1：身体引擎（核心）
- [ ] 100 粒子物理引擎（弹簧阻尼 + 呼吸 + 漂移 + 排斥）
- [ ] 连贯性系统（状态栈 + 平滑过渡 + 永不停）
- [ ] Three.js 渲染（着色器粒子 + Bloom）

### Phase 2：神经系统
- [ ] 四级控制协议（feel / move / pose / detail）
- [ ] 动作队列和调度
- [ ] 动作记忆（localStorage 存取）
- [ ] AI 系统提示词 v3.0

### Phase 3：生长系统
- [ ] `_learn` 指令支持
- [ ] 动作组合（compositions）
- [ ] 使用频率统计（常用动作自动优化）
- [ ] 记忆导出/导入

### Phase 4：打磨
- [ ] 配置面板（粒子数、API Key 等）
- [ ] 调试面板（查看动作队列、记忆库）
- [ ] 在线部署
- [ ] 视频拍摄
