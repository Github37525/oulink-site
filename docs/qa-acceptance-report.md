# 上海欧连电子官网（`oulink-site`）全量自动化质量门禁与真实浏览器/GEO 独立验收报告

> **验收角色**：`qa-verifier`（独立质量门禁与真实浏览器 / GEO 验收官）  
> **验收时间**：2026-11-21  
> **被测工程路径**：`e:\官网\oulink-site`  
> **验收结论**：**PASS（全部 17 项 Node 自动化单测 + 48 组多视口真实浏览器巡检 + 12 组无 JS 爬虫直出测试 + 核心工业交互闭环 100% 零失败通过）**

---

## 一、执行摘要与门禁总览

本次独立验收严格遵循**读写职责隔离原则**（未修改任何业务源码与资产，仅编写自动化测试门禁、真实浏览器巡检脚本并挑刺督促修复），完成了从静态预渲染产物、GEO 大模型喂养协议、Claim Ledger 诚信红线、Serverless 接口安全，到真实 Chromium 四视口 UI 与交互的全链路核验。

| 质量门禁模块 | 对应脚本 / 产物 | 用例 / 检查点规模 | 最终状态 | 关键指标结果 |
| :--- | :--- | :--- | :--- | :--- |
| **1. 双语预渲染路由与 GEO 元数据** | `tests/routes-and-geo.test.mjs` | 12 正式页 + 3 错误页 + 根入口 + 全站 SVG XML 校验 | **PASS** | 唯一 `<h1>`、准确 `lang`、非空 `description`、绝对 `canonical`、双向 `hreflang`（`zh-CN`/`en`/`x-default`）、JSON-LD 全量合法解析 |
| **2. AI 检索协议与 383 款料号覆盖** | `dist/client/llms.txt` & `llms-full.txt` | 383 款真实 MPN + 17 家品牌 + 8 大工程问答 | **PASS** | `llms.txt`（4.17 KB）与 `llms-full.txt`（69.41 KB）均含真实总机 `021-64778688`、闵行春申路地址，383 款 MPN 100% 零遗漏收录 |
| **3. Claim Ledger 诚信红线扫描** | `tests/claim-ledger.test.mjs` | 全量扫描 `src/`、`api/`、`public/`、`dist/` 全部文本与文件名 | **PASS** | 18 项原站假荣誉证书（孙悟空等）、广州假招聘、3C 模板垃圾、死链与品牌错别字 **0 处出现** |
| **4. 无代码集中配置可编辑性** | `tests/content-editing.test.mjs` | 隔离 SSR 缓存热替换文案、Logo 与连接器 SKU | **PASS** | 仅改 `siteContent.js` / `productsCatalog.js` 数据即同步更新双语 SSR 输出，无需修改任何 JSX/CSS 布局 |
| **5. Serverless 询价与真实 404 接口** | `tests/inquiry-api.test.mjs` & `tests/not-found.test.mjs` | 跨域拦截、参数校验、蜜罐、诚实 503、双语 404/HEAD | **PASS** | 非同源 `403`、蜜罐静默拦截、无密钥诚实返回 `503`、未知路由真实 HTTP `404`（含 `HEAD` 空体响应） |
| **6. 四视口真实浏览器视觉与布局** | `scripts/verify-browser.mjs` | `1440px` / `768px` / `390px` / `320px` × 12 页 = **48 组** | **PASS (48/48)** | 0 `console.error`、0 `pageerror`、0 横向溢出（`scrollWidth <= innerWidth`）、画布底色严格匹配 `#EFF3F7` (`rgb(239, 243, 247)`) |
| **7. 核心工业搜索与 BOM 配单闭环** | `scripts/verify-browser.mjs` | 模糊搜索、跨页 BOM 注入、移动端菜单、503 降级 UI | **PASS** | 搜 `368500` 毫秒级命中 `368500-1`；`1928404745` 点 `+ BOM` 自动填入 `/zh/contact` 表单；390px 汉堡菜单开合正常 |
| **8. 无 JS 爬虫模式直出可见性** | `scripts/verify-browser.mjs` | `javaScriptEnabled: false` × 12 双语正式页 = **12 组** | **PASS (12/12)** | 标题、17 家品牌墙、产品规格表（24 行）、子系统选型表（6 行）、8 大 FAQ（0 折叠隐藏）与联系方式 100% 可见 |

---

## 二、验收期间拦截并闭环修复的真实缺陷记录

在首轮真实 Chromium 浏览器验收（看板 `#18`）中，独立门禁精准捕获并推动上游彻底修复了 1 项隐蔽但致命的渲染缺陷：

- **缺陷现象**：首轮运行 `node scripts/verify-browser.mjs` 时，`/zh/quality` 与 `/en/quality` 在全部 4 个视口下均检出 3 枚品控矢量图标加载失败（`complete === true` 但 `naturalWidth === 0`）：
  1. `/assets/quality/batch-traceability.svg`
  2. `/assets/quality/esd-storage-compliance.svg`
  3. `/assets/quality/automotive-harness-standard.svg`
- **根因定位**：通过 Chromium `DOMParser("image/svg+xml")` 严格 XML 解析复现，上述 3 个 SVG 文件第 1 行 `aria-label` 与第 2 行 `<title>` 中包含未转义的裸 `&`（如 `Lot & Date Code`、`ESD & Moisture`、`Crimp & Connector`）。虽然在内联 HTML5 模式下浏览器宽容解析，但在作为 `<img src="*.svg">`（`Content-Type: image/svg+xml`）独立加载时触发 `XML Parsing Error: Unexpected token inside entity`，导致图标破损裂开。
- **闭环修复与回归加固**：
  1. 指派 `@asset-curator`（`#19`）将裸 `&` 严格转义为 `&amp;`（并同步清理 `verified-credential-slot.svg` 注释），由 `@web-builder`（`#20`）重跑 `npm run build` 更新 `dist/client/assets/quality/`；
  2. 在 `tests/routes-and-geo.test.mjs` 新增全库 66 处（`public/` + `dist/client/`）SVG 严格 XML 实体合规单测，永久防止回归；
  3. 二次复测 `npm test`（**17/17 全绿**）与 `node scripts/verify-browser.mjs`（**48 视口检查 + 12 无 JS 检查 = 0 失败**），`/zh/quality` 与 `/en/quality` 全部 13 张图像 `naturalWidth > 0` 清晰呈现。

---

## 三、分项验收详细实测数据

### 3.1 静态预渲染路由、双语对称与 GEO Schema 核验

全部 12 个双语正式页面 + 根入口 + 本地化 404 静态产物均已在 `dist/client/` 生成并通过校验：

| 路由模块 | 中文静态产物 (`lang="zh-CN"`) | 英文静态产物 (`lang="en"`) | `<h1>` 数量 | `canonical` & 双向 `hreflang` | 内联 JSON-LD `@type` 覆盖 |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **首页 (`home`)** | `zh.html` (72.6 KB) / `index.html` | `en.html` (69.2 KB) | 1 | `zh-CN` / `en` / `x-default` 闭环 | `Organization`, `WebSite` (`SearchAction`), `FAQPage` |
| **产品与料号中心 (`products`)** | `zh/products.html` (66.2 KB) | `en/products.html` (65.4 KB) | 1 | `zh-CN` / `en` / `x-default` 闭环 | `Organization`, `WebSite`, `BreadcrumbList`, `ItemList`, `Product`, `Offer` |
| **工程与制造方案 (`solutions`)** | `zh/solutions.html` (31.9 KB) | `en/solutions.html` (29.4 KB) | 1 | `zh-CN` / `en` / `x-default` 闭环 | `Organization`, `WebSite`, `BreadcrumbList`, `FAQPage` |
| **品控与正品溯源 (`quality`)** | `zh/quality.html` (31.4 KB) | `en/quality.html` (29.4 KB) | 1 | `zh-CN` / `en` / `x-default` 闭环 | `Organization`, `WebSite`, `BreadcrumbList`, `FAQPage` |
| **关于欧连 (`about`)** | `zh/about.html` (23.8 KB) | `en/about.html` (23.1 KB) | 1 | `zh-CN` / `en` / `x-default` 闭环 | `Organization`, `WebSite`, `BreadcrumbList` |
| **BOM 询价与联系 (`contact`)** | `zh/contact.html` (18.9 KB) | `en/contact.html` (18.6 KB) | 1 | `zh-CN` / `en` / `x-default` 闭环 | `Organization`, `WebSite`, `BreadcrumbList` |
| **本地化 404 (`notFound`)** | `zh/404.html` (9.0 KB) / `404.html` | `en/404.html` (9.0 KB) | 1 | 严格 `noindex, nofollow`、**无 `canonical`** | 零外部脚本纯净内联 VI 错误页 |

- **`/llms.txt`（4,167 Bytes）与 `/llms-full.txt`（69,407 Bytes）**：双层协议完整包含上海欧连电子真实企业定位（始于 2012 年）、闵行区春申路 2525 弄欧银集心大楼 312 室总部地址、双电话（`021-64778688` / `021-64809788`）、邮箱 `service@ou-link.com`、17 家合作品牌分级（5 家授权经销 + 12 家原厂合作配套）、8 大工程问答全文及**全部 383 款在库连接器 MPN 规格表（100% 逐条比对零缺失）**。
- **`/robots.txt` 与 `/sitemap.xml`**：生产态显式向 `GPTBot`、`OAI-SearchBot`、`ChatGPT-User`、`ClaudeBot`、`PerplexityBot`、`Google-Extended`、`Applebot-Extended`、`Bytespider`、`Baiduspider`、`Bingbot` 开放抓取，彻底清除原站 `http://127.0.0.1:8899/` 错误回环地址。

### 3.2 Claim Ledger 诚信红线终审

自动化扫描器遍历 `src/`、`api/`、`public/`、`dist/` 下全部源码、静态 HTML、JS Bundle、SVG 与数据文件（排除 `src/content/claimLedger.js` 黑名单定义本身）：

- **假证书与错位模板彻底清零**：`孙悟空`、`北京市自主创新`、`移动式同步架车机`、`安全生产许可证`、`诚信守约施工企业`、`工作地点：广州市`、`蓝牙耳机`、`鼠标封面`、`VIVO手机`、`社交账号登录` 命中数均为 **0**。
- **原站技术坏味道与译名错别字彻底清零**：`javascript:;`、`127.0.0.1:8899`、`noimg.png`、`0000-00-00`、`罗森博格`（已正名为**罗森伯格**）、`赫尔斯曼`/`赫尔思曼`（已正名为**赫斯曼**）命中数均为 **0**。
- **诚实边界披露就位**：价格与库存明确标注为常态备库参考值，企业营业执照/原厂授权书/批次合格证（CoC）采用诚实审厂点对点提供机制与无代码可配置资质归档插槽（`certificateSlots`），ICP 备案号预留可配置 `icpRecord` 字段（未核实前不编造假号）。

### 3.3 全新官方 VI 视觉与四视口真实浏览器验收

使用本机真实 Chromium（`chrome-win64/chrome.exe`）在 **`1440×900`、`768×1024`、`390×844`、`320×740`** 四种视口下逐页实测：

1. **全新官方 VI 色板精准落地**：页面主画布计算背景色严格为 `rgb(239, 243, 247)`（`#EFF3F7` 浅灰蓝制图画布），搭配纯白规格卡 `#FFFFFF`、深海军蓝 `#092143` 顶标与页脚、赛博青蓝 `#02B0EE` 与电光橙 `#FE6A08` 强调色，彻底淘汰旧站低清绿橙色系。
2. **零横向溢出与零文字截断**：48 组视口页面检查中（含严苛的 `320px` 小屏），`document.documentElement.scrollWidth <= window.innerWidth` 100% 成立；卡片容器零 `overflow: hidden` 截字。
3. **矢量标识与 17 家品牌矩阵零变形**：顶栏 `oulink-logo.svg`、深色页脚 `oulink-logo-dark.svg` 及全部 17 家汽车连接器品牌（LEAR、HIRSCHMANN、Amphenol、Rosenberger、BOSCH、TE Connectivity、Molex、MTA、Aptiv/Delphi、Yazaki、Sumitomo、JST、KET、KOSTAL、FCI、DEUTSCH、ITT）SVG 统一 `240×80`（`3:1`）光学安全框，在全视口下等比清晰渲染，零拉伸压扁。

### 3.4 工业检索、BOM 配单车与 Serverless 接口实测

- **毫秒级容错检索**：在 `/zh` 首屏与 `/zh/products` 目录页搜索框输入 `368500`（省略连字符后缀），均实时模糊匹配展示泰科 `368500-1`。
- **跨页 BOM 配单询价闭环**：搜索博世料号 `1928404745` 并点击 `+ BOM` 加入配单车后跳转至 `/zh/contact`，实测询价表单 BOM 多行输入框已自动填入 `1928404745	100 PCS	(博世)`。
- **诚实 503 降级闭环**：在未配置第三方邮件/Webhook 密钥的环境下提交表单，`/api/inquiry` 诚实返回 `HTTP 503 { ok: false, code: "receiver_unavailable" }`，前端不伪造“发送成功”，而是清晰引导一键复制已填 BOM 清单并直连 `service@ou-link.com` 或拨打 `021-64778688` / `021-64809788`。
- **移动端菜单与真实 404**：`390px` 视口下顶栏汉堡菜单展开（`aria-expanded="true"`）、点击跳转 `/zh/products` 及 `Escape` 键收起（`aria-expanded="false"`）流畅无阻；请求未知路径 `/zh/non-existent-connector-route` 与 `/en/non-existent-connector-route` 均真实返回 HTTP `404`。

---

## 四、验收留档截图与数据清单（`e:\官网\oulink-site\qa\`）

| 归档文件名 | 视口 / 类型 | 覆盖验收场景说明 |
| :--- | :--- | :--- |
| `qa/verification-results.json` | JSON 矩阵 (39.0 KB) | 48 组四视口检查 + 12 组无 JS 爬虫检查 + 核心交互实测原始指标 |
| `qa/zh-home-1440.png` | `1440px` 桌面全页 | 中文首页：全新官方 VI 链环 Logo、首屏 MPN 检索引擎、17 家等比品牌墙、精选现货表与 FAQ |
| `qa/en-home-1440.png` | `1440px` 桌面全页 | 英文首页：面向海外主机厂/Tier-1 线束采购的专业互连工程术语排版 |
| `qa/zh-products-1440.png` | `1440px` 桌面全页 | 中文产品中心：按品牌/6 大技术分类筛选与斜杠零等宽字体高密度规格表 |
| `qa/en-products-1440.png` | `1440px` 桌面全页 | 英文产品中心：383 款在库连接器 MPN 规格参数与实时过滤 |
| `qa/zh-solutions-1440.png` | `1440px` 桌面全页 | 工程方案页：四大客群制造能力 + 原生语义化《汽车子系统连接器选型对照表》 |
| `qa/zh-quality-1440.png` | `1440px` 桌面全页 | 品质管控页：五步原厂正品溯源全景图解 + 修复后 100% 完好的品控矢量图标 + 真实资质插槽 |
| `qa/zh-about-1440.png` | `1440px` 桌面全页 | 关于我们页：2012 创立历程、上海闵行总部实景信息与真实销售/FAE 岗位 |
| `qa/zh-contact-bom-1440.png` | `1440px` 桌面全页 | 联系与询价页：实测 `1928404745` 从产品库一键自动带入 BOM 询价表单留证 |
| `qa/zh-home-390.png` | `390px` 移动全页 | 中文移动端首页：零横向溢出自适应卡片与品牌网格 |
| `qa/en-home-390.png` | `390px` 移动全页 | 英文移动端首页：英文长词折行规范、零溢出 |
| `qa/zh-products-390.png` | `390px` 移动全页 | 中文移动端产品中心：窄屏工程铭牌自适应排布 |
| `qa/zh-mobile-menu-390.png` | `390px` 移动视口 | 移动端顶栏汉堡菜单展开态与语言切换/BOM 入口留证 |

---

## 五、一键复现验收命令

后续任何时间修改配置或部署前，均可在 `e:\官网\oulink-site` 目录下执行以下两条标准命令复现全量门禁检查：

```powershell
Set-Location -LiteralPath "e:\官网\oulink-site"
npm test
npm run verify:browser
```
