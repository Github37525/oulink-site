import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Box,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Grid,
  Layers,
  Plus,
  RotateCcw,
} from "lucide-react";

/**
 * Built-in baseline CAD metadata aligned with the 6 automotive product categories.
 * Automatically overridden by `cadModelsMap` from `src/content/cadModelsMeta.js` when provided.
 */
export const FALLBACK_CAD_MODELS_BY_CATEGORY = {
  "connector-housings": {
    id: "connector-housings",
    glbPath: "/assets/models/connector-housings.glb",
    code: "CAD-CH-16P",
    nameZh: "16极车规双锁连接器护套总成",
    nameEn: "16-Way Dual-Lock Automotive Housing Assembly",
    dimensions: "36.4 × 24.8 × 28.2 mm",
    materialZh: "PBT-GF30 增强工程塑料 / 铜合金 / 硅橡胶",
    materialEn: "PBT-GF30 Glass-Filled / CuSn4 / VMQ Silicone",
    ipRating: "IP67 (Mated)",
    vertexCount: 6420,
    faceCount: 11840,
    parts: [
      {
        meshName: "Housing_Body",
        labelZh: "16腔防呆护套本体",
        labelEn: "16-Cavity Keyed Housing Body",
        roleZh: "2×8 极端子独立腔体、机械编码防呆导向肋与主悬臂锁扣桥。",
        roleEn: "2x8 isolated terminal cavities, polarization ribs, and primary latch bridge.",
        explodeOffset: [0, 0, 0],
        accentRole: "housing",
      },
      {
        meshName: "CPA_Lock",
        labelZh: "CPA 顶部二次锁止滑块",
        labelEn: "CPA Position Assurance Slider",
        roleZh: "公母对插到位后推入锁死主卡扣，防止行车振动导致意外退锁。",
        roleEn: "Locks primary latch after full mating to prevent vibration-induced unmating.",
        explodeOffset: [0, 0.55, -0.35],
        accentRole: "gold",
      },
      {
        meshName: "TPA_Retainer",
        labelZh: "TPA 前部端子保持架",
        labelEn: "TPA Front Terminal Retainer",
        roleZh: "检测端子是否插装到底并提供双重轴向保持力，杜绝半插退针。",
        roleEn: "Detects incomplete terminal seating and provides secondary axial retention.",
        explodeOffset: [0, 0, 0.78],
        accentRole: "gold",
      },
      {
        meshName: "Terminal_Pins",
        labelZh: "2×8 精密冲压插针阵列",
        labelEn: "2x8 Stamped Contact Pin Array",
        roleZh: "高导铜合金精密信号与低功率插针，低接触电阻稳定传输。",
        roleEn: "High-conductivity copper alloy pin array ensuring low contact resistance.",
        explodeOffset: [0, 0, -0.85],
        accentRole: "gold",
      },
      {
        meshName: "Perimeter_Seal",
        labelZh: "界面环形硅胶密封圈",
        labelEn: "Interfacial Perimeter Silicone Seal",
        roleZh: "多波纹径向压缩硅胶垫圈，阻隔水汽与灰尘侵入对插界面。",
        roleEn: "Multi-ribbed radial silicone seal blocking moisture ingress at mating interface.",
        explodeOffset: [0, 0, 0.42],
        accentRole: "seal",
      },
    ],
  },
  "sealed-heavy-duty": {
    id: "sealed-heavy-duty",
    glbPath: "/assets/models/sealed-heavy-duty.glb",
    code: "CAD-HD-IP6K9K",
    nameZh: "IP6K9K 动力舱重载杠杆密封连接器",
    nameEn: "IP6K9K Heavy-Duty Lever-Lock Sealed Connector",
    dimensions: "54.0 × 38.6 × 44.5 mm",
    materialZh: "PA66-GF35 耐高温尼龙 / 镀银铜端子 / 氟硅胶",
    materialEn: "PA66-GF35 High-Temp / Ag-Plated Cu / FVMQ",
    ipRating: "IP67 / IP6K9K",
    vertexCount: 7280,
    faceCount: 13600,
    parts: [
      {
        meshName: "Outer_Shroud",
        labelZh: "厚壁抗冲击防护外罩",
        labelEn: "Heavy-Wall Protective Outer Shroud",
        roleZh: "外部加强筋抗碎石冲击壳体，适配发动机舱与商用车底盘严苛工况。",
        roleEn: "Rib-reinforced outer shroud engineered for powertrain and off-highway shock loads.",
        explodeOffset: [0, 0, -0.45],
        accentRole: "housing",
      },
      {
        meshName: "Lever_Cam_Latch",
        labelZh: "U型偏心省力锁紧拨杆",
        labelEn: "U-Shaped Cam-Action Assist Lever",
        roleZh: "偏心滑槽齿轮啮合省力机构，实现多极高密封阻力下的平顺对插锁紧。",
        roleEn: "Cam-gear assist lever reducing mating force across multi-pole sealed interfaces.",
        explodeOffset: [0, 0.72, 0.15],
        accentRole: "gold",
      },
      {
        meshName: "Triple_Rib_Seal",
        labelZh: "三波纹径向防水密封圈",
        labelEn: "Triple-Rib Radial Environmental Seal",
        roleZh: "耐油耐温 -40°C~150°C 三唇自紧密封结构，满足高压蒸汽冲洗防护。",
        roleEn: "Oil-resistant -40°C to 150°C triple-lip seal rated for high-pressure washdown.",
        explodeOffset: [0, 0, 0.46],
        accentRole: "seal",
      },
      {
        meshName: "Cavity_Block",
        labelZh: "多孔高绝缘内芯体",
        labelEn: "Multi-Pole Dielectric Cavity Insert",
        roleZh: "精密阵列绝缘隔腔，保障高湿盐雾环境下相邻回路的绝缘耐压。",
        roleEn: "Precision dielectric insert maintaining circuit isolation under thermal cycling.",
        explodeOffset: [0, 0, 0.82],
        accentRole: "housing",
      },
      {
        meshName: "Power_Contacts",
        labelZh: "重载镀银动力插孔组",
        labelEn: "Silver-Plated Heavy-Duty Socket Contacts",
        roleZh: "多触点弹簧夹持镀银铜端子，降低大电流回路接触温升与微动磨损。",
        roleEn: "Multi-beam silver-plated contacts minimizing temperature rise and fretting corrosion.",
        explodeOffset: [0, 0, -0.92],
        accentRole: "gold",
      },
    ],
  },
  "terminals-contacts": {
    id: "terminals-contacts",
    glbPath: "/assets/models/terminals-contacts.glb",
    code: "CAD-TM-MQS",
    nameZh: "车规精密冲压箱式母端子 (MQS / MCP)",
    nameEn: "Stamped Box-Type Female Crimp Terminal (MQS / MCP)",
    dimensions: "18.6 × 2.6 × 2.8 mm",
    materialZh: "CuNiSi 高弹铜镍硅合金 · 选区镀金/镀银/镀锡",
    materialEn: "CuNiSi High-Yield Spring Alloy · Sn / Ag / Au Plated",
    ipRating: "USCAR-21 Crimp Spec",
    vertexCount: 4860,
    faceCount: 9120,
    parts: [
      {
        meshName: "Contact_Box",
        labelZh: "双悬臂弹簧接触箱体",
        labelEn: "Dual-Cantilever Spring Contact Box",
        roleZh: "不锈钢/铜合金外护箱防过应力变形，内部双触点弹片提供恒定正压力。",
        roleEn: "Anti-overstress box shroud protecting internal dual-beam spring contact points.",
        explodeOffset: [0, 0, 0.72],
        accentRole: "gold",
      },
      {
        meshName: "Locking_Lance",
        labelZh: "防退针定位矛钩与过渡段",
        labelEn: "Primary Locking Lance & Transition Neck",
        roleZh: "与塑壳腔体台阶精准咬合，配合 TPA 实现高抗拉拔保持力。",
        roleEn: "Engages housing cavity shoulder to secure primary terminal retention force.",
        explodeOffset: [0, 0.36, 0.12],
        accentRole: "housing",
      },
      {
        meshName: "Wire_Crimp_Barrel",
        labelZh: "B型裸铜芯线冷压接翼",
        labelEn: "B-Crimp Conductor Core Barrel",
        roleZh: "内壁精密止滑槽刺破铜丝氧化膜，全自动压接形成气密冷焊连接。",
        roleEn: "Serrated F/B-crimp wings piercing oxide layers to form gas-tight cold welds.",
        explodeOffset: [0, 0, -0.38],
        accentRole: "gold",
      },
      {
        meshName: "Insulation_Crimp",
        labelZh: "导线绝缘皮抱紧压接爪",
        labelEn: "Wire Insulation Strain-Relief Claws",
        roleZh: "环抱 FLRY 汽车薄壁导线外皮，吸收线束弯曲振动应力防止芯线断裂。",
        roleEn: "Wraps FLRY thin-wall wire insulation to isolate vibration from conductor strands.",
        explodeOffset: [0, 0, -0.86],
        accentRole: "housing",
      },
    ],
  },
  "seals-accessories": {
    id: "seals-accessories",
    glbPath: "/assets/models/seals-accessories.glb",
    code: "CAD-SL-SWS",
    nameZh: "三唇单线防水栓 (SWS) 与盲堵锁片齐套组件",
    nameEn: "Triple-Lip Wire Seal (SWS), Cavity Plug & Wedge Kit",
    dimensions: "Ø7.8 × 26.4 mm (Kit)",
    materialZh: "高撕裂强度液态硅胶 (LSR) / PBT 锁止工程件",
    materialEn: "Self-Lubricating LSR Silicone / PBT Retainers",
    ipRating: "IP67 / IP69K Cavity Seal",
    vertexCount: 5640,
    faceCount: 10800,
    parts: [
      {
        meshName: "Triple_Lip_SWS",
        labelZh: "三唇波纹单线防水密封栓",
        labelEn: "Triple-Lip Corrugated Single-Wire Seal",
        roleZh: "随端子绝缘爪同步压接穿入孔腔，外壁三道波纹密封塑壳内孔，内孔紧抱线皮。",
        roleEn: "Crimped onto wire insulation; outer triple ribs seal housing cavity walls.",
        explodeOffset: [0, 0, 0.65],
        accentRole: "seal",
      },
      {
        meshName: "Cavity_Blind_Plug",
        labelZh: "多级台阶空腔防水盲堵",
        labelEn: "Multi-Step Unused Cavity Blind Plug",
        roleZh: "封堵多极连接器中未使用的预留空腔，确保整套护套气密水检合格。",
        roleEn: "Seals unpopulated connector cavities to preserve full assembly IP67 integrity.",
        explodeOffset: [0.48, 0.28, 0.25],
        accentRole: "seal",
      },
      {
        meshName: "Secondary_Wedge_Lock",
        labelZh: "前插楔形二次锁片 (Wedge)",
        labelEn: "Front-Insert Secondary Wedge Lock",
        roleZh: "轴向插入端子弹舌背面间隙，刚性锁死全排端子并校验对位精度。",
        roleEn: "Wedges behind contact lances to rigidly lock terminal rows in place.",
        explodeOffset: [-0.45, 0, 0.72],
        accentRole: "gold",
      },
      {
        meshName: "Strain_Relief_Cap",
        labelZh: "尾部卡扣出线护套后盖",
        labelEn: "Snap-On Rear Wire Dress & Strain-Relief Cap",
        roleZh: "规范线束尾部折弯半径与波纹管固定槽位，防止拉扯导致单线栓偏心漏水。",
        roleEn: "Guides harness exit angle and secures convoluted tubing to prevent seal eccentricity.",
        explodeOffset: [0, 0, -0.78],
        accentRole: "housing",
      },
    ],
  },
  "power-distribution": {
    id: "power-distribution",
    glbPath: "/assets/models/power-distribution.glb",
    code: "CAD-PD-HV2P",
    nameZh: "大电流/高压电磁屏蔽法兰配电连接器",
    nameEn: "High-Current Shielded Flange Power Interconnect",
    dimensions: "68.5 × 46.0 × 52.0 mm",
    materialZh: "压铸铝合金法兰壳 / T2 紫铜镀银母排 / PA66-GF30",
    materialEn: "Die-Cast Al Alloy / Ag-Plated Cu Busbar / PA66-GF30",
    ipRating: "IP67 / IP6K9K · 360° EMC",
    vertexCount: 7820,
    faceCount: 14900,
    parts: [
      {
        meshName: "Diecast_Flange_Housing",
        labelZh: "四孔螺栓固定铝合金法兰壳体",
        labelEn: "4-Bolt Die-Cast Aluminum Flange Housing",
        roleZh: "高机械强度面板安装法兰壳，兼顾散热传导与抗强电磁干扰外壳接地。",
        roleEn: "Panel-mount die-cast housing providing mechanical rigidity and chassis grounding.",
        explodeOffset: [0, 0, 0],
        accentRole: "housing",
      },
      {
        meshName: "EMC_Shield_Collar",
        labelZh: "360° 环形电磁屏蔽冠簧套环",
        labelEn: "360° Circumferential EMC Shielding Collar",
        roleZh: "多点弹性指形簧片与编织屏蔽层连续低阻抗搭接，抑制车载功率瞬态干扰。",
        roleEn: "Multi-finger spring collar ensuring 360° low-impedance shield termination.",
        explodeOffset: [0, 0, -0.68],
        accentRole: "gold",
      },
      {
        meshName: "HVIL_Signal_Bridge",
        labelZh: "HVIL 高压互锁先断后通信号桥",
        labelEn: "HVIL Last-Mate / First-Break Interlock Bridge",
        roleZh: "安全监测回路短接桥，拔出瞬间优先断开控制信号以切断主回路带载电弧。",
        roleEn: "Safety interlock loop breaking prior to power contacts to prevent load arcing.",
        explodeOffset: [0, 0.58, 0.42],
        accentRole: "gold",
      },
      {
        meshName: "High_Current_Busbars",
        labelZh: "双极高载流镀银主功率端子",
        labelEn: "Dual-Pole High-Ampacity Ag-Plated Busbars",
        roleZh: "大截面积高纯铜镀银接触极，满足 PDU 配电盒与主电源线束持续高载流运行。",
        roleEn: "Heavy-section silver-plated copper contacts rated for continuous PDU power loads.",
        explodeOffset: [0, 0, 0.85],
        accentRole: "gold",
      },
      {
        meshName: "Flange_Gasket",
        labelZh: "面板安装导电/耐油法兰密封垫",
        labelEn: "Panel-Mount Conductive Flange Sealing Gasket",
        roleZh: "嵌槽式平面压缩密封垫，确保机箱开孔贴合面的防水防尘密封。",
        roleEn: "Channel-seated planar gasket sealing the enclosure bulkhead mounting face.",
        explodeOffset: [0, 0, 0.42],
        accentRole: "seal",
      },
    ],
  },
  "oem-cross-reference": {
    id: "oem-cross-reference",
    glbPath: "/assets/models/connector-housings.glb",
    code: "CAD-OEM-XREF",
    nameZh: "主机厂工程图号与 Pin-to-Pin 测绘核验总成",
    nameEn: "OEM Drawing & Pin-to-Pin Cross-Reference Assembly",
    dimensions: "36.4 × 24.8 × 28.2 mm (±0.05 mm)",
    materialZh: "按主机厂图纸规范逐项对标 PBT / PA66 / 铜合金镀层",
    materialEn: "Matched to OEM Spec · PBT / PA66 / Plated Cu Alloy",
    ipRating: "Pin-to-Pin Verified",
    vertexCount: 6420,
    faceCount: 11840,
    parts: [
      {
        meshName: "Housing_Body",
        labelZh: "对插接口与防呆键位基准体",
        labelEn: "Mating Interface & Polarization Keying Body",
        roleZh: "逐项核查对插外形公差、防呆键槽编码角度与主卡扣拔出力匹配度。",
        roleEn: "Verified for mating envelope tolerances, keying slot geometry, and latch retention.",
        explodeOffset: [0, 0, 0],
        accentRole: "housing",
      },
      {
        meshName: "CPA_Lock",
        labelZh: "CPA 锁止位置保持校验件",
        labelEn: "CPA Lock Compatibility Element",
        roleZh: "核验二次锁止行程与整车线束总装检测规范一致性。",
        roleEn: "Checked for CPA travel stroke and harness assembly line inspection compliance.",
        explodeOffset: [0, 0.55, -0.35],
        accentRole: "gold",
      },
      {
        meshName: "TPA_Retainer",
        labelZh: "TPA 端子保持架公差配合件",
        labelEn: "TPA Retainer Fitment Component",
        roleZh: "核对预锁位/终锁位卡点手感及与替代端子的腔体配合间隙。",
        roleEn: "Validated pre-lock and final-lock detents with cross-referenced crimp terminals.",
        explodeOffset: [0, 0, 0.78],
        accentRole: "gold",
      },
      {
        meshName: "Terminal_Pins",
        labelZh: "载流温升与压接工装对标端子",
        labelEn: "Current-Derating & Crimp-Matched Contacts",
        roleZh: "对标接触电阻、温升曲线、镀层厚度及产线现有压接模具兼容性。",
        roleEn: "Cross-checked for contact resistance, thermal derating, and applicator compatibility.",
        explodeOffset: [0, 0, -0.85],
        accentRole: "gold",
      },
      {
        meshName: "Perimeter_Seal",
        labelZh: "耐温与密封压缩率核验垫圈",
        labelEn: "Thermal & Compression-Verified Interface Seal",
        roleZh: "核验冷热冲击后的硅胶回弹性与对插端护套内壁密封过盈量。",
        roleEn: "Verified seal compression ratio and elastomer recovery across thermal shock cycles.",
        explodeOffset: [0, 0, 0.42],
        accentRole: "seal",
      },
    ],
  },
};

const CATEGORY_FALLBACK_IMAGES = {
  "connector-housings": "/assets/editorial/cat-housing.jpg",
  "sealed-heavy-duty": "/assets/editorial/cat-heavy.jpg",
  "terminals-contacts": "/assets/editorial/cat-terminal.jpg",
  "seals-accessories": "/assets/editorial/cat-seal-lock.jpg",
  "power-distribution": "/assets/editorial/cat-heavy.jpg",
  "oem-cross-reference": "/assets/editorial/cat-housing.jpg",
};

function classifyPartRole(part) {
  const rawRole = String(part?.accentRole || "").toLowerCase();
  const meshName = String(part?.meshName || "").toLowerCase();

  if (
    rawRole.includes("gold") ||
    rawRole.includes("accent") ||
    rawRole.includes("metal") ||
    rawRole.includes("brass") ||
    rawRole.includes("terminal") ||
    rawRole.includes("contact") ||
    rawRole.includes("lock")
  ) {
    return "gold";
  }
  if (rawRole.includes("seal") || rawRole.includes("silicone") || rawRole.includes("gasket")) {
    return "seal";
  }
  if (rawRole.includes("housing") || rawRole.includes("body") || rawRole.includes("primary")) {
    return "housing";
  }

  if (/seal|gasket|plug|sws|rib/.test(meshName)) return "seal";
  if (/terminal|pin|contact|busbar|lock|cpa|tpa|latch|lever|wedge|hvil|shield|collar|box|barrel/.test(meshName)) {
    return "gold";
  }
  return "housing";
}

function normalizeOffset(offset) {
  if (Array.isArray(offset) && offset.length >= 3) {
    return [Number(offset[0]) || 0, Number(offset[1]) || 0, Number(offset[2]) || 0];
  }
  if (offset && typeof offset === "object") {
    return [Number(offset.x) || 0, Number(offset.y) || 0, Number(offset.z) || 0];
  }
  return [0, 0, 0];
}

function normalizeKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function ConnectorCadViewer({
  locale = "zh",
  variant = "home", // "home" | "catalog"
  categoryId = "connector-housings",
  onSelectCategory,
  cadModelsMap = null,
  viewerUi = {},
  workbenchCopy = {},
  categoryStatsMap = {},
  representativeItems = [],
  inspectedProduct = null,
  bomItems = [],
  onToggleBom,
  onAddBom,
  onNavigateToCategory,
  onSelectRepresentativeMpn,
  onInquireProduct,
}) {
  const resolvedCategoryId = useMemo(() => {
    const map = cadModelsMap || FALLBACK_CAD_MODELS_BY_CATEGORY;
    if (categoryId && categoryId !== "all" && map[categoryId]) {
      return categoryId;
    }
    if (inspectedProduct?.categoryId && map[inspectedProduct.categoryId]) {
      return inspectedProduct.categoryId;
    }
    return "connector-housings";
  }, [categoryId, cadModelsMap, inspectedProduct]);

  const activeModelMeta = useMemo(() => {
    const externalMeta = cadModelsMap?.[resolvedCategoryId];
    const fallbackMeta =
      FALLBACK_CAD_MODELS_BY_CATEGORY[resolvedCategoryId] ||
      FALLBACK_CAD_MODELS_BY_CATEGORY["connector-housings"];
    if (!externalMeta) return fallbackMeta;
    return {
      ...fallbackMeta,
      ...externalMeta,
      glbPath: externalMeta.glbPath || externalMeta.modelPath || fallbackMeta.glbPath,
      parts:
        Array.isArray(externalMeta.parts) && externalMeta.parts.length > 0
          ? externalMeta.parts
          : fallbackMeta.parts,
    };
  }, [cadModelsMap, resolvedCategoryId]);

  const [renderMode, setRenderMode] = useState("wireframe"); // "wireframe" | "xray" | "solid"
  const [explodePct, setExplodePct] = useState(0);
  const [activePartMesh, setActivePartMesh] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewerState, setViewerState] = useState("ssr"); // "ssr" | "loading" | "ready" | "fallback"
  const [liveMeshStats, setLiveMeshStats] = useState(null);
  const [catalogExpanded, setCatalogExpanded] = useState(true);

  const canvasMountRef = useRef(null);
  const angleReadoutRef = useRef(null);
  const threeCtxRef = useRef(null);
  const loadTokenRef = useRef(0);
  const renderModeRef = useRef(renderMode);
  const activePartRef = useRef(activePartMesh);
  const targetExplodeRef = useRef(0);
  const currentExplodeRef = useRef(0);
  const reducedMotionRef = useRef(false);

  renderModeRef.current = renderMode;
  activePartRef.current = activePartMesh;
  targetExplodeRef.current = explodePct / 100;

  // Reset sub-part isolation when switching 3D assembly model
  useEffect(() => {
    setActivePartMesh(null);
  }, [activeModelMeta.glbPath, resolvedCategoryId]);

  // Apply material mode & active part highlighting instantly across cached sub-meshes
  const syncMaterialsToScene = () => {
    const ctx = threeCtxRef.current;
    if (!ctx || !ctx.meshEntries) return;

    const mode = renderModeRef.current;
    const isolatedMeshName = activePartRef.current;

    for (const entry of ctx.meshEntries) {
      const {
        mesh,
        partMeshName,
        roleType,
        origMaterial,
        blueprintCoreMat,
        blueprintHighlightMat,
        blueprintGhostMat,
        wireOverlay,
        edgeLines,
        xrayMat,
      } = entry;

      const isIsolated = Boolean(isolatedMeshName);
      const isSelectedPart = isIsolated && partMeshName === isolatedMeshName;

      if (mode === "wireframe") {
        if (!isIsolated) {
          mesh.material = blueprintCoreMat;
          wireOverlay.visible = true;
          wireOverlay.material.opacity = roleType === "gold" ? 0.34 : 0.25;
          edgeLines.visible = true;
          edgeLines.material.color.setHex(
            roleType === "gold" ? 0xc4a34c : roleType === "seal" ? 0x0e5a36 : 0x084732
          );
          edgeLines.material.opacity = roleType === "gold" ? 0.95 : 0.86;
        } else if (isSelectedPart) {
          mesh.material = blueprintHighlightMat;
          wireOverlay.visible = true;
          wireOverlay.material.opacity = 0.44;
          edgeLines.visible = true;
          edgeLines.material.color.setHex(0xc4a34c);
          edgeLines.material.opacity = 1.0;
        } else {
          mesh.material = blueprintGhostMat;
          wireOverlay.visible = true;
          wireOverlay.material.opacity = 0.06;
          edgeLines.visible = true;
          edgeLines.material.color.setHex(0x858884);
          edgeLines.material.opacity = 0.2;
        }
      } else if (mode === "xray") {
        mesh.material = xrayMat;
        wireOverlay.visible = roleType === "housing";
        wireOverlay.material.opacity = 0.1;
        edgeLines.visible = true;
        if (isIsolated && !isSelectedPart) {
          xrayMat.opacity = roleType === "housing" ? 0.08 : 0.22;
          edgeLines.material.opacity = 0.16;
        } else {
          xrayMat.opacity =
            roleType === "housing" ? 0.15 : roleType === "seal" ? 0.9 : 0.98;
          edgeLines.material.color.setHex(
            isSelectedPart
              ? 0xc4a34c
              : roleType === "gold"
                ? 0xc4a34c
                : roleType === "seal"
                  ? 0x0e5a36
                  : 0x084732
          );
          edgeLines.material.opacity = roleType === "housing" ? 0.32 : 0.85;
        }
      } else {
        // Studio Solid PBR Mode (PBT-GF30 / Plated Cu Alloy / Die-Cast Al / Silicone)
        if (isIsolated && !isSelectedPart) {
          mesh.material = blueprintGhostMat;
          wireOverlay.visible = false;
          edgeLines.visible = true;
          edgeLines.material.color.setHex(0x858884);
          edgeLines.material.opacity = 0.22;
        } else {
          mesh.material = origMaterial;
          wireOverlay.visible = false;
          edgeLines.visible = true;
          edgeLines.material.color.setHex(
            isSelectedPart ? 0xc4a34c : roleType === "gold" ? 0x9b7b2c : 0x102820
          );
          edgeLines.material.opacity = isSelectedPart ? 0.96 : 0.16;
        }
      }
    }
  };

  useEffect(() => {
    syncMaterialsToScene();
  }, [renderMode, activePartMesh]);

  // Sync auto-rotate toggle to OrbitControls
  useEffect(() => {
    const ctx = threeCtxRef.current;
    if (ctx?.controls) {
      ctx.controls.autoRotate = autoRotate && !reducedMotionRef.current;
    }
  }, [autoRotate]);

  // 1. Lazy-initialize Three.js WebGL stage on client mount (100% SSR safe)
  useEffect(() => {
    if (typeof window === "undefined" || !catalogExpanded) return undefined;
    const mountEl = canvasMountRef.current;
    if (!mountEl) return undefined;

    let cancelled = false;
    let rafId = 0;
    let resizeObserver = null;

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedMotionRef.current = prefersReduced;
    if (prefersReduced) {
      setAutoRotate(false);
    }

    async function initStage() {
      try {
        setViewerState((prev) => (prev === "ready" ? "ready" : "loading"));

        const [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([
          import("three"),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("three/examples/jsm/controls/OrbitControls.js"),
        ]);

        if (cancelled || !canvasMountRef.current) return;

        let renderer;
        try {
          renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          });
        } catch {
          if (!cancelled) setViewerState("fallback");
          return;
        }

        const initW = Math.max(mountEl.clientWidth || 560, 240);
        const initH = Math.max(mountEl.clientHeight || 360, 220);

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(initW, initH, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;

        mountEl.innerHTML = "";
        mountEl.appendChild(renderer.domElement);

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(36, initW / initH, 0.05, 60);
        camera.position.set(2.88, 1.92, 3.22);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.075;
        controls.enablePan = false;
        controls.minDistance = 1.45;
        controls.maxDistance = 7.4;
        controls.maxPolarAngle = Math.PI * 0.82;
        controls.autoRotate = !prefersReduced;
        controls.autoRotateSpeed = 0.65;
        controls.target.set(0, 0.02, 0);

        const stopOrbitOnInteract = () => {
          controls.autoRotate = false;
          setAutoRotate(false);
        };
        controls.addEventListener("start", stopOrbitOnInteract);

        // Precision Industrial Studio Lighting
        const hemiLight = new THREE.HemisphereLight(0xfaf9f5, 0xd4d1c7, 1.45);
        scene.add(hemiLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
        keyLight.position.set(4.5, 6.5, 5.0);
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0xe7c96c, 0.58);
        rimLight.position.set(-4.2, 3.2, -4.5);
        scene.add(rimLight);

        const fillLight = new THREE.DirectionalLight(0xdce8e2, 0.48);
        fillLight.position.set(-2.0, -3.5, 3.0);
        scene.add(fillLight);

        // Engineering Reference Floor Grid & Border Frame
        const floorGroup = new THREE.Group();
        const gridHelper = new THREE.GridHelper(4.6, 23, 0xb5b2a8, 0xd8d6ce);
        if (Array.isArray(gridHelper.material)) {
          gridHelper.material.forEach((m) => {
            m.transparent = true;
            m.opacity = 0.52;
          });
        } else if (gridHelper.material) {
          gridHelper.material.transparent = true;
          gridHelper.material.opacity = 0.52;
        }
        floorGroup.add(gridHelper);

        const borderPts = [
          new THREE.Vector3(-2.3, 0.002, -2.3),
          new THREE.Vector3(2.3, 0.002, -2.3),
          new THREE.Vector3(2.3, 0.002, 2.3),
          new THREE.Vector3(-2.3, 0.002, 2.3),
          new THREE.Vector3(-2.3, 0.002, -2.3),
        ];
        const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
        const borderLine = new THREE.Line(
          borderGeo,
          new THREE.LineBasicMaterial({
            color: 0x084732,
            transparent: true,
            opacity: 0.24,
          })
        );
        floorGroup.add(borderLine);
        floorGroup.position.y = -1.05;
        scene.add(floorGroup);

        const modelAnchor = new THREE.Group();
        scene.add(modelAnchor);

        // Raycaster click-to-select sub-part (distinguishing click vs orbit drag)
        const raycaster = new THREE.Raycaster();
        const pointerDownPos = { x: 0, y: 0 };

        const onPointerDown = (e) => {
          pointerDownPos.x = e.clientX;
          pointerDownPos.y = e.clientY;
        };

        const onPointerUp = (e) => {
          const dx = e.clientX - pointerDownPos.x;
          const dy = e.clientY - pointerDownPos.y;
          if (dx * dx + dy * dy > 25) return; // Was an orbit drag, not a click

          const ctx = threeCtxRef.current;
          if (!ctx?.pickableMeshes?.length) return;

          const rect = renderer.domElement.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;

          const ndc = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );
          raycaster.setFromCamera(ndc, camera);
          const hits = raycaster.intersectObjects(ctx.pickableMeshes, false);
          if (hits.length > 0) {
            const hitPartName = hits[0].object.userData?.partMeshName;
            if (hitPartName) {
              setActivePartMesh((prev) => (prev === hitPartName ? null : hitPartName));
            }
          }
        };

        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointerup", onPointerUp);

        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const w = Math.max(entry.contentRect.width, 200);
            const h = Math.max(entry.contentRect.height, 180);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h, false);
          }
        });
        resizeObserver.observe(mountEl);

        const loader = new GLTFLoader();
        const spherical = new THREE.Spherical();
        const offsetVec = new THREE.Vector3();

        threeCtxRef.current = {
          THREE,
          renderer,
          scene,
          camera,
          controls,
          loader,
          floorGroup,
          modelAnchor,
          meshEntries: [],
          partDrivers: [],
          pickableMeshes: [],
          disposeCurrentModel: null,
        };

        // Trigger initial model load now that stage is ready
        if (threeCtxRef.current.loadModelFn) {
          threeCtxRef.current.loadModelFn();
        }

        const renderLoop = () => {
          if (cancelled) return;
          rafId = window.requestAnimationFrame(renderLoop);

          controls.update();

          // Smoothly interpolate exploded assembly travel
          const targetT = targetExplodeRef.current;
          if (reducedMotionRef.current) {
            currentExplodeRef.current = targetT;
          } else {
            currentExplodeRef.current += (targetT - currentExplodeRef.current) * 0.14;
            if (Math.abs(targetT - currentExplodeRef.current) < 0.0005) {
              currentExplodeRef.current = targetT;
            }
          }

          const t = currentExplodeRef.current;
          const activeCtx = threeCtxRef.current;
          if (activeCtx?.modelAnchor) {
            const fitScale = 1 - t * 0.22;
            activeCtx.modelAnchor.scale.setScalar(fitScale);
            if (activeCtx.floorGroup && typeof activeCtx.baseFloorY === "number") {
              activeCtx.floorGroup.position.y = activeCtx.baseFloorY * fitScale;
            }
          }
          if (activeCtx?.partDrivers) {
            for (const drv of activeCtx.partDrivers) {
              const { nodes, basePositions, offset, leaderLine, leaderPositions, baseCenter } = drv;
              const ox = offset[0] * t;
              const oy = offset[1] * t;
              const oz = offset[2] * t;
              for (let i = 0; i < nodes.length; i += 1) {
                const bp = basePositions[i];
                nodes[i].position.set(bp.x + ox, bp.y + oy, bp.z + oz);
              }
              if (leaderLine && leaderPositions) {
                if (t > 0.015) {
                  leaderLine.visible = true;
                  leaderPositions[3] = baseCenter.x + ox;
                  leaderPositions[4] = baseCenter.y + oy;
                  leaderPositions[5] = baseCenter.z + oz;
                  leaderLine.geometry.attributes.position.needsUpdate = true;
                  leaderLine.material.opacity = Math.min(0.68, t * 0.85);
                } else {
                  leaderLine.visible = false;
                }
              }
            }
          }

          // Update live CAD azimuth / elevation readout via DOM ref (zero React re-renders)
          if (angleReadoutRef.current) {
            offsetVec.copy(camera.position).sub(controls.target);
            spherical.setFromVector3(offsetVec);
            const azimDeg = (((THREE.MathUtils.radToDeg(spherical.theta) % 360) + 360) % 360)
              .toFixed(0)
              .padStart(3, "0");
            const elevDeg = Math.round(90 - THREE.MathUtils.radToDeg(spherical.phi));
            const elevSign = elevDeg >= 0 ? "+" : "";
            angleReadoutRef.current.textContent = `AZ ${azimDeg}° · EL ${elevSign}${elevDeg}°`;
          }

          renderer.render(scene, camera);
        };

        renderLoop();
      } catch {
        if (!cancelled) {
          setViewerState("fallback");
        }
      }
    }

    initStage();

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();

      const ctx = threeCtxRef.current;
      if (ctx) {
        if (ctx.disposeCurrentModel) ctx.disposeCurrentModel();
        ctx.controls?.dispose();
        ctx.scene?.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose?.());
            } else {
              obj.material.dispose?.();
            }
          }
        });
        ctx.renderer?.dispose();
        if (ctx.renderer?.domElement?.parentNode) {
          ctx.renderer.domElement.parentNode.removeChild(ctx.renderer.domElement);
        }
        threeCtxRef.current = null;
      }
    };
  }, [catalogExpanded]);

  // 2. Load & bind GLB assembly whenever activeModelMeta changes
  useEffect(() => {
    if (typeof window === "undefined" || !catalogExpanded) return;

    const loadCurrentGlb = () => {
      const ctx = threeCtxRef.current;
      if (!ctx || !ctx.loader) return;

      const { THREE, loader, modelAnchor, floorGroup } = ctx;
      const myToken = (loadTokenRef.current += 1);
      const glbUrl = activeModelMeta.glbPath;
      const partsList = activeModelMeta.parts || [];

      loader.load(
        glbUrl,
        (gltf) => {
          if (myToken !== loadTokenRef.current || !threeCtxRef.current) {
            // Stale load completed after user switched category; dispose cleanly
            gltf.scene?.traverse((o) => {
              o.geometry?.dispose?.();
            });
            return;
          }

          if (ctx.disposeCurrentModel) {
            ctx.disposeCurrentModel();
          }

          const root = gltf.scene;
          const normWrapper = new THREE.Group();
          normWrapper.add(root);

          // Normalize bounding box to center at origin and fit ~2.35 units
          const rawBox = new THREE.Box3().setFromObject(root);
          const rawSize = new THREE.Vector3();
          const rawCenter = new THREE.Vector3();
          rawBox.getSize(rawSize);
          rawBox.getCenter(rawCenter);

          const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001);
          const normScale = 2.22 / maxDim;
          root.position.set(-rawCenter.x, -rawCenter.y, -rawCenter.z);
          normWrapper.scale.setScalar(normScale);
          normWrapper.updateMatrixWorld(true);

          // Align engineering reference grid snugly beneath normalized model
          const halfHeightScaled = (rawSize.y * normScale) / 2;
          const baseFloorY = -halfHeightScaled - 0.14;
          ctx.baseFloorY = baseFloorY;
          floorGroup.position.y = baseFloorY;

          const disposables = [];
          const meshEntries = [];
          const pickableMeshes = [];
          let totalVerts = 0;
          let totalFaces = 0;

          // Match each Mesh to its configured logical sub-part
          const partByNormKey = new Map();
          for (const p of partsList) {
            partByNormKey.set(normalizeKey(p.meshName), p);
          }

          const resolvePartForObject = (obj) => {
            let cur = obj;
            while (cur && cur !== root) {
              const key = normalizeKey(cur.name);
              if (partByNormKey.has(key)) {
                return { part: partByNormKey.get(key), driverNode: cur };
              }
              for (const [pKey, pObj] of partByNormKey.entries()) {
                if (pKey && key.startsWith(pKey)) {
                  return { part: pObj, driverNode: cur };
                }
              }
              cur = cur.parent;
            }
            return { part: null, driverNode: obj };
          };

          const driverNodesByPart = new Map();
          const allMeshes = [];
          root.traverse((node) => {
            if (node.isMesh && node.geometry) {
              allMeshes.push(node);
            }
          });

          for (const mesh of allMeshes) {
            const geo = mesh.geometry;
            const posAttr = geo.attributes?.position;
            if (posAttr) {
              totalVerts += posAttr.count;
              totalFaces += geo.index
                ? Math.round(geo.index.count / 3)
                : Math.round(posAttr.count / 3);
            }

            const { part, driverNode } = resolvePartForObject(mesh);
            const partMeshName = part?.meshName || mesh.name || "Assembly_Part";
            const roleType = classifyPartRole(part || { meshName: partMeshName });

            mesh.userData.partMeshName = partMeshName;
            pickableMeshes.push(mesh);

            if (part) {
              if (!driverNodesByPart.has(part.meshName)) {
                driverNodesByPart.set(part.meshName, new Set());
              }
              driverNodesByPart.get(part.meshName).add(driverNode);
            }

            // Synthesize authentic automotive Studio Solid PBR material by engineering part role
            const normName = normalizeKey(partMeshName);
            let solidColor = 0x242e2a; // PBT-GF30 / PA66-GF35 matte dark polymer housing
            let solidMetalness = 0.08;
            let solidRoughness = 0.54;

            if (normName.includes("diecast")) {
              solidColor = 0xb2bbb8; // AlSi12 die-cast aluminum flange shell
              solidMetalness = 0.72;
              solidRoughness = 0.33;
            } else if (normName.includes("emc") || normName.includes("collar")) {
              solidColor = 0xd0d6d4; // Nickel/Ag spring shielding collar
              solidMetalness = 0.84;
              solidRoughness = 0.23;
            } else if (normName.includes("cavityblock")) {
              solidColor = 0xdcd7c8; // High-dielectric natural PA66 insert block
              solidMetalness = 0.05;
              solidRoughness = 0.48;
            } else if (
              normName.includes("pin") ||
              normName.includes("contact") ||
              normName.includes("busbar") ||
              normName.includes("barrel")
            ) {
              solidColor = normName.includes("busbar") || normName.includes("power") ? 0xdac488 : 0xd4aa47;
              solidMetalness = 0.86;
              solidRoughness = 0.22;
            } else if (normName.includes("lance") || normName.includes("insulationcrimp")) {
              solidColor = 0xc3a870; // Stamped CuNiSi selective-plated carrier & crimp claws
              solidMetalness = 0.78;
              solidRoughness = 0.28;
            } else if (roleType === "gold") {
              solidColor = 0xc49c42; // Molded amber/gold Poka-Yoke TPA / CPA / Lever / Wedge
              solidMetalness = 0.12;
              solidRoughness = 0.42;
            } else if (roleType === "seal") {
              solidColor = 0x175842; // Automotive FVMQ / VMQ elastomer seal
              solidMetalness = 0.04;
              solidRoughness = 0.36;
            }

            const origMaterial = new THREE.MeshStandardMaterial({
              color: solidColor,
              metalness: solidMetalness,
              roughness: solidRoughness,
              polygonOffset: true,
              polygonOffsetFactor: 1.0,
              polygonOffsetUnits: 1.0,
            });

            // 1. Wireframe Blueprint Core Matte (depth-occluding warm paper plaster)
            const blueprintCoreMat = new THREE.MeshStandardMaterial({
              color:
                roleType === "gold" ? 0xf6f0df : roleType === "seal" ? 0xeaf0ec : 0xf3f2ec,
              roughness: 0.86,
              metalness: 0.04,
              transparent: true,
              opacity: 0.9,
              polygonOffset: true,
              polygonOffsetFactor: 1.5,
              polygonOffsetUnits: 1.5,
            });

            const blueprintHighlightMat = new THREE.MeshStandardMaterial({
              color: 0xe3ede1,
              roughness: 0.72,
              metalness: 0.08,
              transparent: true,
              opacity: 0.96,
              polygonOffset: true,
              polygonOffsetFactor: 1.5,
              polygonOffsetUnits: 1.5,
            });

            const blueprintGhostMat = new THREE.MeshStandardMaterial({
              color: 0xf4f3ef,
              roughness: 0.9,
              metalness: 0.0,
              transparent: true,
              opacity: 0.16,
              depthWrite: false,
              polygonOffset: true,
              polygonOffsetFactor: 1.5,
              polygonOffsetUnits: 1.5,
            });

            // 2. Surface Topology Wireframe Overlay (shares geometry = zero extra vertex buffer!)
            const wireMat = new THREE.MeshBasicMaterial({
              color:
                roleType === "gold" ? 0xb59038 : roleType === "seal" ? 0x1d5c47 : 0x0b4330,
              wireframe: true,
              transparent: true,
              opacity: 0.26,
            });
            const wireOverlay = new THREE.Mesh(geo, wireMat);
            wireOverlay.raycast = () => {}; // Exclude helper overlay from raycasting
            mesh.add(wireOverlay);

            // 3. Precision Feature Crease Edges (EdgesGeometry)
            const edgesGeo = new THREE.EdgesGeometry(geo, 22);
            const edgesMat = new THREE.LineBasicMaterial({
              color:
                roleType === "gold" ? 0xc4a34c : roleType === "seal" ? 0x0e5a36 : 0x084732,
              transparent: true,
              opacity: 0.88,
            });
            const edgeLines = new THREE.LineSegments(edgesGeo, edgesMat);
            edgeLines.raycast = () => {};
            mesh.add(edgeLines);

            // 4. X-Ray Cutaway Material
            const xrayMat = new THREE.MeshStandardMaterial({
              color:
                roleType === "housing"
                  ? 0x0b4330
                  : roleType === "seal"
                    ? 0x1f6e56
                    : 0xcfa74a,
              metalness: roleType === "gold" ? 0.76 : 0.08,
              roughness: roleType === "gold" ? 0.24 : 0.42,
              transparent: true,
              opacity: roleType === "housing" ? 0.15 : roleType === "seal" ? 0.9 : 0.98,
              depthWrite: roleType !== "housing",
            });

            disposables.push(
              origMaterial,
              blueprintCoreMat,
              blueprintHighlightMat,
              blueprintGhostMat,
              wireMat,
              edgesGeo,
              edgesMat,
              xrayMat
            );

            meshEntries.push({
              mesh,
              partMeshName,
              roleType,
              origMaterial,
              blueprintCoreMat,
              blueprintHighlightMat,
              blueprintGhostMat,
              wireOverlay,
              edgeLines,
              xrayMat,
            });
          }

          // Build Exploded-View Drivers & Gold Axis Leader Lines
          const partDrivers = [];
          for (const part of partsList) {
            const matchedSet = driverNodesByPart.get(part.meshName);
            let nodes = matchedSet ? [...matchedSet] : [];

            // Fallback direct lookup by name on root
            if (nodes.length === 0) {
              const direct = root.getObjectByName(part.meshName);
              if (direct) nodes = [direct];
            }
            if (nodes.length === 0) continue;

            // Deduplicate ancestor/descendant overlap so child isn't translated twice
            const topNodes = nodes.filter(
              (candidate) => !nodes.some((other) => other !== candidate && other.getObjectById(candidate.id))
            );

            const offset = normalizeOffset(part.explodeOffset);
            const hasOffset =
              Math.abs(offset[0]) + Math.abs(offset[1]) + Math.abs(offset[2]) > 0.005;

            const basePositions = topNodes.map((n) => n.position.clone());
            const partBox = new THREE.Box3();
            for (const n of topNodes) {
              partBox.expandByObject(n);
            }
            const worldCenter = new THREE.Vector3();
            partBox.getCenter(worldCenter);
            const baseCenter = root.worldToLocal(worldCenter.clone());

            let leaderLine = null;
            let leaderPositions = null;
            if (hasOffset) {
              leaderPositions = new Float32Array([
                baseCenter.x,
                baseCenter.y,
                baseCenter.z,
                baseCenter.x,
                baseCenter.y,
                baseCenter.z,
              ]);
              const leaderGeo = new THREE.BufferGeometry();
              leaderGeo.setAttribute("position", new THREE.BufferAttribute(leaderPositions, 3));
              const leaderMat = new THREE.LineBasicMaterial({
                color: 0xc4a34c,
                transparent: true,
                opacity: 0.62,
              });
              leaderLine = new THREE.Line(leaderGeo, leaderMat);
              leaderLine.visible = false;
              root.add(leaderLine);
              disposables.push(leaderGeo, leaderMat);
            }

            partDrivers.push({
              partMeshName: part.meshName,
              nodes: topNodes,
              basePositions,
              offset,
              baseCenter,
              leaderLine,
              leaderPositions,
            });
          }

          modelAnchor.add(normWrapper);

          ctx.meshEntries = meshEntries;
          ctx.partDrivers = partDrivers;
          ctx.pickableMeshes = pickableMeshes;
          ctx.disposeCurrentModel = () => {
            modelAnchor.remove(normWrapper);
            for (const d of disposables) {
              d.dispose?.();
            }
            root.traverse((obj) => {
              if (obj.geometry) obj.geometry.dispose?.();
              if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
                else obj.material.dispose?.();
              }
            });
            ctx.meshEntries = [];
            ctx.partDrivers = [];
            ctx.pickableMeshes = [];
          };

          setLiveMeshStats({
            vertices: totalVerts || activeModelMeta.vertexCount,
            faces: totalFaces || activeModelMeta.faceCount,
          });
          syncMaterialsToScene();
          setViewerState("ready");
        },
        undefined,
        () => {
          if (myToken === loadTokenRef.current) {
            setViewerState("fallback");
          }
        }
      );
    };

    if (threeCtxRef.current?.loader) {
      loadCurrentGlb();
    } else if (threeCtxRef.current) {
      threeCtxRef.current.loadModelFn = loadCurrentGlb;
    } else {
      // Stage is still dynamically importing Three.js; poll micro-briefly or attach via ref
      const timer = window.setInterval(() => {
        if (threeCtxRef.current?.loader) {
          window.clearInterval(timer);
          loadCurrentGlb();
        }
      }, 40);
      return () => window.clearInterval(timer);
    }
    return undefined;
  }, [activeModelMeta, catalogExpanded]);

  const handleResetView = () => {
    setActivePartMesh(null);
    setExplodePct(0);
    const ctx = threeCtxRef.current;
    if (ctx?.camera && ctx?.controls) {
      ctx.camera.position.set(2.88, 1.92, 3.22);
      ctx.controls.target.set(0, 0.02, 0);
      ctx.controls.update();
    }
  };

  const handleToggleExplode = () => {
    setExplodePct((prev) => (prev >= 50 ? 0 : 100));
  };

  const parts = activeModelMeta.parts || [];
  const selectedPartObj = parts.find((p) => p.meshName === activePartMesh) || null;

  const modelName = locale === "zh" ? activeModelMeta.nameZh : activeModelMeta.nameEn;
  const materialText = locale === "zh" ? activeModelMeta.materialZh : activeModelMeta.materialEn;
  const vertDisplay = liveMeshStats?.vertices || activeModelMeta.vertexCount || 6400;
  const faceDisplay = liveMeshStats?.faces || activeModelMeta.faceCount || 11800;
  const fallbackPhoto =
    CATEGORY_FALLBACK_IMAGES[resolvedCategoryId] || "/assets/editorial/cat-housing.jpg";

  const ui = {
    modeWireframe: viewerUi.modeWireframe || (locale === "zh" ? "CAD 网格线" : "CAD Wireframe"),
    modeXray: viewerUi.modeXray || (locale === "zh" ? "X-Ray 透视" : "X-Ray Cutaway"),
    modeSolid: viewerUi.modeSolid || (locale === "zh" ? "实体材质" : "Studio Solid"),
    explodeToggle: viewerUi.explodeToggle || (locale === "zh" ? "爆炸拆解" : "Explode View"),
    assembleToggle: viewerUi.assembleToggle || (locale === "zh" ? "复位合拢" : "Collapse"),
    explodeSliderLabel:
      viewerUi.explodeSliderLabel || (locale === "zh" ? "装配爆炸拆解" : "Explode Travel"),
    resetCamera: viewerUi.resetCamera || (locale === "zh" ? "视角复位" : "Reset View"),
    dwgCode: viewerUi.dwgCode || (locale === "zh" ? "工程图号" : "DWG NO."),
    envelope: viewerUi.envelope || (locale === "zh" ? "包络尺寸" : "ENVELOPE"),
    topology: viewerUi.topology || (locale === "zh" ? "拓扑网格" : "TOPOLOGY"),
    ipGrade: viewerUi.ipGrade || (locale === "zh" ? "防护/标准" : "IP / SPEC"),
    partsTitle:
      viewerUi.partsTitle ||
      (locale === "zh" ? "装配子部件拆解（点击高亮）" : "Sub-Components (Click to Isolate)"),
    allPartsBtn: viewerUi.allPartsBtn || (locale === "zh" ? "显示全部" : "Show All"),
    interactionHint:
      viewerUi.interactionHint ||
      (locale === "zh"
        ? "拖拽旋转 · 滚轮缩放 · 点击 3D 部件查看职能"
        : "Drag to orbit · Scroll to zoom · Click part"),
    fallbackNotice:
      viewerUi.fallbackNotice ||
      (locale === "zh"
        ? "三维 CAD 拓扑检视基准图（支持 WebGL 环境实时拖拽旋转与爆炸拆解）"
        : "3D CAD Topology Reference Sheet (Interactive WebGL orbit & exploded view)"),
  };

  const categoryCount = categoryStatsMap[resolvedCategoryId] || 0;
  const isCatalogVariant = variant === "catalog";

  const isSkuInBom = inspectedProduct
    ? bomItems.some((b) => b.mpn === inspectedProduct.mpn)
    : false;
  const exVatPrice = inspectedProduct ? Number(inspectedProduct.priceCny || 0) : 0;
  const incVatPrice = exVatPrice * 1.13;

  return (
    <div className="cad-viewer-root">
      {/* Home Variant: 5-Model Architectural Tabs Bar */}
      {!isCatalogVariant && Array.isArray(workbenchCopy.tabs) && workbenchCopy.tabs.length > 0 ? (
        <div
          className="cad-model-tabs-bar"
          role="tablist"
          aria-label={workbenchCopy.title || "3D CAD Models"}
        >
          {workbenchCopy.tabs.map((tab) => {
            const isActive = tab.categoryId === resolvedCategoryId;
            const tabModel =
              cadModelsMap?.[tab.categoryId] || FALLBACK_CAD_MODELS_BY_CATEGORY[tab.categoryId];
            return (
              <button
                key={tab.categoryId}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`cad-model-tab-btn${isActive ? " is-active" : ""}`}
                onClick={() => onSelectCategory?.(tab.categoryId)}
              >
                <span className="cad-tab-top-line">
                  <span className="cad-tab-index">{tab.code}</span>
                  <span className="cad-tab-dwg">{tabModel?.code || ""}</span>
                </span>
                <span className="cad-tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={`cad-workbench-sheet${isCatalogVariant ? " is-catalog-mode" : ""}`}>
        {/* Catalog Variant: Dark Forest Linked Inspector Header */}
        {isCatalogVariant ? (
          <div className="cad-catalog-topbar">
            <div className="cad-catalog-topbar-left">
              <span className="cad-live-dot" aria-hidden="true" />
              <span className="cad-catalog-eyebrow">
                {workbenchCopy.eyebrow ||
                  (locale === "zh" ? "产品 — 3D CAD 实时联动检视栏" : "LIVE MPN — 3D CAD INSPECTOR")}
              </span>
              <h2 className="cad-catalog-headline">
                {workbenchCopy.title ||
                  (locale === "zh"
                    ? "三维结构拓扑与单品参数联动台"
                    : "3D Topology & MPN Specification Linked Stage")}
              </h2>
            </div>
            <button
              type="button"
              className="cad-catalog-toggle-btn"
              aria-expanded={catalogExpanded}
              onClick={() => setCatalogExpanded((prev) => !prev)}
            >
              <span>
                {catalogExpanded
                  ? workbenchCopy.collapseText || (locale === "zh" ? "收起检视台" : "Collapse 3D")
                  : workbenchCopy.expandText || (locale === "zh" ? "展开 3D 检视台" : "Expand 3D")}
              </span>
              {catalogExpanded ? (
                <ChevronUp size={14} aria-hidden="true" />
              ) : (
                <ChevronDown size={14} aria-hidden="true" />
              )}
            </button>
          </div>
        ) : null}

        {(!isCatalogVariant || catalogExpanded) && (
          <div className="cad-workbench-grid">
            {/* LEFT COLUMN: 3D CAD Viewport + Mode Switcher + Explode Slider */}
            <div className="cad-stage-column">
              <div className="cad-stage-toolbar">
                <div
                  className="cad-mode-group"
                  role="group"
                  aria-label={locale === "zh" ? "三维渲染模式" : "3D Render Mode"}
                >
                  <button
                    type="button"
                    className={`cad-mode-btn${renderMode === "wireframe" ? " is-active" : ""}`}
                    aria-pressed={renderMode === "wireframe"}
                    onClick={() => setRenderMode("wireframe")}
                  >
                    <Grid size={13} aria-hidden="true" />
                    <span>{ui.modeWireframe}</span>
                  </button>
                  <button
                    type="button"
                    className={`cad-mode-btn${renderMode === "xray" ? " is-active" : ""}`}
                    aria-pressed={renderMode === "xray"}
                    onClick={() => setRenderMode("xray")}
                  >
                    <Eye size={13} aria-hidden="true" />
                    <span>{ui.modeXray}</span>
                  </button>
                  <button
                    type="button"
                    className={`cad-mode-btn${renderMode === "solid" ? " is-active" : ""}`}
                    aria-pressed={renderMode === "solid"}
                    onClick={() => setRenderMode("solid")}
                  >
                    <Box size={13} aria-hidden="true" />
                    <span>{ui.modeSolid}</span>
                  </button>
                </div>

                <div className="cad-Quick-tools">
                  <button
                    type="button"
                    className={`cad-tool-btn${explodePct > 0 ? " is-active" : ""}`}
                    aria-pressed={explodePct > 0}
                    onClick={handleToggleExplode}
                  >
                    <Layers size={13} aria-hidden="true" />
                    <span>{explodePct >= 50 ? ui.assembleToggle : ui.explodeToggle}</span>
                  </button>
                  <button
                    type="button"
                    className="cad-tool-btn"
                    onClick={handleResetView}
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    <span>{ui.resetCamera}</span>
                  </button>
                </div>
              </div>

              {/* Blueprint Stage Viewport */}
              <div className="cad-canvas-stage">
                <span className="cad-fiducial is-tl" aria-hidden="true" />
                <span className="cad-fiducial is-tr" aria-hidden="true" />
                <span className="cad-fiducial is-bl" aria-hidden="true" />
                <span className="cad-fiducial is-br" aria-hidden="true" />

                <div className="cad-hud-top-left">
                  <span className="cad-hud-dwg-code">
                    {activeModelMeta.code} · {renderMode.toUpperCase()}
                  </span>
                  <span className="cad-hud-model-title">{modelName}</span>
                </div>

                <div className="cad-hud-top-right">
                  <span ref={angleReadoutRef} className="cad-hud-angle-readout">
                    AZ 042° · EL +26°
                  </span>
                  <span className="cad-hud-scale-tag">SCALE 1:1 · Y-UP CAD</span>
                </div>

                {/* SSR / No-JS / Fallback Graceful Engineering Blueprint */}
                <div
                  className={`cad-static-fallback${
                    viewerState === "ready" ? " is-ready-hidden" : ""
                  }`}
                >
                  <div className="cad-fallback-photo-wrap">
                    <img
                      src={fallbackPhoto}
                      alt={modelName}
                      width="306"
                      height="198"
                    />
                  </div>
                  <p className="cad-fallback-caption">{ui.fallbackNotice}</p>
                </div>

                {/* Live Three.js WebGL Mount */}
                <div
                  ref={canvasMountRef}
                  className="cad-canvas-mount"
                  role="img"
                  aria-label={`${modelName} — ${ui.modeWireframe}`}
                />

                {/* Selected Sub-Part Engineering Role Callout */}
                {selectedPartObj ? (
                  <div className="cad-active-part-callout">
                    <div className="cad-callout-body">
                      <div className="cad-callout-title">
                        <span>
                          {locale === "zh" ? selectedPartObj.labelZh : selectedPartObj.labelEn}
                        </span>
                        <span className="cad-callout-mesh">[{selectedPartObj.meshName}]</span>
                      </div>
                      <p className="cad-callout-desc">
                        {locale === "zh" ? selectedPartObj.roleZh : selectedPartObj.roleEn}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="cad-callout-close"
                      onClick={() => setActivePartMesh(null)}
                    >
                      {ui.allPartsBtn}
                    </button>
                  </div>
                ) : null}

                <div className="cad-hud-bottom-bar">
                  <span className="cad-ruler-measure">
                    <span className="cad-ruler-line" aria-hidden="true" />
                    <span>{activeModelMeta.dimensions}</span>
                  </span>
                  <span className="cad-hud-hint">{ui.interactionHint}</span>
                </div>
              </div>

              {/* 0% - 100% Smooth Exploded Assembly Travel Slider */}
              <div className="cad-explode-bar">
                <label className="cad-explode-label-group" htmlFor={`cad-explode-${variant}`}>
                  <span>{ui.explodeSliderLabel}</span>
                  <span className="cad-explode-pct">{explodePct}%</span>
                </label>
                <input
                  id={`cad-explode-${variant}`}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={explodePct}
                  onChange={(e) => setExplodePct(Number(e.target.value))}
                  className="cad-explode-slider"
                />
              </div>

              {/* 4-Cell Engineering Telemetry Strip */}
              <div className="cad-telemetry-strip">
                <div className="cad-telemetry-cell">
                  <span className="cad-telemetry-key">{ui.dwgCode}</span>
                  <span className="cad-telemetry-val">{activeModelMeta.code}</span>
                </div>
                <div className="cad-telemetry-cell">
                  <span className="cad-telemetry-key">{ui.envelope}</span>
                  <span className="cad-telemetry-val">{activeModelMeta.dimensions}</span>
                </div>
                <div className="cad-telemetry-cell">
                  <span className="cad-telemetry-key">{ui.topology}</span>
                  <span className="cad-telemetry-val">
                    {Number(vertDisplay).toLocaleString()} V / {Number(faceDisplay).toLocaleString()} T
                  </span>
                </div>
                <div className="cad-telemetry-cell">
                  <span className="cad-telemetry-key">{ui.ipGrade}</span>
                  <span className="cad-telemetry-val">{activeModelMeta.ipRating}</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Linked SKU Inspector (Catalog Mode) + Interactive Sub-Parts Breakdown */}
            <div className="cad-inspector-column">
              <div>
                {/* Catalog Variant: Synchronized MPN Specification & Direct BOM Action */}
                {isCatalogVariant && inspectedProduct ? (
                  <div className="cad-linked-sku-panel">
                    <div className="cad-sku-badge-row">
                      <span className="cad-sku-active-tag">
                        {workbenchCopy.linkedBadge ||
                          (locale === "zh" ? "当前联动检视料号" : "Active Linked MPN")}
                      </span>
                      <span className="cad-sku-stock-pill">
                        {locale === "zh" ? "常备在库" : "In Stock"}
                      </span>
                    </div>

                    <h3 className="cad-sku-mpn-heading">{inspectedProduct.mpn}</h3>
                    <p className="cad-sku-series-line">
                      {locale === "zh"
                        ? inspectedProduct.brandNameZh
                        : inspectedProduct.brandNameEn}
                      {inspectedProduct.series ? ` · ${inspectedProduct.series}` : ""}
                    </p>

                    <div className="cad-sku-spec-grid">
                      <div className="cad-sku-spec-item">
                        <span>
                          {workbenchCopy.batchLabel ||
                            (locale === "zh" ? "参考批次 (DC)" : "Batch (DC)")}
                        </span>
                        <strong className="mpn-code">
                          {inspectedProduct.batchYear ? `DC ${inspectedProduct.batchYear}` : "Standard"}
                        </strong>
                      </div>
                      <div className="cad-sku-spec-item">
                        <span>
                          {workbenchCopy.packLabel ||
                            (locale === "zh" ? "包装 / 起订 (SPQ/MOQ)" : "Pack (SPQ/MOQ)")}
                        </span>
                        <strong className="mpn-code">
                          {inspectedProduct.spq} / {inspectedProduct.moq} PCS
                        </strong>
                      </div>
                      <div className="cad-sku-spec-item">
                        <span>
                          {workbenchCopy.stockLabel ||
                            (locale === "zh" ? "参考在库数量" : "Ref. Stock Qty")}
                        </span>
                        <strong className="mpn-code">
                          {Number(inspectedProduct.stockQty).toLocaleString()} PCS
                        </strong>
                      </div>
                      <div className="cad-sku-spec-item">
                        <span>
                          {workbenchCopy.priceIncVatLabel ||
                            (locale === "zh" ? "含税参考价 (13% VAT)" : "Incl. 13% VAT Ref.")}
                        </span>
                        <strong className="mpn-code is-gold-price">
                          ¥{incVatPrice.toFixed(4)}{" "}
                          <small style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>
                            ({locale === "zh" ? "未税" : "Ex"} ¥{exVatPrice.toFixed(4)})
                          </small>
                        </strong>
                      </div>
                    </div>

                    <div className="cad-sku-actions-row">
                      <button
                        type="button"
                        className="btn-primary is-compact"
                        onClick={() => {
                          if (onToggleBom) onToggleBom(inspectedProduct);
                          else if (onAddBom) onAddBom(inspectedProduct);
                        }}
                      >
                        {isSkuInBom ? (
                          <Check size={14} aria-hidden="true" />
                        ) : (
                          <Plus size={14} aria-hidden="true" />
                        )}
                        <span>
                          {isSkuInBom
                            ? workbenchCopy.addedBomCta ||
                              (locale === "zh" ? "已加入 BOM 清单" : "Added to BOM List")
                            : workbenchCopy.addBomCta ||
                              (locale === "zh" ? "+ 加入 BOM 清单" : "+ Add to BOM List")}
                        </span>
                      </button>

                      {onInquireProduct ? (
                        <button
                          type="button"
                          className="btn-outline is-compact"
                          onClick={() => onInquireProduct(inspectedProduct)}
                        >
                          <span>
                            {workbenchCopy.inquireMpnCta ||
                              (locale === "zh" ? "直达询价 →" : "Direct RFQ →")}
                          </span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="cad-inspector-head">
                    <div className="cad-inspector-code-row">
                      <span className="cad-inspector-code">{activeModelMeta.code}</span>
                      <span className="cad-inspector-ip-badge">{activeModelMeta.ipRating}</span>
                    </div>
                    <h3 className="cad-inspector-title">{modelName}</h3>
                    <p className="cad-inspector-material">{materialText}</p>
                  </div>
                )}

                {/* Interactive Sub-Components Breakdown */}
                <div className="cad-parts-block">
                  <div className="cad-parts-header">
                    <span className="cad-parts-heading">{ui.partsTitle}</span>
                    {activePartMesh ? (
                      <button
                        type="button"
                        className="cad-parts-reset-btn"
                        onClick={() => setActivePartMesh(null)}
                      >
                        {ui.allPartsBtn}
                      </button>
                    ) : null}
                  </div>

                  <ul className="cad-parts-list">
                    {parts.map((part, idx) => {
                      const isPartActive = activePartMesh === part.meshName;
                      return (
                        <li key={part.meshName}>
                          <button
                            type="button"
                            className={`cad-part-btn${isPartActive ? " is-active" : ""}`}
                            aria-pressed={isPartActive}
                            onClick={() =>
                              setActivePartMesh((prev) =>
                                prev === part.meshName ? null : part.meshName
                              )
                            }
                          >
                            <span className="cad-part-top">
                              <span className="cad-part-name">
                                <span className="mpn-code" style={{ marginRight: 6 }}>
                                  0{idx + 1}
                                </span>
                                {locale === "zh" ? part.labelZh : part.labelEn}
                              </span>
                              <span className="cad-part-mesh-tag">{part.meshName}</span>
                            </span>
                            {!isCatalogVariant || isPartActive ? (
                              <span className="cad-part-role">
                                {locale === "zh" ? part.roleZh : part.roleEn}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Home Variant Footer: Representative Stocked MPNs & Direct Category Filter Jump */}
              {!isCatalogVariant ? (
                <div className="cad-home-stock-footer">
                  {representativeItems.length > 0 ? (
                    <div className="cad-rep-mpn-row">
                      <span className="cad-rep-label">
                        {workbenchCopy.representativeLabel ||
                          (locale === "zh" ? "代表在库型号：" : "Stocked MPNs:")}
                      </span>
                      {representativeItems.slice(0, 3).map((sku) => (
                        <a
                          key={sku.id}
                          href={`/${locale}/products?category=${encodeURIComponent(
                            resolvedCategoryId
                          )}&q=${encodeURIComponent(sku.mpn)}`}
                          className="cad-rep-chip"
                          onClick={(e) => {
                            if (onSelectRepresentativeMpn) {
                              e.preventDefault();
                              onSelectRepresentativeMpn(sku, resolvedCategoryId);
                            }
                          }}
                        >
                          {sku.mpn}
                        </a>
                      ))}
                    </div>
                  ) : null}

                  <a
                    href={`/${locale}/products?category=${encodeURIComponent(resolvedCategoryId)}`}
                    className="btn-primary cad-home-cta-btn"
                    onClick={(e) => {
                      if (onNavigateToCategory) {
                        e.preventDefault();
                        onNavigateToCategory(resolvedCategoryId);
                      }
                    }}
                  >
                    <span>
                      {(
                        workbenchCopy.filterCategoryAction ||
                        (locale === "zh"
                          ? "检索该类 {count} 款在库料号 →"
                          : "Browse {count} Stocked MPNs in Category →")
                      ).replace("{count}", String(categoryCount || ""))}
                    </span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
