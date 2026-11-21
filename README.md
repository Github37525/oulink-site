# 上海欧连电子科技有限公司官网（oulink-site）

**Shanghai Ou-Link Electronic Technology Co., Ltd. — Precision Automotive Connector Supply Chain & GEO-Optimized Bilingual Website**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGithub37525%2Foulink-site)

本项目为**上海欧连电子科技有限公司**（创立于 2012 年，深耕汽车连接器与线束供应链超 14 年）全新重构的**精密汽车工业美学双语官网与生成式引擎优化（GEO）工程仓库**。

---

## 一、核心升级与工程亮点

1. **全新官方 VI 精密汽车工业美学（Precision CAD Blueprint × Spec-Sheet）**
   - 像素级还原最新官方品牌视觉规范：浅灰蓝工程制图画布（`#EFF3F7`）、纯白规格卡片（`#FFFFFF`）、深海军蓝主色（`#092143`）、赛博青蓝高频数据色（`#02B0EE`）、电光橙高压电力强调色（`#FE6A08`）与工程制图浅蓝（`#A8CFEE`）。
   - 全站采用 100% 纯矢量高清工业 SVG 标识套件（`/assets/brand/*`、17 家合作品牌 `3:1` 零失真矢量矩阵 `/assets/brands/*`、8 枚五步品控溯源图解 `/assets/quality/*`），连接器料号全局启用斜杠零等宽排版（`tabular-nums slashed-zero`）。
   - 通过 `1440px / 768px / 390px / 320px` 全视口零横向溢出与零截字浏览器实测。

2. **383 款真实车规料号（MPN）毫秒级检索引擎与多料号 BOM 配单闭环**
   - 全量清洗并结构化收录 **383 款真实在库汽车连接器、精密压接端子与防水栓**（累计常态现货备库 **12,864,330 PCS**），涵盖 **5 家核心授权经销**（LEAR、HIRSCHMANN、Amphenol、Rosenberger、BOSCH）与 **12 家原厂合作与经销配套品牌**（TE Connectivity、Molex、MTA、Aptiv/Delphi、Yazaki、Sumitomo、JST、KET、KOSTAL、FCI、DEUTSCH、ITT）。
   - 支持忽略连字符、斜杠、空格与大小写的毫秒级模糊/前缀检索（如输入 `368500` 即刻命中 `368500-1`），支持跨品牌 `+ BOM` 配单车累加并自动带入 `/zh/contact` 结构化询价单；未命中料号一键转入全球寻源与国产化 Pin-to-Pin 替代评估。

3. **制造业硬核 GEO（Generative Engine Optimization）与同构静态预渲染**
   - **零 JS 完整直出**：构建期通过 Vite + React 19 SSR 预渲染全部 12 个对称双语正式路由（`/zh/*` 与 `/en/*`）、根入口及本地化 `404` 页面；禁用 JavaScript 的搜索引擎与大模型爬虫可直接读取唯一 `<h1>`、品牌墙、代表料号规格表、《汽车各大电子子系统连接器选型对照表》及 8 大工程采购 FAQ。
   - **双层 AI 喂养协议**：同源自动编译生成 `/llms.txt`（精要索引）与 `/llms-full.txt`（含完整企业工程档案、四大客群交付物、8 大问答及全部 383 款在库连接器 MPN Markdown 规格表）。
   - **知识图谱与爬虫准入**：全站注入合法的 `Organization`、`WebSite`（含 `SearchAction`）、`BreadcrumbList`、`ItemList/Product/Offer`、`FAQPage` JSON-LD，提供开放主流 AI 搜索爬虫（`GPTBot`、`OAI-SearchBot`、`ClaudeBot`、`PerplexityBot`、`Google-Extended`、`Bytespider` 等）的 `/robots.txt` 与双向 `hreflang` `/sitemap.xml`。

4. **事实治理红线（Claim Ledger）与 Serverless 安全降级**
   - 建立集中式 `src/content/claimLedger.js` 台账，100% 清除历史模板脏数据，透明披露库存单价参考边界与审厂点对点 CoC 资质核验流程。
   - 配套 Vercel Serverless 接口 `api/inquiry.js`（同源校验、32KB 限流、蜜罐拦截；未配置第三方邮件/Webhook 密钥时诚实返回 `503` 并引导一键复制 BOM 摘要 + 拉起 `mailto:service@ou-link.com` 或直拨 `021-64809788` / `021-64778688`）与 `api/not-found.js`（双语真实 HTTP `404` 响应）。

---

## 二、目录结构概览

```text
oulink-site/
├── api/                         # Vercel Serverless 接口 (inquiry.js, not-found.js)
├── docs/                        # GEO 架构蓝图、审计台账、资产清单、部署手册与 QA 验收报告
├── public/                      # 静态根资产 (favicon.svg, llms.txt, llms-full.txt, robots.txt, sitemap.xml, assets/)
├── qa/                          # Playwright 四视口全量验收矩阵 JSON 与关键页全尺寸截图
├── scripts/                     # 目录清洗、GEO 生成、同构预渲染与真实浏览器自动化验收脚本
├── src/
│   ├── components/              # 工业顶栏、页脚、MPN 检索引擎、17 品牌矩阵、规格表、BOM 抽屉、品控流水线、FAQ
│   ├── content/                 # 集中式无代码配置 (siteContent.js, productsCatalog.js, claimLedger.js)
│   ├── seo/                     # 路由感知的 Schema.org JSON-LD 构建器
│   └── styles/                  # 官方 VI 色彩/字体 Token 与响应式 CAD 微网格样式
├── tests/                       # Node 原生测试套件 (GEO/路由、诚信台账、无代码配置、API 与 404 测试)
├── CONTENT_EDITING.md           # 非开发人员无代码修改文案、料号与上线真实资质指南
└── vercel.json                  # Clean URLs、双语 404 Rewrites 与 UTF-8 响应头配置
```

---

## 三、本地开发、构建与自动化质量门禁

环境要求：**Node.js >= 20**

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发热更新服务器
npm run dev

# 3. 执行完整生产构建（同源生成 GEO 协议文件 -> Vite 分包构建 -> 12 页双语 SSR 静态预渲染）
npm run build

# 4. 运行全部 17 项 Node 自动化单元测试（路由/GEO、Claim Ledger、无代码编辑、Serverless API）
npm test

# 5. 运行真实 Chromium 四视口 (1440/768/390/320) + 无 JS 爬虫 + 模糊搜索与 BOM 交互验收
npm run verify:browser
```

---

## 四、一键部署至 Vercel 与环境变量说明

1. 在 [Vercel New Project](https://vercel.com/new) 导入本仓库 `Github37525/oulink-site`，Vercel 将自动读取根目录 `vercel.json`（`Build Command: npm run build`，`Output Directory: dist/client`），直接点击 **Deploy** 即可上线。
2. **可选环境变量（Project Settings -> Environment Variables）**：
   - `VITE_PUBLIC_ORIGIN`：正式生产 HTTPS 根域名（默认 `https://www.ou-link.com`）
   - `OULINK_INDEXABLE`：设为 `"true"` 开启生产爬虫索引；临时预览环境设为 `"false"` 自动切换 `noindex` 与 `Disallow: /`
   - `CONTACT_WEBHOOK_URL`（及可选 `CONTACT_WEBHOOK_TOKEN`）：接收在线 BOM 询价推送的 HTTPS Webhook
   - 或配置 Resend 邮件通道：`RESEND_API_KEY`、`CONTACT_TO_EMAIL`（`service@ou-link.com`）、`CONTACT_FROM_EMAIL`
