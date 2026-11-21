# 上海欧连电子官网（oulink-site）无代码内容与目录维护指南

本工程采用**集中式结构化配置驱动架构**。日常更新中英文页面文案、联络信息、合作品牌、连接器在库料号（MPN）或上线真实资质证书，均**无需修改任何 React 组件（`src/components/*`）或样式文件（`src/styles/*`）**。

---

## 1. 修改公司联络方式、Logo 与全局品牌参数

编辑文件：`src/content/siteContent.js`（同步核对 `src/content/claimLedger.js`）

- **`siteContent.brand`**：
  - `logoPrimary`：浅色顶栏主标识路径（默认 `/assets/brand/oulink-logo.svg`）
  - `logoDark`：深海军蓝页脚反白标识路径（默认 `/assets/brand/oulink-logo-dark.svg`）
  - `wechatQr`：微信公众号二维码路径（默认 `/assets/contact/wechat-qr.jpg`）
  - `icpRecord`：工信部 ICP 备案号插槽（默认留空 `""` 不展示；确认正式沪 ICP 备案号后直接填入如 `"沪ICP备XXXXXXXX号-1"`，页脚即自动渲染并链接至工信部网站）
- **`siteContent.contact`**：
  - `phone`（总部总机）、`salesPhone`（销售直线）、`email`（官方询价邮箱）、`qq`、`addressZh` / `addressEn`、`hoursZh` / `hoursEn`。修改后全站页眉、页脚、联系页、404 页及 JSON-LD 结构化数据自动同步生效。

---

## 2. 修改中英双语页面标题、四大工程方案、FAQ 与招聘岗位

编辑文件：`src/content/siteContent.js`

- 中文内容位于 `siteContent.zh`，英文对称内容位于 `siteContent.en`：
  - `routes.<routeKey>.title` / `description`：各页面 SEO `<title>`、Meta Description 与 OpenGraph 摘要
  - `hero`：首屏眉标、唯一 `<h1>` 主标题、副标题、4 项核心实力指标与 4 大能力模块
  - `solutions.pillars` & `solutions.subsystemMatrix`：四大客群制造方案及《汽车各大电子子系统连接器选型对照表》
  - `faqs`：8 大高频工程采购问答（修改后页面可见问答区、`FAQPage` JSON-LD 与 `/llms-full.txt` 自动同源更新）
  - `about.careers`：上海闵行总部真实招聘职位列表

---

## 3. 上线真实企业资质或原厂代理授权书扫描件

编辑文件：`src/content/siteContent.js` 中的 `zh.quality.certificateSlots` 与 `en.quality.certificateSlots`

1. 将真实合规的证书扫描图（WebP / PNG / SVG）放入 `public/assets/quality/` 目录；
2. 将对应槽位的 `verified` 由 `false` 改为 `true`，并填入 `imagePath: "/assets/quality/your-certificate.webp"`；
3. 运行 `npm run build`，品质页即自动从“审厂点对点提供核验占位框”切换为真实证书展示卡。

---

## 4. 更新连接器在库料号库（MPN Catalog）与合作品牌

- 若从原始数据重新同步清洗：运行 `node scripts/sync-catalog.mjs` 自动更新 `src/content/productsCatalog.js`。
- 若手工新增或调整单品库存/单价：直接编辑 `src/content/productsCatalog.js` 中的 `PRODUCTS_CATALOG` 或 `BRANDS` 数组，然后执行：
  ```powershell
  npm run build
  ```
  构建脚本会自动重新生成 `/llms.txt`、`/llms-full.txt`（含全量料号 Markdown 表）及全部预渲染静态 HTML。
