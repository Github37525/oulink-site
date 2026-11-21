# 上海欧连电子官网（oulink-site）GitHub 与 Vercel 部署就绪评估及执行手册

> **文档归属**：`geo-architect`（GEO 架构与工业 UI 设计总师）  
> **检查时间**：2026-11-21  
> **目标目录**：`e:\官网\oulink-site`  
> **参考基线**：`e:\官网\aifde-site\vercel.json`、`e:\官网\WEBSITE_ACCEPTANCE.md`（严守只读安全边界，未读取任何私密凭证文件）

---

## 1. 本机环境与 CLI 工具链就绪盘点（Read-Only Audit）

经本机只读命令实测，当前构建、测试、代码托管与云端部署工具链状态如下：

| 工具 / 组件 | 实测版本 / 状态 | 认证与账号信息（脱敏） | 部署就绪判定 | 备注与影响 |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | `v24.12.0` | 本地运行时 | **READY（就绪）** | 原生支持 ESM、`node:test`、`fetch`、React 19 SSR 预渲染脚本 |
| **npm** | `11.11.0` | 本地包管理器 | **READY（就绪）** | 支持锁定版本快速安装 Vite 6、React 19、Playwright、Sharp 等 |
| **Git** | `2.47.1.windows.2` | `user.name`: `Github37525`<br>`user.email`: `176756972@qq.com` | **READY（就绪）** | 与参考项目 `aifde-site` 远端仓库归属同一开发者身份 |
| **GitHub CLI (`gh`)** | `2.96.0` | 已登录 `github.com` 账号 `Github37525`（keyring，HTTPS 协议）<br>Scopes: `gist`, `read:org`, `repo`, `workflow` | **READY（零阻塞）** | **具备完整 `repo` 权限**，可直接通过命令行创建新仓库 `Github37525/oulink-site` 并推送分支 |
| **Vercel CLI (`vercel`)** | `59.11.7` | `vercel whoami` 返回：`> Logged out.`<br>IDE 插件连接器：未挂载 Vercel 账号 | **BLOCKED ON AUTH（需登录或走 Git 联动）** | CLI 本身已全局安装，但未处于登录态；严禁跨目录读取任何历史私密状态，需按第 5 节合规路径解阻 |

---

## 2. 核心潜在阻塞点识别与应对策略

### 阻塞点 A：Vercel CLI 当前处于未登录状态（`Logged out`）
- **现象**：运行 `vercel whoami` 提示未登录，无法在无人值守命令行下直接将项目绑定至用户的正式 Vercel Hobby 团队并执行 `vercel --prod`。
- **合规边界**：严格遵守安全规范，**绝不读取、复制或探测 `aifde-site/.vercel`、`.env.local` 或系统隐藏目录中的任何历史 Token**。
- **解阻路径（三选一，详见第 5 节）**：
  1. **路径 1（首选，GitHub 仓库自动联动）**：当前 `gh` CLI 已认证 `Github37525`，可由工程代理全自动完成本地验收 + GitHub 远端建仓与 `main` 分支推送；若用户的 Vercel 团队（`WEBSITE_ACCEPTANCE.md` 记录已开通 Vercel Hobby 团队）已关联 GitHub 账号，在 Vercel 网页端一键 `Import Git Repository -> Github37525/oulink-site` 即可零配置上线。
  2. **路径 2（标准 CLI 授权）**：由用户在终端执行一次 `vercel login` 完成浏览器交互授权后，即可运行 `vercel link --yes && vercel --prod` 一键发布。
  3. **路径 3（临时免登录预览说明）**：Vercel CLI `59.11.7` 原生支持 `vercel deploy --temporary` 生成待认领（Claimable）临时部署链接，可用于快速外部预览，但不作为正式生产域名归属方案（存在临时有效期及认领前权限限制）。

### 阻塞点 B：Vercel Deployment Protection（部署访问保护墙）对验收与 AI 爬虫的阻断风险
- **现象**：Vercel 默认可能对 `*.vercel.app` Preview URL 开启 `Vercel Authentication` 登录保护，导致外部匿名访客、Lighthouse、Playwright 线上巡检及 AI 搜索爬虫（GPTBot、PerplexityBot 等）收到 `401/403` 登录拦截页。
- **应对策略**：部署完成后，若用于公开演示或线上 GEO 爬虫可达性实测，需在 Vercel Project Settings -> `Deployment Protection` 中将 `Vercel Authentication` 设为 **Disabled（或仅保护非生产分支而开放 Production 域名）**，并用无痕请求核验返回真实 `200 OK` 预渲染 HTML。

### 阻塞点 C：原始抓取备份资产（`raw-assets/`）与内部文档体积/合规隔离
- **现象**：`e:\官网\oulink-site\raw-assets\` 存放原站抓取备份图（且原站荣誉页含假证书图，严禁流入生产静态目录），`docs/` 存放审计台账。
- **应对策略**：
  - 生产静态资源统一只从 `public/assets/`（经 `asset-curator` 与前端工程清洗核验后的高清 SVG 与真实产品图）构建进入 `dist/client/assets/`。
  - 通过 `.gitignore` 与 `.vercelignore` 严格隔离构建产物、临时测试缓存与 `raw-assets/`。

### 阻塞点 D：正式生产域名（`www.ou-link.com`）HTTPS 与索引门禁切换
- **现象**：原站 `http://www.ou-link.com/` 当前仍运行在旧 PHP/CMS（EyOuCMS/ThinkPHP 类 `?m=home&c=Lists` 动态路由）且未启用强制 HTTPS；在新站未完成 DNS CNAME 切换前，Vercel 默认分配 `https://oulink-site-*.vercel.app` 域名。
- **应对策略**：继承 `aifde-site` 的 **构建期索引门禁（Build-time Indexability Gate）**：
  - 当未配置正式 HTTPS 生产域名（或处于 Preview 阶段）时，不输出指向临时域名的污染性正式索引，或通过环境变量显式控制 `VITE_PUBLIC_ORIGIN` 与 `OULINK_INDEXABLE`；
  - 一旦客户确认切换 DNS 至 Vercel 并自动签发 Let's Encrypt SSL 证书，仅需在 Vercel Production 环境变量填入 `VITE_PUBLIC_ORIGIN=https://www.ou-link.com` 与 `OULINK_INDEXABLE=true` 重新触发构建，全站 `canonical`、`hreflang`、`sitemap.xml` 与 `robots.txt` 即自动切换为生产索引态。

---

## 3. `oulink-site` 生产级配置文件规范（升级自 `aifde-site`）

### 3.1 `e:\官网\oulink-site\vercel.json` 推荐配置

在继承 `aifde-site/vercel.json` 干净 URL（`cleanUrls: true`）与双语 Serverless 404 路由的基础上，针对制造企业 GEO 新增 **`/llms.txt` 与 `/llms-full.txt` 的 UTF-8 字符集声明**（防止中文技术参数与料号表在浏览器或爬虫读取时出现编码乱码）及静态矢量资产长效缓存策略：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/client",
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" },
    { "source": "/en/:path*", "destination": "/api/not-found?locale=en" },
    { "source": "/:path*", "destination": "/api/not-found?locale=zh" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" }
      ]
    },
    {
      "source": "/(llms|llms-full|robots)\\.txt",
      "headers": [
        { "key": "Content-Type", "value": "text/plain; charset=utf-8" },
        { "key": "Cache-Control", "value": "public, max-age=3600, must-revalidate" }
      ]
    },
    {
      "source": "/sitemap\\.xml",
      "headers": [
        { "key": "Content-Type", "value": "application/xml; charset=utf-8" },
        { "key": "Cache-Control", "value": "public, max-age=3600, must-revalidate" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

> **路由解析机制说明**：Vercel 的 `rewrites` 在文件系统静态查找（Filesystem Lookup）**之后**才触发。因此：
> - 访问 `/zh`、`/zh/products`、`/en/quality` 等已预渲染页面时，Vercel 直接命中 `dist/client/zh.html`、`dist/client/zh/products.html`、`dist/client/en/quality.html` 并以 `200 OK` 极速直出 CDN 静态 HTML（TTFB < 50ms）；
> - 仅当访问不存在的未知路径（如 `/en/unknown-part` 或 `/zh/legacy-dead-link`）时，才会落入 `/api/not-found`，返回**真实 HTTP `404` 状态码**、对应语言导航与 `noindex, nofollow` 响应，彻底杜绝 SPA 把未知 URL 当作 `200 OK` 首页渲染的软 404（Soft-404）SEO 事故。

### 3.2 Serverless 接口规范（`api/` 目录）

1. **`api/not-found.js`（双语零 JS 依赖 404 响应器）**：
   - 继承 `aifde-site/api/not-found.js` 架构，支持 `GET` 与 `HEAD` 方法，返回 `statusCode = 404`；
   - 样式采用欧连电子全新官方 VI 的浅灰蓝工业底色（`#EFF3F7`）与深海军蓝（`#092143`）内联 CSS，附带快速返回产品目录与型号检索入口，完全不依赖外部客户端 JS 包。
2. **`api/inquiry.js`（BOM 配单与样品/替代选型询价接口，升级自 `api/contact.js`）**：
   - 支持结构化提交：联系人姓名、公司/工厂名称（整车厂/线束厂/贸易商等）、联系方式（手机/邮箱/微信）、询价类型（现货采购 / BOM 整单配单 / 国产替代与逆向开发 / 技术规格书索取）、**连接器料号清单（Part Numbers & Quantities）**、备注及隐私授权勾选（`consent`）。
   - 安全防护：同源校验（`sameOrigin`）、请求体大小限制（`<= 32KB` 支持多行 BOM 粘贴）、蜜罐字段防刷（`website` honeypot）、HTML 实体转义、禁止将客户私人联系方式写入控制台日志。
   - **诚实降级原则**：当 Vercel 环境变量尚未配置 `CONTACT_WEBHOOK_URL` 或 `RESEND_API_KEY` 时，接口诚实返回 `HTTP 503 { ok: false, code: "receiver_unavailable" }`，前端展示真实可点击的官方电话 `021-64778688` 与官方邮箱 `mailto:service@ou-link.com`（支持一键带入已填 BOM 料号生成邮件正文！），绝不伪装“提交成功”。

### 3.3 `.gitignore` 与 `.vercelignore` 推荐配置

**`e:\官网\oulink-site\.gitignore`**：
```gitignore
node_modules/
dist/
raw-assets/
qa/*-tmp*/
qa/*/node-compile-cache/
.vercel/
.env
.env.*
!.env.example
*.log
```

**`e:\官网\oulink-site\.vercelignore`**：
```gitignore
node_modules
dist
raw-assets/
qa/
tests/
docs/
*.log
```

---

## 4. 环境变量清单（Vercel Project Settings -> Environment Variables）

| 变量名 | 适用环境 | 示例值 / 说明 | 必填性 |
| :--- | :--- | :--- | :--- |
| `VITE_PUBLIC_ORIGIN` | Production | `https://www.ou-link.com`（正式域名切换后启用；Vercel Preview 阶段可设对应正式预览根域名或留空以防相对路径污染） | 生产索引开启时必填 |
| `OULINK_INDEXABLE` | Production / Preview | Production 正式域名上线设 `"true"`；临时 Preview 设 `"false"` | 生产索引开启时必填 |
| `CONTACT_WEBHOOK_URL` | Production / Preview | 企业微信 / 飞书机器人或 CRM HTTPS Webhook 地址（接收 `oulink.inquiry` BOM 询价事件） | 与邮件通道二选一 |
| `CONTACT_WEBHOOK_TOKEN` | Production / Preview | Webhook 可选 Bearer 鉴权密钥 | 可选 |
| `RESEND_API_KEY` | Production | Resend 邮件发送 API Key（未配 Webhook 时使用） | 与 Webhook 二选一 |
| `CONTACT_TO_EMAIL` | Production | `service@ou-link.com`（欧连电子官方业务邮箱） | 邮件通道必填 |
| `CONTACT_FROM_EMAIL` | Production | 已在 Resend 验证发信域名的发件地址（如 `inquiry@ou-link.com`） | 邮件通道必填 |

> **安全铁律**：严禁将任何真实 API Key 或 Webhook URL 写入仓库代码、`.env` 提交记录或前端 `VITE_*` 公开变量中。仅提供无敏感信息的 `.env.example` 字段说明模板。

---

## 5. 标准推送与部署操作规程（Step-by-Step Playbook）

> **注意**：所有终端操作必须指定 `e:\官网\oulink-site` 工作目录，严禁在 `e:\官网` 根目录直接 `git init` 或触碰 `aifde-site`。

### 步骤 1：本地构建与自动化验收门禁
在推送前必须确保静态预渲染、路由测试、配置替换测试、Claim Ledger 合规测试（零假证书断言）及 Playwright 浏览器多视口测试全部通过：
```powershell
Set-Location -LiteralPath "e:\官网\oulink-site"
npm run build
npm test
```

### 步骤 2：初始化独立 Git 仓库并提交代码
```powershell
Set-Location -LiteralPath "e:\官网\oulink-site"
git init -b main
git status
git add .
git commit -m "feat: precision automotive GEO website & official VI redesign for Ou-Link Electronics"
```
*(提交前通过 `git status` 二次核验：`raw-assets/`、`node_modules/`、`dist/`、`.env*` 均未被追踪)*

### 步骤 3：使用已认证的 `gh` CLI 创建 GitHub 远程仓库并推送
本机 `gh` 已认证 `Github37525` 账号，直接执行以下命令即可完成远端建仓与首次推送（默认建议 `--public` 以便 Vercel Hobby 免费导入及公开预览，如客户需私有库可改为 `--private`）：
```powershell
Set-Location -LiteralPath "e:\官网\oulink-site"
gh repo create Github37525/oulink-site --public --source="." --remote=origin --description "Precision Automotive Connector & Harness Supply Chain Website (GEO-Optimized) for Shanghai Ou-Link Electronics" --push
```

### 步骤 4：部署至 Vercel（按认证条件选择路径）

#### 方案 A：GitHub 集成网页端一键导入（零 CLI 登录依赖，推荐）
1. 打开浏览器访问 `https://vercel.com/new`（使用关联了 `Github37525` 的 Vercel Hobby 账号）。
2. 在 **Import Git Repository** 列表中选择刚刚推送的 `Github37525/oulink-site`，点击 **Import**。
3. Vercel 会自动识别根目录 `vercel.json`（`Build Command: npm run build`、`Output Directory: dist/client`），无需手改框架预设，直接点击 **Deploy**。
4. 约 45~60 秒即可获得永久 HTTPS 访问地址（如 `https://oulink-site.vercel.app`），后续每次向 `main` 分支 `git push` 均自动重部署。

#### 方案 B：终端交互登录 Vercel CLI 后命令行直推
若需在终端直接完成项目绑定与生产发布，请用户在终端完成一次浏览器登录授权后执行：
```powershell
Set-Location -LiteralPath "e:\官网\oulink-site"
vercel login
vercel link --yes --project oulink-site
vercel deploy --prod --yes
```

#### 方案 C：旧站域名 `www.ou-link.com` 平滑割接与历史动态 URL 兼容建议
当客户准备将正式域名 `www.ou-link.com` 切入 Vercel 时：
1. 在 Vercel Project -> `Settings -> Domains` 添加 `www.ou-link.com` 与根域 `ou-link.com`（设置 `ou-link.com` 308 永久重定向至 `https://www.ou-link.com`）。
2. 在域名注册商处按提示修改 DNS 解析（`www` CNAME 指向 `cname.vercel-dns.com`，`@` A 记录指向 `76.76.21.21`）。
3. **旧站历史链接无损承接（可选增强）**：可在中间件或前端入口对旧站历史查询参数（如 `/?m=home&c=Lists&a=index&tid=3` 产品页、`tid=8` 简介页、`tid=30` 联系页）做映射识别或引导跳转至 `/zh/products`、`/zh/about`、`/zh/contact`，避免老客户收藏夹失效。

---

## 6. 线上发布后 10 项核验清单（Post-Deploy Live Checklist）

部署上线后，必须针对真实线上 URL 执行以下端到端验收：

1. [ ] **匿名可达性检查**：无痕模式（无 Cookie）请求首页 `/` 与 `/zh`、`/en`，确认返回 `200 OK` 而非 Vercel 登录保护页。
2. [ ] **零 JS 静态 HTML 直出检查**：使用 `curl -sL <URL>/zh/products` 检查原始响应体，确认无需执行 JS 即可读到唯一 `<h1>`、完整产品分类/代表型号参数表及 `<script type="application/ld+json">` 结构化数据。
3. [ ] **AI 检索清单可读性检查**：访问 `<URL>/llms.txt` 与 `<URL>/llms-full.txt`，确认返回 `Content-Type: text/plain; charset=utf-8`，中文无乱码，包含企业核心能力、品牌矩阵、300+ 料号索引与诚信边界说明。
4. [ ] **爬虫与站点地图检查**：访问 `<URL>/robots.txt` 与 `<URL>/sitemap.xml`，确认 Preview 与 Production 的索引策略符合预期（生产态显式允许 `GPTBot`、`OAI-SearchBot`、`ClaudeBot`、`PerplexityBot`、`Google-Extended`、`Bytespider` 等主流 AI 搜索爬虫）。
5. [ ] **双语 `hreflang` 与 `canonical` 对称性**：抽查 `/zh/products` 与 `/en/products`，核对双向 `hreflang="zh-CN"`、`hreflang="en"`、`hreflang="x-default"` 闭环无死链。
6. [ ] **真实 404 状态码检查**：访问 `<URL>/en/non-existent-connector-999` 与 `<URL>/zh/missing`，确认 HTTP 状态码严格为 `404`、语言匹配、含 `noindex, nofollow` 且不含 `canonical`。
7. [ ] **高清矢量品牌视觉检查**：在桌面端（1440px）与移动端（390px/320px）核验全新官方 VI 链环 Logo 及全部合作品牌 SVG 图标清晰锐利、严格等比无拉伸、零横向滚动溢出。
8. [ ] **连接器型号瞬时检索检查**：在搜索框输入 `1928404745`、`3-1418390-1`、`AT04-3P`、`805-120` 等料号片段，验证毫秒级匹配、规格展示与一键加入 BOM 询价单流畅可用。
9. [ ] **询价接口诚实响应检查**：测试提交 `/api/inquiry`；若未配后台密钥，确认前端明确提示暂未开启在线直投并提供一键拨号 `021-64778688` 与带料号清单的 `mailto:service@ou-link.com` 邮件唤起。
10. [ ] **诚信红线终审**：全站扫描确认原站“孙悟空经理”、“北京市自主创新产品证书”等假证书图文已 100% 清零，质量页展示真实可验证的供应链品控溯源流程。
