import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORBIDDEN_LEGACY_TERMS } from '../src/content/claimLedger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const RAW_DATA_PATH = path.join(PROJECT_ROOT, 'docs', 'raw-oulink-data.json');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'docs', 'assets-manifest.json');
const OUTPUT_CATALOG_PATH = path.join(PROJECT_ROOT, 'src', 'content', 'productsCatalog.js');
const BRANDS_ASSET_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'brands');

const BRAND_DEFINITIONS = [
  // 5 家授权经销 (tier: 'authorized')
  {
    id: 'lear',
    slug: 'lear',
    nameZh: '李尔',
    nameEn: 'LEAR',
    tier: 'authorized',
    tierLabelZh: '授权经销',
    tierLabelEn: 'Authorized Distributor',
    logoPath: '/assets/brands/lear.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: '26xxx/28xxx 车规精密端子、14xxx/18xxx/E26xxx 车身控制护套系统',
    seriesSummaryEn: '26xxx/28xxx Crimp Terminals & 14xxx/18xxx/E26xxx Body Harness Housings',
    featured: true
  },
  {
    id: 'hirschmann',
    slug: 'hirschmann',
    nameZh: '赫斯曼',
    nameEn: 'HIRSCHMANN',
    tier: 'authorized',
    tierLabelZh: '授权经销',
    tierLabelEn: 'Authorized Distributor',
    logoPath: '/assets/brands/hirschmann.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: '805/806/872 SealStar 汽车级防水护套及 709 密封盲堵锁扣附件',
    seriesSummaryEn: '805/806/872 SealStar Sealed Connectors & 709 Sealing Accessories',
    featured: true
  },
  {
    id: 'amphenol',
    slug: 'amphenol',
    nameZh: '安费诺',
    nameEn: 'Amphenol',
    tier: 'authorized',
    tierLabelZh: '授权经销',
    tierLabelEn: 'Authorized Distributor',
    logoPath: '/assets/brands/amphenol.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: 'RT0W 工业与商用车圆形卡口连接器、精密连接与高压互连系统',
    seriesSummaryEn: 'RT0W Heavy-Duty Circular Bayonet & Precision Automotive Interconnects',
    featured: true
  },
  {
    id: 'rosenberger',
    slug: 'rosenberger',
    nameZh: '罗森伯格',
    nameEn: 'Rosenberger',
    tier: 'authorized',
    tierLabelZh: '授权经销',
    tierLabelEn: 'Authorized Distributor',
    logoPath: '/assets/brands/rosenberger.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: 'FAKRA、HFM、HSD 与车载千兆以太网高频射频连接系统（支持选型订货）',
    seriesSummaryEn: 'FAKRA, HFM, HSD & Automotive Ethernet High-Speed RF Interconnects',
    featured: true
  },
  {
    id: 'bosch',
    slug: 'bosch',
    nameZh: '博世',
    nameEn: 'BOSCH',
    tier: 'authorized',
    tierLabelZh: '授权经销',
    tierLabelEn: 'Authorized Distributor',
    logoPath: '/assets/brands/bosch.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: '192840xxxx 发动机舱传感器/喷油嘴护套、192849xxxx 端子与密封组件',
    seriesSummaryEn: '192840xxxx Powertrain Sensor/Injector Housings & 192849xxxx Terminals',
    featured: true
  },

  // 12 家原厂合作与经销 (tier: 'partner')
  {
    id: 'te-connectivity',
    slug: 'te-connectivity',
    nameZh: '泰科电子',
    nameEn: 'TE Connectivity',
    tier: 'partner',
    tierLabelZh: '核心经销配套',
    tierLabelEn: 'Supply & Engineering Partner',
    logoPath: '/assets/brands/te-connectivity.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: 'HDSCS 重载密封、AMPSEAL、Superseal、MCP/MQS/JPT 护套端子全系常备',
    seriesSummaryEn: 'HDSCS, AMPSEAL, Superseal, MCP/MQS/JPT Housings, Terminals & Seals',
    featured: true
  },
  {
    id: 'molex',
    slug: 'molex',
    nameZh: '莫仕',
    nameEn: 'Molex',
    tier: 'partner',
    tierLabelZh: '原厂合作伙伴',
    tierLabelEn: 'OEM Supply Partner',
    logoPath: '/assets/brands/molex.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: 'CMC/MX150 发动机舱密封连接器、Mini-Fit 与 Micro-Fit 线对板/线对线系列',
    seriesSummaryEn: 'CMC/MX150 Sealed Automotive, Mini-Fit & Micro-Fit Interconnects',
    featured: true
  },
  {
    id: 'mta',
    slug: 'mta',
    nameZh: '意大利美达',
    nameEn: 'MTA',
    tier: 'partner',
    tierLabelZh: '原厂合作伙伴',
    tierLabelEn: 'OEM Supply Partner',
    logoPath: '/assets/brands/mta.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: '车载大电流配电盒连接器、F800/PowerVal 大截面功率端子组件',
    seriesSummaryEn: 'Automotive Power Distribution Units & High-Current Crimp Terminals',
    featured: true
  },
  {
    id: 'aptiv-delphi',
    slug: 'aptiv-delphi',
    nameZh: '安波福 / 德尔福',
    nameEn: 'Aptiv / Delphi',
    tier: 'partner',
    tierLabelZh: '经销与供应链配套',
    tierLabelEn: 'Supply Chain Partner',
    logoPath: '/assets/brands/aptiv-delphi.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: 'Metri-Pack 120/150/280、Weather-Pack 与 GT 系列汽车密封连接系统',
    seriesSummaryEn: 'Metri-Pack 120/150/280, Weather-Pack & GT Automotive Connection Systems',
    featured: false
  },
  {
    id: 'yazaki',
    slug: 'yazaki',
    nameZh: '矢崎',
    nameEn: 'Yazaki',
    tier: 'partner',
    tierLabelZh: '经销与供应链配套',
    tierLabelEn: 'Supply Chain Partner',
    logoPath: '/assets/brands/yazaki.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: '7123/7283 YESC 密封与非密封护套、090II/040 日系整车线束连接器',
    seriesSummaryEn: '7123/7283 YESC Series, 090II & 040 OEM Wire Harness Connectors',
    featured: false
  },
  {
    id: 'sumitomo',
    slug: 'sumitomo',
    nameZh: '住友电装',
    nameEn: 'Sumitomo',
    tier: 'partner',
    tierLabelZh: '经销与供应链配套',
    tierLabelEn: 'Supply Chain Partner',
    logoPath: '/assets/brands/sumitomo.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: 'TS/MT/HX 防水系列 6195 护套与 8240 精密压接端子配套',
    seriesSummaryEn: 'TS/MT/HX Sealed 6195 Housings & 8240 Precision Automotive Terminals',
    featured: false
  },
  {
    id: 'jst',
    slug: 'jst',
    nameZh: '日压端子',
    nameEn: 'JST',
    tier: 'partner',
    tierLabelZh: '经销与供应链配套',
    tierLabelEn: 'Supply Chain Partner',
    logoPath: '/assets/brands/jst.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: 'JWPF 防水线对线、汽车座舱微间距线对板连接器与压着端子配套',
    seriesSummaryEn: 'JWPF Waterproof Wire-to-Wire & Cabin PCB Wire-to-Board Connectors',
    featured: false
  },
  {
    id: 'ket',
    slug: 'ket',
    nameZh: '韩国端子',
    nameEn: 'KET',
    tier: 'partner',
    tierLabelZh: '经销与供应链配套',
    tierLabelEn: 'Supply Chain Partner',
    logoPath: '/assets/brands/ket.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: 'MG6xxxxx 多极车规护套与 ST7xxxxx 高可靠端子韩系/自主车型配套',
    seriesSummaryEn: 'MG6xxxxx Multi-Pole Housings & ST7xxxxx Automotive Crimp Terminals',
    featured: false
  },
  {
    id: 'kostal',
    slug: 'kostal',
    nameZh: '科世达',
    nameEn: 'KOSTAL',
    tier: 'partner',
    tierLabelZh: '经销与供应链配套',
    tierLabelEn: 'Supply Chain Partner',
    logoPath: '/assets/brands/kostal.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: 'MLK 1.2 / SLK 欧系车身转向模块与机电控制单元精密连接器',
    seriesSummaryEn: 'MLK 1.2 / SLK Mechatronic & Steering Module Connector Systems',
    featured: false
  },
  {
    id: 'fci',
    slug: 'fci',
    nameZh: '法马通',
    nameEn: 'FCI',
    tier: 'partner',
    tierLabelZh: '经销与供应链配套',
    tierLabelEn: 'Supply Chain Partner',
    logoPath: '/assets/brands/fci.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: 'Apex 2.8 高载流车规连接系统与 Sicma 发动机舱多极连接器',
    seriesSummaryEn: 'Apex 2.8 High-Performance & Sicma Powertrain Automotive Connectors',
    featured: false
  },
  {
    id: 'deutsch',
    slug: 'deutsch',
    nameZh: '德驰',
    nameEn: 'DEUTSCH',
    tier: 'partner',
    tierLabelZh: '经销与供应链配套',
    tierLabelEn: 'Supply Chain Partner',
    logoPath: '/assets/brands/deutsch.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: 'DT/AT/DTM/HD30 商用车、工程机械与特种车辆重载环境密封连接器',
    seriesSummaryEn: 'DT/AT/DTM/HD30 Commercial Vehicle & Off-Highway Sealed Connectors',
    featured: false
  },
  {
    id: 'itt',
    slug: 'itt',
    nameZh: '埃梯梯科能',
    nameEn: 'ITT',
    tier: 'partner',
    tierLabelZh: '经销与供应链配套',
    tierLabelEn: 'Supply Chain Partner',
    logoPath: '/assets/brands/itt.svg',
    aspectRatio: '3:1',
    seriesSummaryZh: 'Trident / APD / Cannon 工业与特种车载圆形抗振多芯连接器',
    seriesSummaryEn: 'Trident, APD & Cannon Ruggedized Circular Multi-Pin Interconnects',
    featured: false
  }
];

const GENERIC_AUTO_BRAND = {
  id: 'automotive-oem',
  nameZh: '通用车规 / OEM配套',
  nameEn: 'Automotive Standard / OEM'
};

const CATEGORY_DEFINITIONS = [
  {
    id: 'connector-housings',
    nameZh: '车规连接器护套',
    nameEn: 'Automotive Connector Housings',
    descriptionZh: '覆盖车身控制、底盘线束与传感器端接的多极塑胶护套及线对板插接件（含 TPA/CPA 二次锁止结构）。',
    descriptionEn: 'Multi-pole unsealed and cabin wire-to-wire / wire-to-board housings with TPA/CPA locking features.'
  },
  {
    id: 'sealed-heavy-duty',
    nameZh: '重载与高等级密封连接器',
    nameEn: 'Heavy-Duty & Sealed Connectors',
    descriptionZh: '面向发动机舱、变速箱、商用车及工程机械的 IP67/IP6K9K 高防护矩形与圆形防水互连系统。',
    descriptionEn: 'IP67/IP6K9K sealed rectangular and circular connectors for powertrain, commercial vehicle, and off-highway harnesses.'
  },
  {
    id: 'terminals-contacts',
    nameZh: '车规精密压接端子',
    nameEn: 'Automotive Crimp Terminals',
    descriptionZh: '适配全自动压接机的镀锡/镀银/镀金冲压公母端子，涵盖 MQS、MCP、JPT、MCON 及李尔精密端子系列。',
    descriptionEn: 'Precision stamped-and-formed male/female crimp terminals across MQS, MCP, JPT, MCON, and LEAR series.'
  },
  {
    id: 'seals-accessories',
    nameZh: '防水栓、盲堵与锁止附件',
    nameEn: 'Wire Seals, Plugs & Locks',
    descriptionZh: '硅橡胶单线防水栓（SWS）、空腔盲堵、出线护套后盖及二次锁片等齐套线束附件。',
    descriptionEn: 'Silicone single-wire seals (SWS), cavity plugs, backshells, and secondary locking retainers for harness kitting.'
  },
  {
    id: 'power-distribution',
    nameZh: '大电流配电连接组件',
    nameEn: 'Power Distribution & High-Current',
    descriptionZh: '用于车载配电盒（PDU）、主保险丝盒及大线径电源线束的高载流端子与配电连接件。',
    descriptionEn: 'High-current power distribution terminals and fuse-box interconnects for automotive primary power harnesses.'
  },
  {
    id: 'oem-cross-reference',
    nameZh: '通用车规与主机厂配套号',
    nameEn: 'OEM & Cross-Reference Parts',
    descriptionZh: '按主机厂工程图号或跨品牌通用标准备库的车规互连件，支持实样测绘与 Pin-to-Pin 替代核验。',
    descriptionEn: 'OEM engineering part numbers and standard cross-reference automotive connectors verified for harness replacement.'
  }
];

const TE_SEAL_LOCK_MPNS = new Set([
  '828904-1',
  '828905-1',
  '828920-1',
  '963530-1',
  '967067-1',
  '968221-1',
  '144969-1',
  '368086-1',
  '368088-1',
  '1674298-1',
  '963904-1'
]);

const TE_HDSCS_PREFIX_RE = /^(?:[1-9]-)?(?:1418\d{3}|1563\d{3}|1564\d{3}|1703(?:639|818|838|841)|1670(?:364|720|866|901)|1718(?:485|643|645|806)|213775\d|2209545|2822344)-\d+$/;
const TE_AMPSEAL_SUPERSEAL_RE = /^(?:770680|776228|776492|776494|282080|282104|284362|182916|184042)-\d+$/;
const TE_TERMINAL_CORE_RE = /^(?:[1-9]-)?(?:963715|928999|928918|965908|964261|964263|964267|964269|964273|964274|964296|964300|927768|927771|927827|929974|962915|965999|1241380|1241406|1241416|1241858|968857|967542|1452668|1452671|1452503|1670144|1670146|1703930|1703278|1718760|282109|171661|171662|173681|173716|175265|1123343|1743654|1393366|1534594|1534170|353376|1897660)-\d+$/;

function inferBrandIdFromMpn(mpn) {
  if (/^1928[34]\d{5}$/.test(mpn)) return 'bosch';
  if (/^(?:805|806|872|709|706|772|955)-\d{3}-\d{3}$/.test(mpn)) return 'hirschmann';
  if (/^RT0W/i.test(mpn)) return 'amphenol';
  if (/^AT04-/i.test(mpn)) return 'deutsch';
  if (/^044-\d{4}-\d{3}$/.test(mpn)) return 'itt';
  if (/^(?:34083|64320|43025|31410)-\d{4}$|^54200206$/.test(mpn)) return 'molex';
  if (/^(?:4545300|4545100|1707670)$/.test(mpn)) return 'mta';
  if (/^(?:120\d{5}|153\d{5})$/.test(mpn)) return 'aptiv-delphi';
  if (/^(?:7123|7283)-\d{4}/.test(mpn)) return 'yazaki';
  if (/^(?:8240|6195)-\d{4}$/.test(mpn)) return 'sumitomo';
  if (/^(?:MG6\d+|ST7\d+)/i.test(mpn)) return 'ket';
  if (/^9200326011$/.test(mpn)) return 'kostal';
  if (/^54001400$/.test(mpn)) return 'fci';
  if (/^(?:13|14|16|17|18|19|25|26|28)\d{9}$|^E\d{8}$|^E-\d{4}$/i.test(mpn)) return 'lear';
  if (/^(?:\d+-)?\d{5,7}-\d+$/.test(mpn)) return 'te-connectivity';
  return 'automotive-oem';
}

function classifySeriesAndCategory(mpn, brandId, rawCategory, spq, priceCny) {
  if (brandId === 'automotive-oem') {
    const isVagOrPsa = /^1K0|^PPI/i.test(mpn);
    return {
      categoryId: 'oem-cross-reference',
      series: isVagOrPsa ? 'OEM Harness Cross-Reference' : 'Standard Automotive Interconnect',
      specSummaryZh: `主机厂/通用车规配套连接件（料号 ${mpn}），支持样品实测核对与国产化替代选型。`,
      specSummaryEn: `Automotive OEM / standard cross-reference connector component (${mpn}), available for sample verification and BOM kitting.`
    };
  }

  if (brandId === 'bosch') {
    if (/^192840/.test(mpn)) {
      return {
        categoryId: 'connector-housings',
        series: 'BOSCH 192840 Compact / Jetronic Series',
        specSummaryZh: `博世 192840 系列发动机舱传感器/执行器连接器护套（${mpn}），耐高温抗振车规结构。`,
        specSummaryEn: `BOSCH 192840 series powertrain sensor and actuator connector housing (${mpn}) for automotive engine harnesses.`
      };
    }
    if (/^192849/.test(mpn)) {
      return {
        categoryId: 'terminals-contacts',
        series: 'BOSCH 192849 Precision Terminal Series',
        specSummaryZh: `博世 192849 系列车规线束压接端子组件（${mpn}），适配 1928 系列密封连接器护套。`,
        specSummaryEn: `BOSCH 192849 series automotive crimp terminal contact (${mpn}) engineered for BOSCH 1928 connector housings.`
      };
    }
    return {
      categoryId: 'seals-accessories',
      series: 'BOSCH 192830 Single Wire Seal Series',
      specSummaryZh: `博世 192830 系列车规线束单线密封栓/防护附件（${mpn}），满足机舱防潮防尘端接需求。`,
      specSummaryEn: `BOSCH 192830 series automotive wire seal and harness protection accessory (${mpn}) for sealed terminations.`
    };
  }

  if (brandId === 'lear') {
    if (/^(?:25|26|28)\d{9}$|^E-\d{4}$/i.test(mpn) || rawCategory.includes('Terminal')) {
      return {
        categoryId: 'terminals-contacts',
        series: 'LEAR 26000 / 28000 Terminal Series',
        specSummaryZh: `李尔（LEAR）车规精密冲压端子/线束接触件（${mpn}），适配整车高低压信号控制线束压接。`,
        specSummaryEn: `LEAR precision automotive crimp terminal / contact (${mpn}) for OEM body and chassis wiring harnesses.`
      };
    }
    const prefix = mpn.startsWith('E') ? 'LEAR E-Series' : `LEAR ${mpn.slice(0, 2)}000 Housing Series`;
    return {
      categoryId: 'connector-housings',
      series: prefix,
      specSummaryZh: `李尔（LEAR）车规多极连接器护套（${mpn}），用于车身域控制与舱内精密线束配接。`,
      specSummaryEn: `LEAR automotive multi-way connector housing (${mpn}) designed for body electronics and interior harness systems.`
    };
  }

  if (brandId === 'hirschmann') {
    if (/^(?:805|806|872)-/.test(mpn)) {
      const fam = mpn.slice(0, 3);
      return {
        categoryId: 'sealed-heavy-duty',
        series: `HIRSCHMANN ${fam} SealStar Series`,
        specSummaryZh: `赫斯曼 ${fam} SealStar 系列高等级密封汽车连接器（${mpn}），适用于严苛涉水与振动工况。`,
        specSummaryEn: `HIRSCHMANN ${fam} SealStar sealed automotive connector (${mpn}) built for moisture-critical chassis and sensor zones.`
      };
    }
    return {
      categoryId: 'seals-accessories',
      series: `HIRSCHMANN ${mpn.slice(0, 3)} Seal & Accessory Series`,
      specSummaryZh: `赫斯曼原厂密封盲堵/护套锁止附件（${mpn}），用于 SealStar 系列连接器齐套密封防护。`,
      specSummaryEn: `HIRSCHMANN genuine sealing plug / housing retainer accessory (${mpn}) for complete harness environmental protection.`
    };
  }

  if (brandId === 'amphenol') {
    return {
      categoryId: 'sealed-heavy-duty',
      series: 'Amphenol RT0W Circular Bayonet Series',
      specSummaryZh: `安费诺 RT0W 系列金属卡口圆形重载防水连接器（${mpn}），适用于商用车与工业装备互连。`,
      specSummaryEn: `Amphenol RT0W rugged circular bayonet waterproof connector (${mpn}) for commercial vehicle and industrial equipment.`
    };
  }

  if (brandId === 'deutsch') {
    return {
      categoryId: 'sealed-heavy-duty',
      series: 'DEUTSCH / AT04 Sealed Rectangular Series',
      specSummaryZh: `AT04 系列 3 芯重载热塑性环境密封连接器插座（${mpn}），适用于商用车与工程机械线束。`,
      specSummaryEn: `AT04 series 3-way environmentally sealed heavy-duty receptacle (${mpn}) for commercial vehicle and off-highway harnesses.`
    };
  }

  if (brandId === 'itt') {
    return {
      categoryId: 'sealed-heavy-duty',
      series: 'ITT Cannon Heavy-Duty Circular Series',
      specSummaryZh: `埃梯梯科能（ITT Cannon）车载与工业高抗振连接器组件（${mpn}），原厂包装批次可溯源。`,
      specSummaryEn: `ITT Cannon heavy-duty high-vibration connector assembly (${mpn}) with full factory lot traceability.`
    };
  }

  if (brandId === 'molex') {
    const seriesName = mpn.startsWith('64320')
      ? 'Molex CMC Sealed Automotive Series'
      : mpn.startsWith('34083')
        ? 'Molex MX150 / Automotive Series'
        : mpn.startsWith('43025')
          ? 'Molex Micro-Fit 3.0 Series'
          : 'Molex Automotive Wire-to-Board Series';
    return {
      categoryId: 'connector-housings',
      series: seriesName,
      specSummaryZh: `莫仕（Molex）车规及精密线对板/线对线连接器护套（${mpn}），适用于座舱电子与控制模块。`,
      specSummaryEn: `Molex automotive and wire-to-board connector housing (${mpn}) for electronic control modules and cabin harnesses.`
    };
  }

  if (brandId === 'mta') {
    return {
      categoryId: 'power-distribution',
      series: 'MTA High-Current Power Distribution Series',
      specSummaryZh: `意大利美达（MTA）车载配电盒大电流端子与连接组件（${mpn}），低接触电阻高载流设计。`,
      specSummaryEn: `MTA automotive power distribution unit and high-current terminal component (${mpn}) for primary power circuits.`
    };
  }

  if (brandId === 'aptiv-delphi') {
    return {
      categoryId: 'connector-housings',
      series: 'Aptiv / Delphi Metri-Pack 120 Series',
      specSummaryZh: `安波福/原德尔福 Metri-Pack 系列车规连接器组件（${mpn}），广泛配套主流合资与自主整车线束。`,
      specSummaryEn: `Aptiv (formerly Delphi) Metri-Pack automotive connector component (${mpn}) widely used in OEM harnesses.`
    };
  }

  if (brandId === 'yazaki') {
    const fam = mpn.slice(0, 4);
    return {
      categoryId: 'connector-housings',
      series: `Yazaki ${fam} Automotive Housing Series`,
      specSummaryZh: `矢崎（Yazaki）${fam} 系列整车线束连接器护套（${mpn}），具备可靠锁扣防退针结构。`,
      specSummaryEn: `Yazaki ${fam} series automotive wire harness connector housing (${mpn}) with positive terminal retention.`
    };
  }

  if (brandId === 'sumitomo') {
    if (mpn.startsWith('8240')) {
      return {
        categoryId: 'terminals-contacts',
        series: 'Sumitomo 8240 Crimp Terminal Series',
        specSummaryZh: `住友电装（Sumitomo）8240 系列车规精密压接端子（${mpn}），适配日系及多平台整车线束。`,
        specSummaryEn: `Sumitomo 8240 series precision automotive crimp terminal (${mpn}) for multi-platform OEM wiring harnesses.`
      };
    }
    return {
      categoryId: 'sealed-heavy-duty',
      series: 'Sumitomo 6195 Sealed Housing Series',
      specSummaryZh: `住友电装（Sumitomo）6195 系列防水密封连接器护套（${mpn}），适用于机舱与外饰线束节点。`,
      specSummaryEn: `Sumitomo 6195 series waterproof sealed connector housing (${mpn}) for exterior and under-hood harness nodes.`
    };
  }

  if (brandId === 'ket') {
    if (/^ST7/i.test(mpn)) {
      return {
        categoryId: 'terminals-contacts',
        series: 'KET ST700000 Crimp Terminal Series',
        specSummaryZh: `韩国端子工业（KET）ST7 系列车规冲压端子（${mpn}），适配高速全自动压接产线。`,
        specSummaryEn: `KET ST7 series stamped automotive crimp terminal (${mpn}) engineered for automated wire processing.`
      };
    }
    return {
      categoryId: 'connector-housings',
      series: 'KET MG600000 Multi-Pole Housing Series',
      specSummaryZh: `韩国端子工业（KET）MG6 系列车规多极连接器护套（${mpn}），配套车身与仪表板线束。`,
      specSummaryEn: `KET MG6 series multi-pole automotive connector housing (${mpn}) for body and instrument panel harnesses.`
    };
  }

  if (brandId === 'kostal') {
    return {
      categoryId: 'connector-housings',
      series: 'KOSTAL Automotive Control Connector Series',
      specSummaryZh: `科世达（KOSTAL）欧系机电控制模块精密连接器护套（${mpn}），原厂渠道正品现货。`,
      specSummaryEn: `KOSTAL precision automotive control module connector housing (${mpn}) from verified supply channels.`
    };
  }

  if (brandId === 'fci') {
    return {
      categoryId: 'connector-housings',
      series: 'FCI Apex 2.8 Automotive Series',
      specSummaryZh: `法马通（FCI）Apex 系列车规高可靠连接器组件（${mpn}），紧凑间距高载流锁止设计。`,
      specSummaryEn: `FCI Apex series high-reliability automotive connector component (${mpn}) with compact secondary lock design.`
    };
  }

  // TE Connectivity 175 款细分
  if (TE_SEAL_LOCK_MPNS.has(mpn)) {
    return {
      categoryId: 'seals-accessories',
      series: 'TE Wire Seal & Cavity Plug Series',
      specSummaryZh: `泰科电子（TE）车规硅胶单线防水栓/盲堵密封件（${mpn}），配套 MQS/MCP/Superseal 密封线束。`,
      specSummaryEn: `TE Connectivity silicone single-wire seal / cavity plug (${mpn}) for sealed MQS, MCP, and Superseal harnesses.`
    };
  }

  if (TE_HDSCS_PREFIX_RE.test(mpn)) {
    return {
      categoryId: 'sealed-heavy-duty',
      series: 'TE HDSCS Heavy-Duty Sealed Series',
      specSummaryZh: `泰科电子（TE）HDSCS 重载防水连接器护套/组件（${mpn}），IP67 防护适用于商用车与动力总成。`,
      specSummaryEn: `TE Connectivity HDSCS heavy-duty sealed connector housing/assembly (${mpn}) rated for powertrain and commercial vehicles.`
    };
  }

  if (TE_AMPSEAL_SUPERSEAL_RE.test(mpn)) {
    const isAmpseal = /^77/.test(mpn);
    const series = isAmpseal ? 'TE AMPSEAL ECU Sealed Series' : 'TE AMP Superseal 1.5 Series';
    return {
      categoryId: 'sealed-heavy-duty',
      series,
      specSummaryZh: `泰科电子（TE）${isAmpseal ? 'AMPSEAL 电控单元' : 'Superseal 1.5'}高密封车规连接器（${mpn}），耐温抗振防水设计。`,
      specSummaryEn: `TE Connectivity ${series} sealed automotive connector (${mpn}) for ECU and harsh-environment harness interfaces.`
    };
  }

  if (TE_TERMINAL_CORE_RE.test(mpn) || (spq >= 5000 && priceCny <= 0.5)) {
    const subSeries = /963715|928999|928918|965908/.test(mpn)
      ? 'TE MQS 0.63mm Terminal Series'
      : /9642|9277|9278|9299|9629|965999/.test(mpn)
        ? 'TE JPT / Timer Terminal Series'
        : /1241|968857|967542/.test(mpn)
          ? 'TE AMP MCP Terminal Series'
          : /1452|167014|1703930|1703278|1718760/.test(mpn)
            ? 'TE MCON 1.2mm Terminal Series'
            : 'TE Automotive Crimp Terminal Series';
    return {
      categoryId: 'terminals-contacts',
      series: subSeries,
      specSummaryZh: `泰科电子（TE）车规精密压接端子（${mpn}，${subSeries.replace('TE ', '')}），卷盘原厂标准包装。`,
      specSummaryEn: `TE Connectivity precision crimp terminal (${mpn}, ${subSeries.replace('TE ', '')}) in factory reel packaging.`
    };
  }

  const housingSeries = /(?:9676|96897|1355|1241370|1534)/.test(mpn)
    ? 'TE AMP MCP / MQS Housing Series'
    : /^(?:368|172|173|174|1318|1473|1813)/.test(mpn)
      ? 'TE Econoseal / Multilock Housing Series'
      : 'TE Automotive Connector Series';

  return {
    categoryId: 'connector-housings',
    series: housingSeries,
    specSummaryZh: `泰科电子（TE）车规连接器护套/组件（${mpn}，${housingSeries.replace('TE ', '')}），常备现货支持齐套配单。`,
    specSummaryEn: `TE Connectivity automotive connector housing/component (${mpn}, ${housingSeries.replace('TE ', '')}), stocked for BOM kitting.`
  };
}

function buildCatalogData() {
  const rawJson = JSON.parse(fs.readFileSync(RAW_DATA_PATH, 'utf8'));
  const manifestJson = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  // 校验 17 家品牌 SVG 文件物理存在及 manifest 对齐
  const manifestSlugSet = new Set((manifestJson.partner_brand_assets || []).map((b) => b.slug));
  for (const brand of BRAND_DEFINITIONS) {
    if (!manifestSlugSet.has(brand.slug)) {
      throw new Error(`Brand slug "${brand.slug}" missing in assets-manifest.json`);
    }
    const svgDiskPath = path.join(BRANDS_ASSET_DIR, `${brand.slug}.svg`);
    if (!fs.existsSync(svgDiskPath) || fs.statSync(svgDiskPath).size === 0) {
      throw new Error(`Brand SVG missing or empty on disk: ${svgDiskPath}`);
    }
  }

  const brandMap = new Map(BRAND_DEFINITIONS.map((b) => [b.id, b]));
  const categoryMap = new Map(CATEGORY_DEFINITIONS.map((c) => [c.id, c]));

  const rawItems = rawJson?.product_catalog?.items || [];
  if (rawItems.length !== 383) {
    throw new Error(`Expected 383 raw SKUs from raw-oulink-data.json, got ${rawItems.length}`);
  }

  const skuCountByBrand = new Map(BRAND_DEFINITIONS.map((b) => [b.id, 0]));
  const skuCountByCategory = new Map(CATEGORY_DEFINITIONS.map((c) => [c.id, 0]));

  const products = rawItems.map((raw, idx) => {
    const mpn = String(raw.model || raw.raw_model_string || '').trim();
    if (!mpn) {
      throw new Error(`Empty MPN at index ${idx}`);
    }

    const brandId = inferBrandIdFromMpn(mpn);
    const brandMeta = brandMap.get(brandId) || GENERIC_AUTO_BRAND;

    const stockQty = Number(raw.stock_qty) || 0;
    const priceCny = Number(raw.unit_price_excl_tax_cny) || 0;
    const rawSpq = Number(raw.spq) || 0;
    const rawMoq = Number(raw.moq) || 0;
    const spq = rawSpq > 0 ? rawSpq : 1;
    const moq = rawMoq > 0 ? rawMoq : 1;

    const batchStr = String(raw.batch || '').trim();
    const batchYear = /^\d{4}$/.test(batchStr) && Number(batchStr) >= 2000 ? batchStr : '2022';

    const { categoryId, series, specSummaryZh, specSummaryEn } = classifySeriesAndCategory(
      mpn,
      brandId,
      String(raw.inferred_category || ''),
      spq,
      priceCny
    );

    const catMeta = categoryMap.get(categoryId);
    if (!catMeta) {
      throw new Error(`Unknown categoryId "${categoryId}" for MPN ${mpn}`);
    }

    if (skuCountByBrand.has(brandId)) {
      skuCountByBrand.set(brandId, skuCountByBrand.get(brandId) + 1);
    }
    skuCountByCategory.set(categoryId, skuCountByCategory.get(categoryId) + 1);

    return {
      id: `sku-${String(idx + 1).padStart(3, '0')}`,
      mpn,
      brandId,
      brandNameZh: brandMeta.nameZh,
      brandNameEn: brandMeta.nameEn,
      categoryId,
      categoryZh: catMeta.nameZh,
      categoryEn: catMeta.nameEn,
      series,
      stockQty,
      priceCny,
      spq,
      moq,
      batchYear,
      specSummaryZh,
      specSummaryEn,
      inStock: stockQty > 0
    };
  });

  const brands = BRAND_DEFINITIONS.map((b) => ({
    id: b.id,
    slug: b.slug,
    nameZh: b.nameZh,
    nameEn: b.nameEn,
    tier: b.tier,
    tierLabelZh: b.tierLabelZh,
    tierLabelEn: b.tierLabelEn,
    logoPath: b.logoPath,
    aspectRatio: b.aspectRatio,
    skuCount: skuCountByBrand.get(b.id) || 0,
    seriesSummaryZh: b.seriesSummaryZh,
    seriesSummaryEn: b.seriesSummaryEn,
    featured: b.featured
  }));

  const categories = CATEGORY_DEFINITIONS.map((c) => ({
    id: c.id,
    nameZh: c.nameZh,
    nameEn: c.nameEn,
    count: skuCountByCategory.get(c.id) || 0,
    descriptionZh: c.descriptionZh,
    descriptionEn: c.descriptionEn
  }));

  const prices = products.map((p) => p.priceCny);
  const totalStockUnits = products.reduce((sum, p) => sum + p.stockQty, 0);
  const crawledDate = String(rawJson?.metadata?.crawled_at || '2026-11-21').slice(0, 10);

  const stats = {
    totalSkus: products.length,
    totalStockUnits,
    authorizedBrandCount: brands.filter((b) => b.tier === 'authorized').length,
    totalBrandCount: brands.length,
    minPriceCny: Math.min(...prices),
    maxPriceCny: Math.max(...prices),
    updatedDate: crawledDate
  };

  return { brands, categories, products, stats };
}

function renderCatalogModule({ brands, categories, products, stats }) {
  return `/**
 * 上海欧连电子科技有限公司官网（oulink-site）标准化汽车连接器料号库与检索引擎
 *
 * 数据来源：由 scripts/sync-catalog.mjs 从 docs/raw-oulink-data.json 与 docs/assets-manifest.json 100% 全量清洗生成。
 * 包含 17 家合作品牌（5 家授权经销 + 12 家原厂合作与经销配套）、6 大车规连接器技术分类及全部 383 款真实在库 SKU。
 */

export const BRANDS = ${JSON.stringify(brands, null, 2)};

export const PRODUCT_CATEGORIES = ${JSON.stringify(categories, null, 2)};

export const PRODUCTS_CATALOG = ${JSON.stringify(products, null, 2)};

export const CATALOG_STATS = ${JSON.stringify(stats, null, 2)};

const BRAND_EXTRA_ALIASES = {
  lear: ['lear', 'leartc', '李尔'],
  hirschmann: ['hirschmann', 'hirschmannautomotive', '赫斯曼'],
  amphenol: ['amphenol', 'amphenolsine', 'souriau', '安费诺'],
  rosenberger: ['rosenberger', 'fakra', 'hsd', 'hfm', '罗森伯格'],
  bosch: ['bosch', 'robertbosch', '博世'],
  'te-connectivity': ['te', 'teconnectivity', 'tyco', 'tycoelectronics', 'amp', '泰科', '泰科电子'],
  molex: ['molex', '莫仕'],
  mta: ['mta', '美达', '意大利美达'],
  'aptiv-delphi': ['aptiv', 'delphi', 'aptivdelphi', '安波福', '德尔福'],
  yazaki: ['yazaki', '矢崎'],
  sumitomo: ['sumitomo', 'sws', '住友', '住友电装'],
  jst: ['jst', '日压端子', '日本压着端子'],
  ket: ['ket', '韩国端子', '韩国端子工业'],
  kostal: ['kostal', '科世达'],
  fci: ['fci', 'amphenolfci', '法马通'],
  deutsch: ['deutsch', '德驰'],
  itt: ['itt', 'ittcannon', 'cannon', '埃梯梯', '埃梯梯科能'],
  'automotive-oem': ['oem', 'standard', '通用', '车规通用', '主机厂']
};

export function normalizeMpn(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[\\s\\-_./\\\\()（）&+,，、:：]+/g, '');
}

function splitWordTokens(text) {
  return String(text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9\\u4e00-\\u9fa5]+/)
    .filter(Boolean);
}

function buildBrandKeywords(brand, fallbackZh = '', fallbackEn = '') {
  const set = new Set();
  const id = String(brand?.id || '').toLowerCase();
  const slug = String(brand?.slug || '').toLowerCase();
  const nameZh = String(brand?.nameZh || fallbackZh || '');
  const nameEn = String(brand?.nameEn || fallbackEn || '');

  for (const raw of [id, slug, nameZh, nameEn]) {
    if (!raw) continue;
    const norm = normalizeMpn(raw);
    if (norm) set.add(norm);
    for (const part of splitWordTokens(raw)) {
      set.add(part);
    }
  }

  const preset = BRAND_EXTRA_ALIASES[id] || BRAND_EXTRA_ALIASES[slug] || [];
  for (const alias of preset) {
    set.add(normalizeMpn(alias));
  }
  return Array.from(set);
}

function computeMatchScore(entry, rawTerms) {
  let totalScore = 0;

  for (const rawTerm of rawTerms) {
    const lowerTerm = rawTerm.toLowerCase();
    const normTerm = normalizeMpn(rawTerm);
    if (!normTerm) continue;

    const hasCjk = /[\\u4e00-\\u9fa5]/.test(normTerm);
    let termScore = 0;

    if (entry.mpnLower === lowerTerm) {
      termScore = 120;
    } else if (entry.mpnNorm === normTerm) {
      termScore = 115;
    } else if (entry.mpnLower.startsWith(lowerTerm)) {
      termScore = 100;
    } else if (entry.mpnNorm.startsWith(normTerm)) {
      termScore = 95;
    } else if (entry.mpnNorm.includes(normTerm)) {
      termScore = 80;
    } else if (
      entry.brandKeywords.some(
        (bk) =>
          bk === normTerm ||
          (hasCjk && bk.includes(normTerm)) ||
          (!hasCjk && normTerm.length >= 3 && bk.startsWith(normTerm))
      )
    ) {
      termScore = 65;
    } else if (hasCjk && entry.cjkSearchText.includes(normTerm)) {
      termScore = 50;
    } else if (
      !hasCjk &&
      normTerm.length >= 3 &&
      (entry.seriesNorm.includes(normTerm) ||
        entry.enWords.some((w) => w.startsWith(normTerm)))
    ) {
      termScore = 40;
    }

    if (termScore === 0) {
      return 0;
    }
    totalScore += termScore;
  }

  return totalScore;
}

export function createCatalogApi(customProducts = PRODUCTS_CATALOG, customBrands = BRANDS) {
  const safeProducts = Array.isArray(customProducts) ? customProducts : PRODUCTS_CATALOG;
  const safeBrandsInput = Array.isArray(customBrands) ? customBrands : BRANDS;

  const brandCountMap = new Map();
  const categoryCountMap = new Map();
  const dynamicCategoriesMap = new Map();

  for (const item of safeProducts) {
    if (item?.brandId) {
      brandCountMap.set(item.brandId, (brandCountMap.get(item.brandId) || 0) + 1);
    }
    if (item?.categoryId) {
      categoryCountMap.set(item.categoryId, (categoryCountMap.get(item.categoryId) || 0) + 1);
      if (!dynamicCategoriesMap.has(item.categoryId)) {
        dynamicCategoriesMap.set(item.categoryId, {
          id: item.categoryId,
          nameZh: item.categoryZh || item.categoryId,
          nameEn: item.categoryEn || item.categoryId
        });
      }
    }
  }

  const brands = safeBrandsInput.map((b) => ({
    ...b,
    skuCount:
      customProducts === PRODUCTS_CATALOG && typeof b.skuCount === 'number'
        ? b.skuCount
        : brandCountMap.get(b.id) ?? brandCountMap.get(b.slug) ?? 0
  }));

  const brandLookup = new Map();
  for (const b of brands) {
    if (b.id) brandLookup.set(String(b.id).toLowerCase(), b);
    if (b.slug) brandLookup.set(String(b.slug).toLowerCase(), b);
  }

  const baseCategoryIds = new Set(PRODUCT_CATEGORIES.map((c) => c.id));
  const categories = [
    ...PRODUCT_CATEGORIES.map((c) => ({
      ...c,
      count: categoryCountMap.get(c.id) || 0
    })).filter((c) => customProducts === PRODUCTS_CATALOG || c.count > 0),
    ...Array.from(dynamicCategoriesMap.values())
      .filter((c) => !baseCategoryIds.has(c.id))
      .map((c) => ({
        id: c.id,
        nameZh: c.nameZh,
        nameEn: c.nameEn,
        count: categoryCountMap.get(c.id) || 0,
        descriptionZh: c.nameZh,
        descriptionEn: c.nameEn
      }))
  ];

  const prices = safeProducts.map((p) => Number(p.priceCny) || 0).filter((v) => v > 0);
  const stats = {
    totalSkus: safeProducts.length,
    totalStockUnits: safeProducts.reduce((sum, p) => sum + (Number(p.stockQty) || 0), 0),
    authorizedBrandCount: brands.filter((b) => b.tier === 'authorized').length,
    totalBrandCount: brands.length,
    minPriceCny: prices.length > 0 ? Math.min(...prices) : 0,
    maxPriceCny: prices.length > 0 ? Math.max(...prices) : 0,
    updatedDate: CATALOG_STATS.updatedDate
  };

  const indexedProducts = safeProducts.map((item, index) => {
    const brandObj = brandLookup.get(String(item.brandId || '').toLowerCase());
    return {
      item,
      index,
      mpnLower: String(item.mpn || '').toLowerCase(),
      mpnNorm: normalizeMpn(item.mpn),
      brandIdLower: String(item.brandId || '').toLowerCase(),
      brandTier: brandObj?.tier || 'other',
      categoryIdLower: String(item.categoryId || '').toLowerCase(),
      brandKeywords: buildBrandKeywords(brandObj, item.brandNameZh, item.brandNameEn),
      seriesNorm: normalizeMpn(item.series),
      cjkSearchText: normalizeMpn(
        \`\${item.brandNameZh || ''} \${item.categoryZh || ''} \${item.series || ''} \${item.specSummaryZh || ''}\`
      ),
      enWords: splitWordTokens(
        \`\${item.series || ''} \${item.categoryEn || ''} \${item.specSummaryEn || ''}\`
      )
    };
  });

  function search(queryOrOptions = '', maybeOptions = {}) {
    let rawQuery = '';
    let opts = maybeOptions || {};

    if (typeof queryOrOptions === 'object' && queryOrOptions !== null) {
      opts = queryOrOptions;
      rawQuery = String(opts.query ?? opts.q ?? opts.keyword ?? '');
    } else {
      rawQuery = String(queryOrOptions ?? '');
    }

    const trimmedQuery = rawQuery.trim();
    const rawTerms = trimmedQuery ? trimmedQuery.split(/\\s+/).filter(Boolean) : [];

    const filterBrand =
      opts.brandId && String(opts.brandId).toLowerCase() !== 'all'
        ? String(opts.brandId).toLowerCase()
        : '';
    const filterCategory =
      opts.categoryId && String(opts.categoryId).toLowerCase() !== 'all'
        ? String(opts.categoryId).toLowerCase()
        : '';
    const filterTier =
      opts.tier && String(opts.tier).toLowerCase() !== 'all'
        ? String(opts.tier).toLowerCase()
        : '';
    const inStockOnly = Boolean(opts.inStockOnly);

    const scored = [];
    for (const entry of indexedProducts) {
      if (filterBrand && entry.brandIdLower !== filterBrand) continue;
      if (filterCategory && entry.categoryIdLower !== filterCategory) continue;
      if (filterTier && entry.brandTier !== filterTier) continue;
      if (inStockOnly && !entry.item.inStock) continue;

      if (rawTerms.length === 0) {
        scored.push({ item: entry.item, score: 1, index: entry.index });
      } else {
        const score = computeMatchScore(entry, rawTerms);
        if (score > 0) {
          scored.push({ item: entry.item, score, index: entry.index });
        }
      }
    }

    const sortBy = String(opts.sortBy || '');
    if (sortBy === 'stock-desc') {
      scored.sort((a, b) => b.item.stockQty - a.item.stockQty || a.index - b.index);
    } else if (sortBy === 'price-asc') {
      scored.sort((a, b) => a.item.priceCny - b.item.priceCny || a.index - b.index);
    } else if (sortBy === 'price-desc') {
      scored.sort((a, b) => b.item.priceCny - a.item.priceCny || a.index - b.index);
    } else if (rawTerms.length > 0) {
      scored.sort((a, b) => b.score - a.score || a.index - b.index);
    }

    const total = scored.length;
    const safePageSize = Math.max(1, Number(opts.pageSize) || 20);
    const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);
    const safePage = Math.max(1, Number(opts.page) || 1);
    const startOffset = (safePage - 1) * safePageSize;
    const items = scored.slice(startOffset, startOffset + safePageSize).map((x) => x.item);

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages
    };
  }

  function getBrandById(brandIdOrSlug) {
    if (!brandIdOrSlug) return null;
    return brandLookup.get(String(brandIdOrSlug).toLowerCase()) || null;
  }

  function getProductByMpn(mpnQuery) {
    const targetNorm = normalizeMpn(mpnQuery);
    if (!targetNorm) return null;
    const exact = indexedProducts.find((e) => e.mpnNorm === targetNorm);
    return exact ? exact.item : null;
  }

  function getFeaturedProducts(limit = 12) {
    const picked = [];
    const seenBrands = new Set();
    for (const entry of indexedProducts) {
      if (entry.brandIdLower !== 'automotive-oem' && !seenBrands.has(entry.brandIdLower)) {
        seenBrands.add(entry.brandIdLower);
        picked.push(entry.item);
        if (picked.length >= limit) return picked;
      }
    }
    for (const entry of indexedProducts) {
      if (!picked.includes(entry.item)) {
        picked.push(entry.item);
        if (picked.length >= limit) break;
      }
    }
    return picked;
  }

  return {
    brands,
    categories,
    products: safeProducts,
    stats,
    searchProducts: search,
    getBrandById,
    getProductByMpn,
    getFeaturedProducts
  };
}

const defaultCatalogApi = createCatalogApi(PRODUCTS_CATALOG, BRANDS);

export function searchProducts(query = '', options = {}) {
  return defaultCatalogApi.searchProducts(query, options);
}

export function getBrandById(brandId) {
  return defaultCatalogApi.getBrandById(brandId);
}
`;
}

function assertCleanFromForbiddenTerms(content, label) {
  for (const term of FORBIDDEN_LEGACY_TERMS) {
    if (content.includes(term)) {
      throw new Error(`Forbidden legacy term "${term}" detected in ${label}`);
    }
  }
}

export function syncCatalog() {
  const data = buildCatalogData();
  const moduleSource = renderCatalogModule(data);

  assertCleanFromForbiddenTerms(moduleSource, 'src/content/productsCatalog.js');
  assertCleanFromForbiddenTerms(fs.readFileSync(__filename, 'utf8'), 'scripts/sync-catalog.mjs');

  fs.mkdirSync(path.dirname(OUTPUT_CATALOG_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_CATALOG_PATH, moduleSource, 'utf8');

  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const { brands, categories, products, stats } = syncCatalog();
  console.log('[sync-catalog] Generated:', OUTPUT_CATALOG_PATH);
  console.log('[sync-catalog] Stats:', JSON.stringify(stats));
  console.log(
    '[sync-catalog] Brands:',
    brands.map((b) => `${b.nameEn}(${b.tier}:${b.skuCount})`).join(', ')
  );
  console.log(
    '[sync-catalog] Categories:',
    categories.map((c) => `${c.id}:${c.count}`).join(', ')
  );
  console.log('[sync-catalog] Total verified SKUs:', products.length);
}
