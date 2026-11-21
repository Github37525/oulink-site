/**
 * 上海欧连电子科技有限公司官网（oulink-site）事实与诚信边界台账（Claim Ledger）
 *
 * 用途：
 * 1. 定义原站 EyouCMS 模板污染词、假荣誉证书与错别字绝对黑名单（供 QA 门禁测试扫描拦截）；
 * 2. 集中维护经交叉取证核实的企业真实工商联络事实（供页眉页脚、联系页、JSON-LD 与 llms.txt 同源引用）；
 * 3. 诚实披露库存单价参考边界、批次 CoC 点对点审厂核验机制、原厂商标归属声明与 ICP 备案配置插槽。
 */

export const FORBIDDEN_LEGACY_TERMS = [
  '孙悟空',
  '北京市自主创新',
  '移动式同步架车机',
  '安全生产许可证',
  '诚信守约施工企业',
  '工作地点：广州市',
  '蓝牙耳机',
  '鼠标封面',
  'VIVO手机',
  '社交账号登录',
  'javascript:;',
  '127.0.0.1:8899',
  'noimg.png',
  '0000-00-00',
  '罗森博格',
  '赫尔斯曼',
  '赫尔思曼',
  'update.eyoucms.com'
];

export const VERIFIED_COMPANY_FACTS = {
  companyNameZh: '上海欧连电子科技有限公司',
  shortNameZh: '欧连电子',
  companyNameEn: 'Shanghai Ou-Link Electronics Technology Co., Ltd.',
  shortNameEn: 'Ou-Link Electronics',
  foundedYear: 2012,
  industryYears: 14,
  experienceSummaryZh: '始于2012年，逾14年专注汽车连接器供应链整合与工程技术支持',
  experienceSummaryEn: 'Founded in 2012, over 14 years focused on automotive connector supply chain and engineering support',
  addressZh: '上海市闵行区春申路2525弄欧银集心大楼312室',
  addressEn: 'Room 312, Ouyin Jixin Building, Lane 2525, Chunshen Road, Minhang District, Shanghai, China',
  postalAddress: {
    streetAddressZh: '春申路2525弄欧银集心大楼312室',
    streetAddressEn: 'Room 312, Ouyin Jixin Building, Lane 2525, Chunshen Road',
    addressLocalityZh: '闵行区',
    addressLocalityEn: 'Minhang District',
    addressRegionZh: '上海市',
    addressRegionEn: 'Shanghai',
    addressCountry: 'CN'
  },
  hqPhone: '021-64778688',
  hqPhoneIntl: '+86-21-64778688',
  salesPhone: '021-64809788',
  salesPhoneIntl: '+86-21-64809788',
  phones: {
    hq: '021-64778688',
    sales: '021-64809788',
    hqIntl: '+86-21-64778688',
    salesIntl: '+86-21-64809788'
  },
  email: 'service@ou-link.com',
  qq: '2690539981',
  businessHoursZh: '周一至周六 09:00 - 18:00',
  businessHoursEn: 'Monday - Saturday, 09:00 - 18:00 (GMT+8)',
  wechatQrPath: '/assets/contact/wechat-qr.jpg',
  canonicalOrigin: 'https://www.ou-link.com',
  icpRecord: '',
  icpFilingUrl: 'https://beian.miit.gov.cn/'
};

export const CLAIM_BOUNDARIES = {
  zh: [
    '库存与单价边界：公开目录所示现货数量（累计 1,286 万+ 件）与未税参考单价（￥0.0520 - ￥89.0000）基于企业常态备库台账；实时可用库存、具体生产批次（Lot / Date Code）、最小起订/包装量（MOQ / SPQ）及含税阶梯价以当日正式 BOM 报价单为准。',
    '正品溯源与审厂资质核验：所有出库连接器与端子均保留原厂最小包装标签及批次追溯码；企业营业执照、一般纳税人资质、原厂代理授权文件及批次出厂合格证（CoC / 出库检验记录）支持按客户供应商准入（审厂）流程点对点提供核验，绝不悬挂任何未经核实的模板证书。',
    '原厂商标与知识产权声明：页面展示的 LEAR、HIRSCHMANN、Amphenol、Rosenberger、BOSCH、TE Connectivity、Molex 等品牌名称与徽标均归各原厂权利人所有，仅用于客观说明汽车连接器经销渠道覆盖、正品现货调配及 Pin-to-Pin 工程选型配套范围。',
    'ICP 备案合规插槽：站点页脚已预留工信部 ICP 备案号可配置字段（icpRecord），待企业确认正式沪 ICP 备案编号后填入即自动展示并链接至工信部政务平台，未配置前保持留空，严禁虚构备案编号。'
  ],
  en: [
    'Stock & Pricing Boundary: Listed stock quantities (12.86M+ units total) and unit prices (CNY 0.0520 - 89.0000 excl. VAT) reflect baseline warehouse inventory records; real-time availability, exact Lot/Date Codes, MOQ/SPQ packaging, and volume tiered pricing are subject to official daily BOM quotations.',
    'Traceability & Supplier Audit Verification: All shipped housings, terminals, and seals retain original factory SPQ labels and lot traceability codes; business licenses, distributor authorization letters, and batch Certificates of Conformance (CoC / IQC reports) are provided point-to-point during formal customer supplier qualification audits.',
    'Trademarks & Brand Attribution: Brand names and logos including LEAR, HIRSCHMANN, Amphenol, Rosenberger, BOSCH, TE Connectivity, and Molex remain the property of their respective trademark holders and are displayed strictly to indicate genuine supply coverage, BOM kitting, and cross-reference engineering support.',
    'Regulatory Filing Slot: A configurable MIIT ICP filing slot (icpRecord) is reserved in the site configuration and remains unrendered until the verified Shanghai ICP registration number is entered, ensuring zero fabricated regulatory numbers.'
  ]
};
