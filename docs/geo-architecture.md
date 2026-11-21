# 上海欧连电子官网（oulink-site）GEO 架构与精密汽车工业 UI 设计蓝图

> **文档版本**：v1.0（已全面合并 `#5` 用户上传全新官方 VI 手册与 `#6` 像素级官方色板）  
> **架构总师**：`geo-architect`  
> **服务主体**：上海欧连电子科技有限公司（Shanghai Ou-Link Electronic Technology Co., Ltd.）  
> **核心原则**：**深度继承 `aifde-site` 的工程化 GEO 与事实治理思路，100% 摒弃其暗黑科幻粒子风格；打造“精密汽车工业制造美学（Precision Automotive Manufacturing）”与行业级 AI 检索引擎友好的现代双语官网。**

---

## 目录

1. [方法论迁移：参考 `aifde-site` 的思路，彻底重塑工业视觉](#1-方法论迁移参考-aifde-site-的思路彻底重塑工业视觉)
2. [全新官方 VI 与“精密汽车工业制造美学” UI 设计系统](#2-全新官方-vi-与精密汽车工业制造美学-ui-设计系统)
3. [制造企业全栈 GEO（生成式引擎优化）核心架构](#3-制造企业全栈-geo生成式引擎优化核心架构)
4. [Claim Ledger（事实与诚信边界台账：零容忍清除原站假证书）](#4-claim-ledger事实与诚信边界台账零容忍清除原站假证书)
5. [工程目录结构、数据契约与静态预渲染流水线](#5-工程目录结构数据契约与静态预渲染流水线)
6. [自动化质量门禁（QA Gates）与验收标准](#6-自动化质量门禁qa-gates与验收标准)

---

## 1. 方法论迁移：参考 `aifde-site` 的思路，彻底重塑工业视觉

本方案严格遵循用户核心诉求——**“参考我的网站的思路，不要参考风格，为一家制造型企业从 GEO 的角度优化他们的官网 `http://www.ou-link.com/`，同时兼顾 UI 设计”**：

| 维度 | 继承自 `aifde-site` 的核心工程/GEO 思路（保留并针对制造业强化） | 摒弃 `aifde-site` 的元素 -> 替换为欧连电子专属工业方案 |
| :--- | :--- | :--- |
| **渲染与爬虫友好度** | Vite + React 19 同构构建期静态预渲染（`scripts/prerender.mjs`），所有双语路由直出完整静态 HTML，无 JS 环境下正文、`<h1>`、参数表格 100% 可抓取 | 摒弃 Three.js / WebGPU / WebGL2 粒子画布与 `Scene00Loader` 启动遮罩；实现 **0ms 首屏内容可见**，极致轻快 |
| **AI 检索喂养（GEO）** | 根路径提供结构化 `/llms.txt`，全站注入语义化 JSON-LD `@graph`，严格区分预览与生产索引门禁 | 从概念方法描述升级为 **制造业硬核选型知识库**：新增 `/llms-full.txt`（含 300+ 在库连接器原厂料号索引）、`Product`/`Offer`/`ItemList`/`FAQPage` Schema 及国产替代选型对照表 |
| **事实治理（Claim Ledger）** | 严格区分已验证事实与未验收内容，拒绝夸大或编造客户案例 | **彻底清除原站“孙悟空经理”、“北京市自主创新产品证书”等假荣誉图**及错位模板招聘信息；重构为真实可验证的五步供应链品控溯源流程 + 配置化资质归档插槽 |
| **双语国际化架构** | `/zh/*` 与 `/en/*` 完全对称路由、双向 `hreflang`（`zh-CN` / `en` / `x-default`）、自引用 `canonical`、本地化真实 `404` 响应 | 英文版不再是品牌哲学的文学转译，而是面向**跨国 Tier-1 线束厂、海外连接器采购商与原厂伙伴**的专业汽车互连工程术语（MPN, Housing, Terminal, CPA/TPA, Pin-to-Pin Cross-Reference） |
| **可维护内容层** | 集中式结构化配置（`src/content/`），无需改动 UI 布局代码即可更新文案、Logo、品牌列表与产品数据，配自动化配置替换测试 | 扩展支持 **结构化汽车连接器料号库（`productsCatalog.js`）** 与 **真实资质证书开关插槽** |
| **视觉美学基调** | 组件克制、网格严谨、杜绝廉价 SaaS 紫色渐变反模式 | 摒弃 `#080808` 纯黑底、荧光粒子与乱码解码动效；全面采用欧连电子 **全新官方 VI 手册** 的 **浅灰蓝工程制图底色（`#EFF3F7`）+ 纯白规格卡 + 深海军蓝（`#092143`）+ 赛博青蓝（`#02B0EE`）& 电光橙（`#FE6A08`）** 精密汽车工业设计语言 |

---

## 2. 全新官方 VI 与“精密汽车工业制造美学” UI 设计系统

### 2.1 设计理念：Precision CAD Blueprint × Automotive Spec-Sheet（精密工程制图与汽车互连规格书美学）

欧连电子的核心受众是**汽车整车厂（OEM）连接器研发工程师、汽车线束厂采购与工艺工程师、连接器原厂及海内外经销商**。界面设计必须传递三大直觉信号：**正品可靠（Authentic）、参数精准（ Tolerance-Precise）、响应高效（Fast BOM Fulfillment）**。

- **摒弃平庸模板与旧站缺陷**：彻底淘汰旧站低清草绿配色、拉伸变形的供应商 Logo 墙、文字被圆环截断的粗糙拼贴 Banner，以及 `javascript:;` 死链。
- **落实全新官方 VI 灵魂**：以官方 VI 手册中的 **倾斜 3D 精密链环连接器图形** 与 **CAD 几何辅助线/构造圆** 为空间母题，营造如同翻阅罗森伯格（Rosenberger）或泰科（TE）原厂精密工程目录般的专业信赖感。

### 2.2 官方像素级色彩规范（Design Tokens / CSS Variables）

以下代码变量与 `@asset-curator` 对用户上传官方 VI 手册原图（`#5` / `#6`）的像素级采样值 **100% 严格对齐**，前端样式表（`src/styles/tokens.css`）必须直接采用：

```css
:root {
  /* === 1. 官方 VI 核心品牌色（Pixel-Sampled Official Palette） === */
  --ou-navy: #092143;          /* Deep Navy 深海军蓝：核心品牌主色、主标题、深色工程模块底、主导航强调 */
  --ou-navy-deep: #05152C;     /* 深海铭牌底色：页脚工业铭牌区、高对比状态栏 */
  --ou-navy-hover: #123361;    /* 深海军蓝悬停态 */

  --ou-cyber-blue: #02B0EE;    /* Cyber Blue 赛博青蓝：高速高频数据连接（FAKRA/HSD/以太网）强调色、技术标签、焦点指示条 */
  --ou-cyber-tint: rgba(2, 176, 238, 0.10); /* 赛博青蓝极淡背景衬底 */

  --ou-volt-orange: #FE6A08;   /* Volt Orange 电光橙：车载高压电力连接象征、核心转化 CTA（BOM 询价/急件检索）、匹配高亮 */
  --ou-volt-hover: #E05A00;    /* 电光橙按钮悬停态（增强白字可读对比度） */
  --ou-volt-tint: rgba(254, 106, 8, 0.10);  /* 电光橙状态标签底色 */

  --ou-slate: #617282;         /* Slate Gray 板岩灰：官方工业中性色、英文斜体副标、表头字段、次要说明 */
  --ou-ice-blue: #A8CFEE;      /* Engineering Ice Blue 工程制图浅蓝：CAD 几何辅助圆、精密描边高亮、图表辅助线 */

  /* === 2. 背景与卡片表面层级（Surface Hierarchy） === */
  --bg-canvas: #EFF3F7;        /* Canvas Gray-Blue 官方浅灰蓝页面画布底色 */
  --bg-muted: #EDF0F4;         /* Muted Surface 次级工业浅灰面板（筛选栏、参数表头、规格代码块） */
  --bg-card: #FFFFFF;          /* Pure Card 纯白规格主卡片（承载连接器实拍图、品牌矢量矩阵、数据表格） */

  /* === 3. 文本与精密边框色阶（Text & Hairline Borders） === */
  --text-primary: #092143;     /* 一级正文与标题（对比度 > 13:1，远超 WCAG AAA） */
  --text-body: #2B3B4E;        /* 长文阅读深板岩色 */
  --text-muted: #617282;       /* 辅助标签与元数据 */
  --text-on-dark: #F7FAFC;     /* 深海军蓝背景上的反白文字 */

  --border-subtle: #DCE4EE;    /* 1px 标准卡片公差线 */
  --border-strong: #B8C9DC;    /* 表格分割与输入框默认描边 */

  /* === 4. 工业圆角与阴影（Crisp Industrial Geometry） === */
  --radius-xs: 4px;            /* 标签、料号徽章、小型按钮 */
  --radius-sm: 6px;            /* 搜索框、表单控件、参数单元格 */
  --radius-md: 10px;           /* 标准工业卡片（克制利落，严禁 >20px 玩具感大圆角） */
  --shadow-card: 0 1px 3px rgba(9, 33, 67, 0.05), 0 8px 24px rgba(9, 33, 67, 0.04);
  --shadow-elevated: 0 12px 32px rgba(9, 33, 67, 0.10);
}
```

### 2.3 字体排印体系（Industrial & Tabular Monospace Typography）

避免泛滥的 Inter / Arial 单调感，构建“硬朗工业标题 + 清晰双语正文 + 零混淆料号等宽体”三级字体栈：

1. **标题与数字大铭牌（Display & Section Headings）**：
   - `--font-display: "Barlow", "DIN Alternate", "Bahnschrift", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", sans-serif;`
   - 字重 `600`–`700`，大标题紧凑字距 `-0.02em`；英文品牌识别词（如 *Ou-Link Electronics*、*Precision Interconnect*）在局部眉标（Eyebrow）呼应官方 VI 采用优雅的工程斜体，传递连接速度感。
2. **双语界面正文（UI & Body Copy）**：
   - `--font-sans: "Plus Jakarta Sans", "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;`
   - 正文字号 `15px`–`16px`，行高 `1.65`，确保高密度工程文档长时间阅读不疲劳。
3. **连接器型号、库存、单价与技术公差专用等宽字体（Technical Part-Number Monospace — 关键体验！）**：
   - `--font-mono: "JetBrains Mono", "IBM Plex Mono", "Consolas", monospace;`
   - 全局强制开启 `font-variant-numeric: tabular-nums slashed-zero;`：
     - 确保料号如 `RT0W6106SNH03`、`044-8597-000`、`1-1418390-1`、`805-120-521` 中的数字 `0`（带斜杠或清晰窄椭圆）与字母 `O`、数字 `1` 与大写 `I` 瞬间区分，支持工程师双击完整选中复制；
     - 确保库存列与参考单价列小数点严格纵向对齐。

### 2.4 标志性视觉细节与核心工业组件规范

1. **工程公差微网格与 CAD 辅助线背景（Blueprint Micro-Grid）**：
   - 首屏 Hero 与品质溯源区块在 `--bg-canvas (#EFF3F7)` 之上叠加纯 CSS 双精度网格（`24px` 细格线 `rgba(9,33,67,0.03)` + `120px` 主坐标格线 `rgba(168,207,238,0.28)`），右侧配以轻量内联 SVG 绘制的 **几何构造同心圆、切线与链环互连示意图形**（呼应 VI Sheet 右侧制图美学），兼具极致的加载速度（0 外部大图阻塞）与独一无二的精密工业气质。
2. **顶栏与品牌标识规范（Header & Official SVG Logo）**：
   - 浅色顶栏固定高度 `72px`，纯白底配底部 `1px solid var(--border-subtle)`，左侧放置 `/assets/brand/oulink-logo.svg`（高 `40px`，矢量锐利，彻底解决原站小字模糊问题）；深海军蓝页脚（`#092143`）放置反白版 `/assets/brand/oulink-logo-dark.svg`。
   - 顶栏右侧集成：**快速料号搜索触发器（支持 `/` 快捷键）**、**BOM 询价单计数徽章（Volt Orange 角标）**、**中/英双语即时切换按钮（保持当前子路由对称跳转）**。
3. **首屏“毫秒级连接器型号检索引擎（Instant MPN Finder）”**：
   - 置于首屏核心视觉焦点，输入框占位提示真实典型料号（如：`输入原厂料号检索现货，例：1928404745 / 3-1418390-1 / AT04-3P / 805-120...`）。
   - 下方附带热门品牌/料号一键快筛胶囊（`TE Connectivity`、`Bosch`、`Hirschmann`、`Lear`、`Amphenol`、`Molex`、`Rosenberger`）。
   - 实时下拉或内联结果表展示：**原厂料号（MPN，高亮命中片段）**、**品牌/产品系列**、**实物缩略图**、**参考备库量**、**参考单价**、**`[+ 加入询价]` 按钮**。
   - **未命中转化闭环**：若用户输入不在当前公开库内的型号（如新型号或定制线束图号），绝不仅显示“未找到”，而是高亮显示：**`未在公开现货表命中 "[输入型号]" —— 点击一键提交该料号，获取原厂调配或国产 Pin-to-Pin 替代方案（工作时间 2 小时内响应）`**。
4. **严格等比合作品牌矢量墙（Zero-Distortion Brand Matrix）**：
   - 彻底根除原站 `.lp-img20 img { width: 100%; height: 100% }` 造成的拉伸变形与文字截断灾难。
   - 采用响应式 CSS Grid（桌面 5 列 / 平板 3 列 / 手机 2 列），每张纯白卡片内设固定比例矢量视窗（`height: 64px; display: flex; align-items: center; justify-content: center; padding: 8px 16px;`），品牌 SVG 强制 `width: auto; height: auto; max-width: 150px; max-height: 44px; object-fit: contain;`，下方配规范中英文品牌名、供应品类标签及“查看在库型号 ->”筛选联动。
5. **BOM 配单询价抽屉 / 表单（Multi-Part BOM RFQ Tray）**：
   - 支持两种高效工业采购操作：
     - **点选累加模式**：在任意产品卡片或型号表格行点击 `+ BOM`，自动加入本地会话配单列表，可调整每个型号的需求数量（PCS）；
     - **批量粘贴模式**：在询价页提供“批量粘贴料号清单”文本框，支持采购员直接从 ERP / Excel 粘贴多行 `料号  数量  目标交期`。
6. **全视口响应式适配规范（Desktop & Mobile Parity）**：
   - 断点体系：`1440px+`（宽屏工程工作站）、`1024px`（笔记本）、`768px`（平板）、`390px`（主流手机）、`320px`（小屏手机极限兜底）。
   - 移动端导航：折叠为无障碍抽屉菜单（支持 `aria-expanded`、`Escape` 键关闭、焦点锁定，触控目标尺寸全部 `>= 44px × 44px`）。
   - 移动端参数表格：在小屏自动转为紧凑的 **工程铭牌卡片布局（MPN 置顶 + 双列键值对网格 + 底部全宽询价按钮）**，确保全站任意页面在 `320px` 宽度下 `scrollWidth <= innerWidth`（零横向溢出）。

---

## 3. 制造企业全栈 GEO（生成式引擎优化）核心架构

### 3.1 制造业买家与工程师的 AI 搜索意图模型（Query Intent Mapping）

针对 ChatGPT Search、Perplexity、DeepSeek、Claude、Google AI Overviews、豆包、Kimi、秘塔 AI 搜索等生成式引擎，围绕四大真实 B2B 采购与研发检索场景构建可引用事实锚点：

| 检索角色 | 典型 AI 提问（Prompt 范式） | 欧连官网对应的 GEO 承接页面与结构化锚点 |
| :--- | :--- | :--- |
| **线束厂采购 / 急件寻源** | “`1928404745` / `3-1418390-1` / `805-120-521` 国内哪里有现货？单价大概多少？上海附近连接器供应商推荐” | `/zh/products` 预渲染料号表 + `Product`/`Offer` JSON-LD + `/llms-full.txt` 全量料号索引 |
| **整车厂连接器工程师** | “进口汽车连接器（TE/博世/李尔/赫斯曼）交期太长，国内哪家能做 Pin-to-Pin 国产替代导入和正逆向开发？” | `/zh/solutions` 四大工程能力详解 + 《跨品牌选型与国产替代技术核验表》 + `FAQPage` Schema |
| **高速智能座舱/智驾硬件研发** | “罗森伯格（Rosenberger）FAKRA / HSD 车载射频高速连接器与安费诺汽车连接器在上海有哪些渠道支持与线束配套商？” | `/zh` & `/zh/solutions` 品牌生态矩阵 + 高频/高压连接器技术应用场景解析 |
| **供应商资质背调 / SQE** | “上海欧连电子科技有限公司是做什么的？成立多久？地址电话多少？如何保障汽车连接器原厂正品？” | `/zh/about` & `/zh/quality` 五步原厂批次溯源流程 + `Organization` JSON-LD + `/llms.txt` 权威摘要 |

### 3.2 双语对称路由矩阵与预渲染静态直出规划

所有路由均由 `scripts/prerender.mjs` 在构建期直接渲染出完整 HTML 文件，保证每个页面拥有**唯一 `<h1>`**、独立精准的 `<title>` 与 `<meta name="description">`、双向 `hreflang` 及路由专属 JSON-LD：

| 路由 Key | 中文路径（默认 `x-default`） | 英文对称路径 | 构建产物路径（`dist/client/`） | 核心内容与预渲染 GEO 重点 |
| :--- | :--- | :--- | :--- | :--- |
| `home` | `/` 及 `/zh` | `/en` | `index.html`, `zh.html`, `en.html` | 企业定位（深耕汽车连接器 >14 年）、首屏 MPN 检索引擎、四大客户赋能矩阵、高清品牌 SVG 墙、精选高频现货料号直出表、核心 FAQ |
| `products` | `/zh/products` | `/en/products` | `zh/products.html`, `en/products.html` | **连接器与在库料号中心**：按品牌/系列分类索引、服务端直出高优代表型号参数表（MPN、品牌、分类、参考库存、参考单价）+ 客户端全量 300+ 型号瞬时检索与分页浏览 |
| `solutions` | `/zh/solutions` | `/en/solutions` | `zh/solutions.html`, `en/solutions.html` | **整车与线束工程配套方案**：① 整车厂选型导入/国产替代/正逆向开发；② 线束厂供应链优化与加工应用技术支持；③ 连接器厂全球拓展；④ 渠道商务技术支持 + **汽车各大系统连接器选型规格对照表** |
| `quality` | `/zh/quality` | `/en/quality` | `zh/quality.html`, `en/quality.html` | **品质管控与正品溯源体系**（替代原站假荣誉页）：五道品控工序（渠道准入 -> IQC 外观公差抽检 -> 批次原厂标签核验 -> 防潮防静电仓储 -> 出库可追溯单据）+ 配置化真实资质插槽 + 审厂/批次检验 FAQ |
| `about` | `/zh/about` | `/en/about` | `zh/about.html`, `en/about.html` | **关于欧连电子**：2012 年创立背景、上海闵行运营中心、进口与自主双轮资源整合优势、合作生态与长期工程技术岗位投递说明 |
| `contact` | `/zh/contact` | `/en/contact` | `zh/contact.html`, `en/contact.html` | **BOM 配单询价与联系我们**：多料号 BOM 结构化询价单、商务热线 `021-64778688`、官方邮箱 `service@ou-link.com`、上海市闵行区春申路 2525 弄欧银集心大楼 312 室精确地址与工作时间 |
| `notFound` | `/zh/404` | `/en/404` | `404.html`, `zh/404.html`, `en/404.html` | 本地化 404 错误页（`noindex, nofollow`，不含 `canonical`，附带快速返回型号检索入口） |

> **关键预渲染体积与爬虫平衡策略**：原站共有 300+ 条连接器料号记录。为兼顾预渲染 HTML 首包加载速度（LCP < 1.5s）与全量料号可检索性：
> 1. `/zh/products.html` 与 `/en/products.html` 在静态 HTML `<table>` 中默认直出 **各核心品牌最具代表性的精选高频型号（如前 60~80 个主力型号，覆盖 TE、Bosch、Hirschmann、Lear、Amphenol、Molex、Yazaki、Souriau 等全部品牌）** 及 **全品牌料号段统计汇总表**，并在客户端水合后无缝加载全量 300+ 型号 JSON 供即时搜索与分类筛选；
> 2. 同时由构建脚本自动生成 **`/llms-full.txt`**，以纯文本 Markdown 表格完整列出 **全部 300+ 个在库原厂料号、对应品牌归属、参考库存与参考价格**，确保大模型爬虫一次读取即可 100% 掌握欧连全量库存目录！

### 3.3 `/llms.txt` 与 `/llms-full.txt` 双层 AI 检索协议规范

由构建期脚本 `scripts/generate-geo-files.mjs` 从集中式配置与清洗后的产品数据**自动编译生成**至 `public/` 与 `dist/client/`，保证与页面数据零偏差：

#### （1）`/llms.txt` 结构规范（精要权威索引，<= 4KB）
```markdown
# 上海欧连电子科技有限公司 (Shanghai Ou-Link Electronic Technology Co., Ltd.)

> 上海欧连电子科技有限公司成立于 2012 年（深耕汽车连接器行业超 14 年），总部位于中国上海市闵行区。公司全面整合国际一线进口汽车连接器与国内优质自主品牌连接器资源，为汽车整车厂（OEM）、汽车线束厂、连接器制造商及经销伙伴提供正品现货配套、BOM 整单配单、国产化 Pin-to-Pin 替代选型、正逆向工程开发及线束加工应用技术支持。

## 核心页面导航 (Core Pages)

- [/zh](/zh): 中文首页 — 企业概览、连接器原厂料号（MPN）检索与核心供应生态
- [/zh/products](/zh/products): 产品与在库料号中心 — 涵盖 TE、Bosch、Lear、Hirschmann、Amphenol、Rosenberger、Molex 等 300+ 现货/常备汽车连接器型号规格与参考库存
- [/zh/solutions](/zh/solutions): 整车与线束工程配套方案 — 产品导入（Design-in）、进口连接器国产化替代、正逆向开发与线束压接工艺支持
- [/zh/quality](/zh/quality): 品质管控与正品溯源 — 五步来料检验、原厂批号溯源与防潮仓储管理体系
- [/zh/about](/zh/about): 关于欧连电子 — 发展历程、业务定位与合作生态
- [/zh/contact](/zh/contact): BOM 配单询价与联系方式 — 在线多料号询价及上海闵行总部地址
- [/en](/en): English Homepage — Automotive Connector Supply Chain & Engineering Partner in Shanghai
- [/en/products](/en/products): Automotive Connector Part Number (MPN) Catalog & Stock Reference
- [/en/solutions](/en/solutions): Design-in, Cross-Reference Localization, Forward/Reverse Engineering & Harness Support
- [/en/quality](/en/quality): Authentic Traceability & 5-Stage Quality Control Protocol
- [/en/contact](/en/contact): Multi-MPN BOM RFQ & Shanghai Office Contact
- [/llms-full.txt](/llms-full.txt): 全量工程服务问答与 300+ 在库汽车连接器原厂料号（MPN）完整索引表

## 核心业务能力与品牌覆盖 (Capabilities & Brands)

- **四大服务对象**：汽车整车厂（产品导入/产品替换/正逆向开发）、汽车线束厂（供应链优化/生产加工应用支持）、连接器生产厂（全球市场拓展）、连接器贸易与代理商（现货调配与技术商务支持）。
- **重点供应与技术服务品牌（共 17 家国际一线连接器品牌 + 国内自主战略伙伴）**：
  - **5 家核心授权经销**：LEAR（李尔）、HIRSCHMANN（赫斯曼）、Amphenol（安费诺精密连接）、Rosenberger（罗森伯格）、BOSCH（博世）；
  - **12 家原厂合作与经销配套**：TE Connectivity（泰科）、MOLEX（莫仕）、MTA（意大利美达）、Aptiv / DELPHI（安波福/德尔福）、YAZAKI（矢崎）、Sumitomo（住友电装）、JST（日压端子）、KET（韩国端子）、KOSTAL（科世达）、FCI（法马通）、DEUTSCH（德驰）、ITT（埃梯梯科能）。
- **在库产品规模**：公开目录涵盖 **383 款真实汽车连接器原厂料号（MPN）**，累计常态备库超 **1,286 万件（12,864,330 PCS）**，支持 SPQ/MOQ 规范包装与研发试制配套。

## 真实联系信息与事实边界 (Verified Contact & Claim Boundaries)

- **地址**：上海市闵行区春申路 2525 弄欧银集心大楼 312 室 (Room 312, Ouyin Jixin Building, Lane 2525 Chunshen Rd, Minhang District, Shanghai, China)
- **总机电话**：+86-21-64778688 ｜ **销售客服直线**：+86-21-64809788
- **邮箱**：service@ou-link.com
- **工作时间**：周一至周六 09:00–18:00 (GMT+8)
- **事实声明**：公开目录所示单价与库存数量为常态备库参考值，实际交易单价、批次号（Lot/Date Code）、最小包装量（MOQ/MPQ）及交期以当日正式报价单为准；企业资质证明与批次出厂合格证（CoC）支持应采购方审厂流程点对点提供。
```

#### （2）`/llms-full.txt` 结构规范（深度工程参数与全量料号表）
包含：
1. 企业完整中英文工程档案；
2. 四大业务场景的输入输出交付物定义（如正逆向开发所需 3D 数模/对插公母端实物/USCAR-2 或 QC/T 1067 测试要求）；
3. 8 大高频采购与研发技术问答全文；
4. **全量清洗后的在库连接器原厂料号 Markdown 表格**（字段：`MPN 原厂料号 | 识别品牌/系列 | 品类说明 | 参考库存 (PCS) | 参考单价 (CNY)`），让任何 AI 搜索代理在回答具体料号查询时都能精准命中欧连电子！

### 3.4 JSON-LD Schema.org 结构化知识图谱规范

由 `src/seo/schemaBuilder.js` 根据当前路由与语言动态生成并内联注入每个预渲染 HTML 的 `<head>`（严格转义 `<` 为 `\u003c` 防 XSS）：

1. **全站基础图谱节点（`Organization` + `WebSite`）**：
   ```json
   {
     "@context": "https://schema.org",
     "@graph": [
       {
         "@type": "Organization",
         "@id": "https://www.ou-link.com/#organization",
         "name": "上海欧连电子科技有限公司",
         "alternateName": [
           "欧连电子",
           "Ou-Link Electronics",
           "Shanghai Ou-Link Electronic Technology Co., Ltd."
         ],
         "foundingDate": "2012",
         "description": "专注于汽车连接器与线束供应链配套超过14年，整合进口与自主品牌连接器资源，提供现货供应、BOM配单、国产化替代及正逆向工程开发支持。",
         "telephone": "+86-21-64778688",
         "email": "service@ou-link.com",
         "address": {
           "@type": "PostalAddress",
           "streetAddress": "春申路2525弄欧银集心大楼312室",
           "addressLocality": "闵行区",
           "addressRegion": "上海市",
           "addressCountry": "CN"
         },
         "contactPoint": [
           {
             "@type": "ContactPoint",
             "telephone": "+86-21-64778688",
             "email": "service@ou-link.com",
             "contactType": "sales and technical support",
             "availableLanguage": ["zh-CN", "en"],
             "hoursAvailable": {
               "@type": "OpeningHoursSpecification",
               "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
               "opens": "09:00",
               "closes": "18:00"
             }
           }
         ],
         "knowsAbout": [
           "Automotive Connectors",
           "Wire Harness Supply Chain",
           "Connector Cross-Reference and Localization",
           "Forward and Reverse Connector Engineering",
           "High-Speed FAKRA and HSD Automotive Interconnects",
           "Heavy Duty Sealed Connectors"
         ]
       },
       {
         "@type": "WebSite",
         "@id": "https://www.ou-link.com/#website",
         "name": "上海欧连电子科技有限公司 — 汽车连接器与线束工程供应链伙伴",
         "inLanguage": "zh-CN",
         "publisher": { "@id": "https://www.ou-link.com/#organization" },
         "potentialAction": {
           "@type": "SearchAction",
           "target": "https://www.ou-link.com/zh/products?q={search_term_string}",
           "query-input": "required name=search_term_string"
         }
       }
     ]
   }
   ```
   *(注：当构建处于未配置正式 HTTPS 域名的 Preview 模式时，参考 `aifde-site` 规则自动省略域名绝对前缀或使用无虚构域名的纯事实属性，绝不输出错误的相对路径 URL 到 Schema `url` 字段中。)*

2. **产品目录页专属图谱节点（`ItemList` + `Product` + `Offer`）**：
   - 在 `/zh/products` 与 `/en/products` 中，为预渲染直出的核心连接器型号生成标准 `ItemList`，每个条目包含 `Product`（`name`、`mpn`、`sku`、`brand: { "@type": "Brand", "name": "..." }`、`image`、`offers: { "@type": "Offer", "priceCurrency": "CNY", "price": "...", "availability": "https://schema.org/InStock" }`）。
3. **工程方案页、品质页与首页问答节点（`FAQPage`）**：
   - 将页面可见的 Crawlable Factual Answers 同步输出为标准 `FAQPage`（保证 JSON-LD 中的问答与页面 HTML 可见文本 100% 一致，符合 Google 与主流 AI 搜索引擎结构化数据诚信准则）。
4. **子页面层级导航节点（`BreadcrumbList`）**：
   - 为 `/products`、`/solutions`、`/quality`、`/about`、`/contact` 自动生成二级标准面包屑 Schema。

### 3.5 Crawlable Factual Answers（可抓取事实问答与工程选型规格表）

为使官网成为工程师与 AI 检索的高信息增益信源，必须在 HTML 正文中内置以下两大结构化知识模块（禁止做成纯图片，必须使用原生语义化 `<table>`, `<thead>`, `<tbody>`, `<dl>`, `<details open>`）：

#### 模块 A：《汽车连接器核心应用场景与供应系列技术对照表》（置于 `/solutions`）

| 汽车电子子系统 | 典型工况与防护要求 | 重点涉及品牌与代表系列 | 欧连电子工程配套能力 |
| :--- | :--- | :--- | :--- |
| **动力总成与传感器系统 (Powertrain & ECU)** | 高温（-40°C ~ +150°C）、强振动、IP67/IP6K9K 燃油与水汽密封 | **Bosch**（192840xxxx 喷油嘴/传感器系列）、**TE**（HDSCS / AMP MCP）、**Molex**（CMC 高密度发动机舱系列）、**Hirschmann**（805/872 密封系列） | 原厂正品现货调配、急件安全库存锁货、密封塞/盲堵/端子全套齐套配单 |
| **智能座舱与智驾高速互连 (ADAS & Infotainment)** | 高频信号完整性（DC–6GHz / 20GHz）、低回波损耗、防呆机械编码（Code A–Z） | **Rosenberger**（FAKRA / HFM / HSD / 车载以太网）、**Amphenol**（精密射频与高速连接）、**TE**（MATE-AX / NanoMQS） | 射频连接器选型导入（Design-in）、线束端接工艺指导、小批量研发试制（DV/PV）快速供样 |
| **车身控制、门窗与照明线束 (Body & Comfort BCM)** | 多极数紧凑空间、TPA/CPA 双重锁止防退针、高性价比规模化交付 | **LEAR**（26xxx / 14xxx 车身端子护套系列）、**Yazaki**（7123/7283 系列）、**Aptiv**、**Sumitomo** 及优质国产自主品牌 | 跨品牌 Pin-to-Pin 国产化降本替代评估、正向/逆向模具开发、线束厂压接刀片与拉力标准协同 |
| **商用车、工程机械与新能源汽车高压辅助 (Heavy-Duty & xEV)** | 抗盐雾腐蚀、高插拔寿命、金属/增强尼龙圆形与重载矩形锁紧 | **Souriau / Eaton**（RT0W / UTOW 圆形防水系列）、**Amphenol Sine**（AT04/AT06 系列）、**MTA**（大电流配电与保险丝盒连接） | 工业与商用车重载连接器选型替换、定制分支线束配套与多品种小批量柔性供应 |

#### 模块 B：8 大高频工程与采购事实问答（置于首页、`/solutions` 与 `/quality`）
1. **Q1：上海欧连电子主营哪些品牌的汽车连接器？是纯贸易商还是具备工程开发配套能力？**（明确回答：始于 2012 年，兼具进口原厂连接器现货整合与整车/线束工程技术支持双重能力，覆盖李尔、赫斯曼、安费诺、罗森伯格、博世、泰科、莫仕、MTA 等进口品牌及国产自主品牌战略合作，支持产品导入、国产替代与正逆向开发。）
2. **Q2：如何快速查询某个原厂料号（如 `1928404745` 或 `3-1418390-1`）是否有现货及获取 BOM 整单报价？**（说明站内毫秒级 MPN 搜索用法、在线 BOM 批量粘贴询价及工作时间快速报价流程。）
3. **Q3：进口汽车连接器交期过长或停产（EOL）时，欧连如何协助整车厂或线束厂完成国产化 Pin-to-Pin 替代？**（详述五维技术对标流程：对插接口几何公差核对 -> 端子载流与温升曲线匹配 -> 防水密封等级 [IP67/IP6K9K] 与耐温材料 [PA66/PBT+GF] 核验 -> TPA/CPA 锁止机构兼容 -> 免费样品试装与小批路试验证。）
4. **Q4：正向开发与逆向连接器开发需要客户提供哪些输入资料？**（说明支持从对插端实物样件、2D 图纸/3D STEP 数模或整车电器原理定义出发，协同合作工厂完成结构设计、开模、T1 送样与检验报告输出。）
5. **Q5：针对汽车线束厂大批量生产，欧连能提供哪些加工应用支持？**（说明护套+端子+防水栓齐套供应避免缺料停线、端子压接高度/截面金相参数参考建议、呆滞料调剂与安全库存备货。）
6. **Q6：欧连电子如何保障所供进口连接器为原厂正品并实现批次溯源？**（详述原厂正规渠道采购、保留原厂最小包装盘标 [Reel/Box Label: Lot No. / Date Code / 产地]、IQC 外观与关键尺寸抽检、恒温防潮防静电存储。）
7. **Q7：是否支持研发阶段（Proto / DV / PV）小批量样品采购？最小起订量（MOQ）如何规定？**（诚实回答：在库常备型号支持研发打样拆零或小批量供货；期货订购按原厂标准包装量 MPQ 执行，具体以报价单确认为准。）
8. **Q8：官网展示的单价与库存数量是实时结算价吗？支持开具增值税专用发票吗？**（明确合规边界：网站公示价格与库存为目录常态参考值，因铜材/塑胶汇率及采购阶梯量不同，最终含 13% 增值税专用发票价格与实时锁库数量以欧连商务出具的正式报价单为准。）

### 3.6 `robots.txt`（显式开放主流 AI 搜索爬虫）与双语 `sitemap.xml`

#### 生产态 `robots.txt` 规范（当 `OULINK_INDEXABLE=true` 时输出）
显式向全球及中国主流生成式 AI 检索引擎开放抓取权限（预览态未开启 `OULINK_INDEXABLE` 时自动输出 `User-agent: *\nDisallow: /` 保护测试域名不串权）：

```text
User-agent: *
Allow: /
Disallow: /api/

# Explicitly welcome AI Search & Answer Engine crawlers (GEO)
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Bytespider
Allow: /

User-agent: Baiduspider
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: https://www.ou-link.com/sitemap.xml
```

#### 双语互链 `sitemap.xml` 规范
包含 `xmlns:xhtml="http://www.w3.org/1999/xhtml"` 命名空间，每个 `<url>` 节点附带中英 `xhtml:link rel="alternate" hreflang="zh-CN|en|x-default"`，同时将 `/llms.txt` 与 `/llms-full.txt` 作为公开可发现静态资源部署在根路径。

---

## 4. Claim Ledger（事实与诚信边界台账：零容忍清除原站假证书）

继承 `WEBSITE_ACCEPTANCE.md` 与 `aifde-site/CONTENT_DECISIONS.md` 的严谨台账精神，建立欧连电子官网事实治理红线：

| 台账分类 | 具体涉及内容 | 原始证据来源 | 新官网处置规则与呈现边界 |
| :--- | :--- | :--- | :--- |
| **A. 已核实核心事实<br>(Verified Core Facts)** | - 公司全称：`上海欧连电子科技有限公司`<br>- 行业积淀：2012 年起专注汽车连接器行业（>14 年）<br>- 办公地址：`上海市闵行区春申路2525弄欧银集心大楼312室`<br>- 联系电话：`021-64778688`<br>- 官方邮箱：`service@ou-link.com`<br>- 工作时间：`周一至周六 09:00 - 18:00`<br>- 四大业务方向：整车厂导入/替换/正逆向开发、线束厂供应链与加工支持、连接器厂全球拓展、经销伙伴商务技术支持<br>- 300+ 个真实汽车连接器原厂料号（MPN）与实物图 | 原站首页、`tid=8` 公司简介、`tid=3` 产品库、`tid=30` 联系我们 | **全量保留并结构化强化**：写入集中配置文件、预渲染页面、JSON-LD 与 `/llms.txt` |
| **B. 需严谨限定的商业表述<br>(Qualified Business Claims)** | 1. 原站简介提及“李尔T&C、赫尔斯曼、安费诺(精密连接)、罗森博格、博世等授权经销，MTA、MOLEX 原厂合作伙伴”<br>2. 原站产品库标示的各型号价格（`￥0.0550`–`￥46.0000`）与库存数（`31`–`225000`） | 原站 `tid=8`、`tid=3` 历史静态文本（无原厂授权书扫描件佐证） | 1. 品牌板块统一诚实定性为**“核心供应渠道覆盖、正品溯源调配与工程选型支持品牌生态”**；未上传正式授权函扫描件前，不伪造任何授权编号或印章图片。<br>2. 价格与库存明确标注**“参考单价 / 常态参考备库（实时批次与阶梯含税价以正式 BOM 报价单为准）”** |
| **C. 强制彻底清除的虚假/脏数据<br>(Purged Fabrications — 绝对黑名单)** | 1. **原站 `tid=9` 公司荣誉页全部假证书**：含“孙悟空经理 最佳xxxxxx荣誉证书”、“北京市自主创新产品证书-移动式同步架车机”、“武汉安全生产许可证”、“诚信守约施工企业”等 EyouCMS 模板盗链假图与倒序标题<br>2. **原站 `tid=23` 模板残留错位招聘**：“2022-10-10 网络运营专员 工作地点：广州市 5000-8000元”<br>3. **原站隐藏栏目 `tid=4/64/66` 模板演示垃圾**：“鼠标封面设计”、“蓝牙耳机渲染”、“VIVO手机摄影”及手机端外链演示图<br>4. **原站无效入口与破损占位**：社交账号登录/注册死入口、`javascript:;` 空链接、`noimg.png` 空图、`0000-00-00` 交期、`http://127.0.0.1:8899/` 错误站点地图<br>5. **未经核实的 ICP 备案号**：原站页脚未公示有效沪 ICP 备案号 | `site-auditor` 审计报告（#10）与原站页面实测 | **100% 物理清零与专业重构**：<br>- 严禁将任何假证书、3C 消费电子模板图或 `noimg.png` 拷入 `public/assets/`；<br>- **关键 UI 决策**：因原站 383 款 SKU 均无单品实拍图（全为 `noimg.png`），新站产品中心禁止使用空图片相框卡片，统一采用 **“高密度工业规格参数表（Engineering Spec-Sheet Table）+ 对应品牌高清 SVG 徽标（`/assets/brands/*.svg`）与品类精密线框标签”** 呈现，支持后续在配置中按单品平滑挂载真实产品图；<br>- 将“公司荣誉”彻底重构为“品质管控与正品溯源（`/quality`）”，直接集成 `/assets/quality/` 下 `quality-pipeline-diagram.svg`、`channel-admission.svg`、`iqc-inspection.svg`、`batch-traceability.svg`、`esd-storage-compliance.svg`、`automotive-harness-standard.svg`、`rohs-environmental.svg`、`verified-credential-slot.svg` 共 8 枚矢量图解；<br>- 页脚预留可配置 `icpRecord` 字段（默认为空时不渲染，绝不编造假备案号） |
| **D. 配置化真实资质插槽<br>(Configurable Verification Slots)** | 企业营业执照、一般纳税人资质、ISO 9001 / IATF 16949 合作制造体系证明、原厂代理授权书 | 待企业管理员后续归档上传真实扫描件 | 在 `src/content/siteContent.js` 设立 `quality.certificateSlots` 数组，默认 `verified: false`，前端优雅渲染为**“资质文件按审厂流程点对点提供（支持随货附原厂批次标签与出厂检验记录）”**及规范待归档占位说明；客户未来只需放入扫描图并改 `verified: true` 即可自动上线 |

---

## 5. 工程目录结构、数据契约与静态预渲染流水线

### 5.1 `e:\官网\oulink-site\` 标准工程目录规划

```text
e:\官网\oulink-site\
├── api/
│   ├── inquiry.js                 # BOM 配单与选型询价 Serverless 接口（同源校验、防刷、诚实 503 降级）
│   └── not-found.js               # 双语零 JS 依赖真实 HTTP 404 响应器（采用官方浅灰蓝+深海军蓝 VI）
├── docs/
│   ├── audit-report.md            # [site-auditor 产出] 原站全面问题与假证书审计报告
│   ├── raw-oulink-data.json       # [site-auditor 产出] 原站全量抓取原始结构化数据
│   ├── assets-manifest.json       # [asset-curator 产出] 官方 VI 色板、Logo 与全套品牌/品控高清 SVG 清单
│   ├── geo-architecture.md        # [本文档] GEO 架构与精密汽车工业 UI 设计总蓝图
│   └── deploy-readiness.md        # [本文档配套] GitHub 与 Vercel 部署就绪评估及执行手册
├── public/
│   ├── favicon.svg                # 同步自 /assets/brand/favicon.svg
│   ├── llms.txt                   # 构建脚本自动生成的精要 AI 导航与事实清单
│   ├── llms-full.txt              # 构建脚本自动生成的全量工程问答 + 300+ 料号索引表
│   ├── robots.txt                 # 构建期按索引门禁生成的爬虫策略（生产态含 AI 爬虫白名单）
│   ├── sitemap.xml                # 构建期生成的双语 hreflang 站点地图
│   └── assets/
│       ├── brand/                 # [asset-curator 产出] oulink-logo.svg, oulink-logo-dark.svg, oulink-logo-mono.svg, oulink-mark.svg, favicon.svg
│       ├── brands/                # [asset-curator 产出] Rosenberger, Amphenol, LEAR, HIRSCHMANN, Bosch, TE, Molex 等统一等比 SVG
│       ├── quality/               # [asset-curator 产出] IQC 来料检验、批次溯源、线束工艺、合规仓储、真实资质插槽 SVG
│       └── products/              # 经清洗校验的原站真实汽车连接器产品实拍图（绝不含任何假荣誉图）
├── scripts/
│   ├── sync-catalog.mjs           # 从 docs/raw-oulink-data.json 与 assets-manifest.json 清洗生成标准化产品目录数据
│   ├── generate-geo-files.mjs     # 从集中内容层同源生成 llms.txt 与 llms-full.txt
│   ├── prerender.mjs              # Vite SSR 加载 App.jsx，预渲染全部 /zh/* 与 /en/* 静态 HTML、Meta、hreflang 与 JSON-LD
│   └── verify-browser.mjs         # Playwright 多视口（1440/768/390/320）+ 无 JS + 搜索与 BOM 交互全自动验收脚本
├── src/
│   ├── main.jsx                   # 同构客户端入口（预渲染路径 hydrateRoot，动态参数兼容）
│   ├── App.jsx                    # 顶层路由分发、全局 BOM 询价车状态管理、无障碍 Skip-link 与统一工业页眉页脚
│   ├── routing.js                 # locales=["zh","en"], routeKeys=["products","solutions","quality","about","contact"]
│   ├── seo/
│   │   └── schemaBuilder.js       # 路由感知的 Organization, WebSite, BreadcrumbList, ItemList/Product, FAQPage 生成器
│   ├── content/
│   │   ├── siteContent.js         # 集中式双语文案、官方品牌配置、四大工程方案、五步品控流程、资质插槽、8 大 FAQ
│   │   ├── productsCatalog.js     # 标准化连接器料号库（mpn, brandId, series, category, stockRef, priceRef, image）
│   │   └── claimLedger.js         # 事实边界声明与禁用词黑名单常量（供前端展示免责说明与测试断言共用）
│   ├── components/
│   │   ├── Header.jsx             # 72px 精密工业顶栏（官方 SVG Logo、导航、快捷型号搜索触发器、BOM 计数、中英切换）
│   │   ├── Footer.jsx             # 深海军蓝（#092143）工业铭牌页脚（反白 Logo、快速路由、真实地址电话、事实声明）
│   │   ├── MpnSearchEngine.jsx    # 毫秒级原厂料号/品牌检索引擎（含高亮匹配、一键加 BOM、未命中转工程询价闭环）
│   │   ├── BrandMatrix.jsx        # 严格等比（240x80 安全视窗）供应商/合作品牌矢量网格，支持点击按品牌过滤产品
│   │   ├── ProductSpecTable.jsx   # 桌面高密度等宽参数表 + 移动端自适应工程铭牌卡片（含分页/分类筛选）
│   │   ├── BomDrawer.jsx          # 悬浮/侧滑 BOM 配单询价车（增删料号、修改数量、一键带入联系页或导出邮件）
│   │   ├── QualityPipeline.jsx    # 五步原厂正品溯源与品控流程图解 + 配置化真实资质归档插槽组件
│   │   └── FaqAccordion.jsx       # 默认对爬虫可读的语义化技术问答组件（Crawlable Factual Answers）
│   └── styles/
│       ├── tokens.css             # 官方 VI 像素级色彩、字体栈、圆角、阴影变量
│       └── main.css               # CAD 公差微网格、响应式布局、打印与无障碍焦点样式（:focus-visible 电光橙描边）
├── tests/
│   ├── routes-and-geo.test.mjs    # 验证双语路由静态直出、唯一 h1、hreflang、JSON-LD 合法性、llms.txt/llms-full.txt 一致性
│   ├── claim-ledger.test.mjs      # 诚信红线自动化守卫：扫描全站源码与 dist 产物，断言零“孙悟空/自主创新假证书/广州错位招聘/javascript:;”
│   ├── content-editing.test.mjs   # 验证仅替换 siteContent/productsCatalog 配置即可无代码更新双语页面与品牌图
│   ├── inquiry-api.test.mjs       # 验证 /api/inquiry 参数校验、防跨域、蜜罐、未配密钥时诚实返回 503
│   └── not-found.test.mjs         # 验证 /api/not-found 双语真实 404 状态码与 HEAD 请求处理
├── CONTENT_EDITING.md             # 面向非开发维护人员的集中配置修改指南（文案、料号库、品牌 SVG、真实证书上线步骤）
├── index.html                     # Vite 基础 HTML 模板
├── package.json                   # 依赖精简克制（react, react-dom, lucide-react, vite, @vitejs/plugin-react, playwright）
├── vercel.json                    # cleanUrls、双语 404 rewrites、llms*.txt UTF-8 响应头配置
└── vite.config.mjs                # Vite 构建配置（输出至 dist/client）
```

### 5.2 料号自动品牌识别与分类清洗规则（`sync-catalog.mjs` 指南）

原站 `raw-oulink-data.json` 中的产品往往只有料号（如 `1928404745`、`3-1418390-1`、`805-120-521`）而缺少显式品牌标签。构建数据同步层应结合行业标准料号前缀规则进行准确归类（无法 100% 确定具体品牌的通用型号诚实归入 `Automotive Standard / Multi-Brand` 类，**绝不胡乱张冠李戴**）：

- `19284xxxxx` / `19283xxxxx` -> **BOSCH（博世）** 汽车连接器系列
- `x-xxxxxxx-x`（如 `3-1418390-1`, `1-1355132-2`, `1-1564528-1`, `1-967640-1`）及典型 AMP 6~7 位连字符号（如 `368500-1`, `776492-2`, `282080-1`, `174047-2`） -> **TE Connectivity（泰科）** 汽车连接器系列
- `805-xxx-xxx` / `806-xxx-xxx` / `872-xxx-xxx` / `709-xxx-xxx` / `706-xxx-xxx` -> **HIRSCHMANN（赫斯曼）** 精密密封汽车连接器系列
- `26xxxxxxxxx` / `28xxxxxxxxx` / `14xxxxxxxxx`（11 位数字编码，如 `26806201184`, `14481562647`） -> **LEAR（李尔）** 端子与护套连接系统
- `AT04-xx` / `AT06-xx` / `RT0Wxxxxxx` -> **Amphenol / Souriau** 工业与重载圆形/矩形密封连接器
- `34083-xxxx` / `64320-xxxx` / `43025-xxxx` -> **MOLEX（莫仕）** 汽车与精密互连系列
- `7123-xxxx` / `7283-xxxx` -> **Yazaki（矢崎）** 汽车连接器系列
- `120xxxxx` / `153xxxxx` -> **Aptiv / Delphi（安波福）** 汽车连接系统
- `MG6xxxxx` / `ST7xxxxx` -> **KET（韩国端子工业）** 系列

---

## 6. 自动化质量门禁（QA Gates）与验收标准

借鉴 `WEBSITE_ACCEPTANCE.md` 的闭环验收准则，`oulink-site` 必须通过以下全部自动化检查才算本地达标：

1. **静态预渲染与 GEO 完备性测试（`tests/routes-and-geo.test.mjs`）**：
   - `/zh` 与 `/en` 下全部 6 个正式路由（共 12 个内容页 + 2 个本地化 404 页 + 根 `index.html`）均存在对应静态 HTML；
   - 每个正式页面在**不运行任何 JS** 的前提下，均包含唯一 `<h1>`、准确的 `lang` 属性（`zh-CN` / `en`）、非空 `<meta name="description">`、合法可 `JSON.parse` 的 `<script type="application/ld+json">`；
   - `dist/client/llms.txt` 与 `dist/client/llms-full.txt` 均存在、UTF-8 可读、包含真实电话 `021-64778688`、地址 `春申路2525弄` 及全量清洗后的料号记录。
2. **Claim Ledger 诚信红线测试（`tests/claim-ledger.test.mjs`）**：
   - 遍历 `dist/client/` 全部 HTML、JS、TXT、JSON、SVG 产物，断言**绝对不包含**：`孙悟空`、`北京市自主创新`、`安全生产许可证`、`广州市`（错位模板招聘）、`社交账号登录`、`javascript:;` 等原站污染词与死链！
3. **无代码配置可编辑性测试（`tests/content-editing.test.mjs`）**：
   - 在隔离模块缓存中替换品牌名、Logo 路径、首屏标题及测试料号，验证中英双语 SSR 输出立即同步更新，无需改动任何 JSX/CSS 组件文件。
4. **Playwright 真实浏览器多视口与交互验收（`scripts/verify-browser.mjs`）**：
   - 在 `1440px`、`768px`、`390px`、`320px` 四个视口宽度下遍历全部双语路由：
     - HTTP `200`、零 `console.error`、零 `pageerror`；
     - `document.documentElement.scrollWidth <= window.innerWidth`（**零横向滚动条溢出**）；
     - 全部 `<img>` 加载完成且 `naturalWidth > 0`，合作品牌 SVG 容器宽高比正常无挤压截断；
     - 背景色严格匹配全新官方 VI 浅灰蓝画布 `rgb(239, 243, 247)`（`#EFF3F7`）；
   - **核心工业交互实测**：
     - 在首屏搜索框输入 `1928404745`，验证实时筛出对应连接器型号；点击 `+ BOM` 加入配单车，跳转至 `/zh/contact` 验证料号已自动填入询价表单；
     - 在 `390px` 手机视口测试汉堡菜单展开、导航跳转与 `Escape` 关闭；
     - 在 `javaScriptEnabled: false` 无 JS 上下文中遍历全部双语页面，验证标题、导航、品牌墙、代表料号表与联系信息 100% 正常可见。
