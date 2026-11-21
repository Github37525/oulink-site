import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Mail,
  PhoneCall,
  Plus,
  Trash2,
} from "lucide-react";
import { siteContent } from "./content/siteContent.js";
import {
  BRANDS,
  PRODUCT_CATEGORIES,
  PRODUCTS_CATALOG,
  createCatalogApi,
} from "./content/productsCatalog.js";
import { resolveRoute, routeHref } from "./routing.js";
import { Header } from "./components/Header.jsx";
import { Footer } from "./components/Footer.jsx";
import { MpnSearchEngine } from "./components/MpnSearchEngine.jsx";
import { BrandMatrix } from "./components/BrandMatrix.jsx";
import { ProductSpecTable } from "./components/ProductSpecTable.jsx";
import { BomDrawer } from "./components/BomDrawer.jsx";
import { QualityPipeline } from "./components/QualityPipeline.jsx";
import { FaqAccordion } from "./components/FaqAccordion.jsx";

const BOM_STORAGE_KEY = "oulink_bom_v1";

function serializeRowsToText(rows, manualPasteText = "", locale = "zh") {
  const lines = [];
  for (const row of rows) {
    const mpn = String(row.mpn || "").trim();
    if (!mpn) continue;
    const qty = row.qty ? `${row.qty} PCS` : "-";
    const extra = row.leadTime || row.brand || "";
    lines.push(extra ? `${mpn}  |  ${qty}  |  ${extra}` : `${mpn}  |  ${qty}`);
  }
  if (manualPasteText && manualPasteText.trim()) {
    lines.push(manualPasteText.trim());
  }
  if (lines.length === 0) {
    return locale === "zh" ? "（待补充具体连接器料号）" : "(Connector MPNs to be specified)";
  }
  return lines.join("\n");
}

export function App({
  pathname: initialPathname = "/zh",
  customContent,
  customProducts,
  customBrands,
}) {
  const activeContent = customContent || siteContent;
  const activeProducts = customProducts || PRODUCTS_CATALOG;
  const activeBrands = customBrands || BRANDS;

  const [currentPath, setCurrentPath] = useState(initialPathname);
  const [heroQuery, setHeroQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [catalogSort, setCatalogSort] = useState("mpn");
  const [catalogPage, setCatalogPage] = useState(1);
  const [brandsExpanded, setBrandsExpanded] = useState(false);

  const [bomItems, setBomItems] = useState([]);
  const [bomDrawerOpen, setBomDrawerOpen] = useState(false);

  // Solutions role tab state
  const [activeRoleId, setActiveRoleId] = useState("wire-harness");

  // Contact / BOM 01 & 02 states
  const [bomTab, setBomTab] = useState("manual"); // "manual" | "paste"
  const [sampleUntouched, setSampleUntouched] = useState(true);
  const [manualRows, setManualRows] = useState(() => [
    { id: "sample-1", mpn: "368500-1", qty: 2400, leadTime: "现货 / 2周内" },
    { id: "sample-2", mpn: "1928404745", qty: 500, leadTime: "现货核实" },
  ]);

  const [rfqName, setRfqName] = useState("");
  const [rfqCompany, setRfqCompany] = useState("");
  const [rfqContact, setRfqContact] = useState("");
  const [rfqCustomerType, setRfqCustomerType] = useState("harness");
  const [selectedFocuses, setSelectedFocuses] = useState(["spot"]);
  const [rfqBomText, setRfqBomText] = useState("");
  const [rfqMessage, setRfqMessage] = useState("");
  const [rfqConsent, setRfqConsent] = useState(true);
  const [rfqHoneypot, setRfqHoneypot] = useState("");
  const [rfqStatus, setRfqStatus] = useState("idle");
  const [copiedFallback, setCopiedFallback] = useState(false);

  const searchInputRef = useRef(null);

  useEffect(() => {
    setCurrentPath(initialPathname);
  }, [initialPathname]);

  const { locale, route } = resolveRoute(currentPath);
  const localeContent = activeContent[locale] || activeContent.zh;
  const brand = activeContent.brand;
  const contact = activeContent.contact;

  // Keep sample rows localized if still untouched and no real BOM items selected
  useEffect(() => {
    if (sampleUntouched && bomItems.length === 0) {
      const configuredSamples = localeContent.contact?.bomSection?.sampleRows;
      if (Array.isArray(configuredSamples) && configuredSamples.length > 0) {
        setManualRows(
          configuredSamples.map((r, idx) => ({
            id: `sample-${idx + 1}`,
            mpn: r.mpn,
            qty: r.qty,
            leadTime: r.leadTime || "",
          }))
        );
      }
    }
  }, [locale, localeContent, sampleUntouched, bomItems.length]);

  const catalogApi = useMemo(
    () => createCatalogApi(activeProducts, activeBrands),
    [activeProducts, activeBrands]
  );

  const brandMap = useMemo(() => {
    const map = new Map();
    for (const b of catalogApi.brands) {
      map.set(String(b.id).toLowerCase(), b);
      map.set(String(b.slug).toLowerCase(), b);
    }
    return map;
  }, [catalogApi]);

  // Hydrate BOM from localStorage and URL search params on client mount
  useEffect(() => {
    let loadedBom = [];
    try {
      const saved = window.localStorage.getItem(BOM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) loadedBom = parsed;
      }
    } catch {
      loadedBom = [];
    }

    const params = new URLSearchParams(window.location.search);
    const qParam = params.get("q");
    const brandParam = params.get("brand");
    const categoryParam = params.get("category");
    const mpnParam = params.get("mpn");

    if (qParam) {
      setCatalogQuery(qParam);
      setHeroQuery(qParam);
    }
    if (brandParam) {
      setSelectedBrand(brandParam);
    }
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    if (mpnParam) {
      const trimmed = mpnParam.trim();
      if (trimmed && !loadedBom.some((item) => item.mpn === trimmed)) {
        const matched = catalogApi.getProductByMpn(trimmed);
        loadedBom = [
          ...loadedBom,
          {
            mpn: matched ? matched.mpn : trimmed,
            brand: matched
              ? locale === "zh"
                ? matched.brandNameZh
                : matched.brandNameEn
              : locale === "zh"
                ? "待核实 / 替代寻源"
                : "Sourcing / Cross-Ref",
            qty: matched?.moq || 100,
            leadTime: locale === "zh" ? "现货核实" : "Stock check",
          },
        ];
        try {
          window.localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(loadedBom));
        } catch {
          // ignore storage quota errors
        }
      }
    }

    if (loadedBom.length > 0) {
      setBomItems(loadedBom);
    }

    const onPopState = () => {
      setCurrentPath(window.location.pathname);
      const nextParams = new URLSearchParams(window.location.search);
      setCatalogQuery(nextParams.get("q") || "");
      setSelectedBrand(nextParams.get("brand") || "all");
      setSelectedCategory(nextParams.get("category") || "all");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Update document title & html lang on client-side SPA navigation
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    const meta =
      route === "notFound"
        ? {
            title: `${localeContent.notFound.title} — ${
              locale === "zh" ? brand.fullNameZh : brand.fullNameEn
            }`,
          }
        : localeContent.routes[route] || localeContent.routes.home;
    if (meta?.title) {
      document.title = meta.title;
    }
  }, [locale, route, localeContent, brand]);

  const persistBom = (nextItems) => {
    setBomItems(nextItems);
    try {
      window.localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(nextItems));
    } catch {
      // ignore storage errors
    }
  };

  const handleAddBom = (product) => {
    const existing = bomItems.find((entry) => entry.mpn === product.mpn);
    if (existing) {
      return;
    }
    const next = [
      ...bomItems,
      {
        mpn: product.mpn,
        brand: locale === "zh" ? product.brandNameZh : product.brandNameEn,
        qty: product.moq || product.spq || 100,
        leadTime: locale === "zh" ? "现货核实" : "Stock check",
      },
    ];
    persistBom(next);
  };

  const handleToggleBom = (product) => {
    const exists = bomItems.some((entry) => entry.mpn === product.mpn);
    if (exists) {
      persistBom(bomItems.filter((entry) => entry.mpn !== product.mpn));
    } else {
      handleAddBom(product);
    }
  };

  const handleUpdateBomQty = (mpn, rawVal) => {
    const parsed = Number.parseInt(String(rawVal), 10);
    const qty = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    persistBom(bomItems.map((item) => (item.mpn === mpn ? { ...item, qty } : item)));
  };

  const handleUpdateBomField = (idx, field, value) => {
    if (bomItems.length > 0) {
      const next = bomItems.map((item, i) => {
        if (i !== idx) return item;
        if (field === "qty") {
          const parsed = Number.parseInt(String(value), 10);
          return { ...item, qty: Number.isFinite(parsed) && parsed > 0 ? parsed : 1 };
        }
        return { ...item, [field]: value };
      });
      persistBom(next);
    } else {
      setSampleUntouched(false);
      setManualRows((prev) =>
        prev.map((row, i) => {
          if (i !== idx) return row;
          if (field === "qty") {
            const parsed = Number.parseInt(String(value), 10);
            return { ...row, qty: Number.isFinite(parsed) && parsed > 0 ? parsed : 1 };
          }
          return { ...row, [field]: value };
        })
      );
    }
  };

  const handleAddContactRow = () => {
    const defaultLead = locale === "zh" ? "现货核实" : "Stock check";
    if (bomItems.length > 0) {
      persistBom([
        ...bomItems,
        { mpn: "", brand: "", qty: 100, leadTime: defaultLead },
      ]);
    } else {
      setSampleUntouched(false);
      setManualRows((prev) => [
        ...prev,
        { id: `row-${Date.now()}`, mpn: "", qty: 100, leadTime: defaultLead },
      ]);
    }
  };

  const handleRemoveContactRow = (idx) => {
    if (bomItems.length > 0) {
      const next = bomItems.filter((_, i) => i !== idx);
      persistBom(next);
    } else {
      setSampleUntouched(false);
      setManualRows((prev) => {
        const filtered = prev.filter((_, i) => i !== idx);
        return filtered.length > 0
          ? filtered
          : [{ id: `row-${Date.now()}`, mpn: "", qty: 100, leadTime: "" }];
      });
    }
  };

  const handleRemoveBomItem = (mpn) => {
    persistBom(bomItems.filter((item) => item.mpn !== mpn));
  };

  const handleClearBom = () => {
    persistBom([]);
  };

  const navigateTo = (href) => {
    if (typeof window === "undefined") return;
    const url = new URL(href, window.location.origin);
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
    setCurrentPath(url.pathname);
    const q = url.searchParams.get("q");
    const b = url.searchParams.get("brand");
    const c = url.searchParams.get("category");
    if (q !== null) setCatalogQuery(q);
    if (b !== null) setSelectedBrand(b);
    else if (url.pathname.endsWith("/products") && !url.search) setSelectedBrand("all");
    if (c !== null) setSelectedCategory(c);
    else if (url.pathname.endsWith("/products") && !url.search) setSelectedCategory("all");
    setCatalogPage(1);

    if (url.hash) {
      setTimeout(() => {
        const target = document.querySelector(url.hash);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const handleInlineLink = (href) => (event) => {
    if (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      if (href.startsWith("#")) {
        event.preventDefault();
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: "smooth" });
        return;
      }
      event.preventDefault();
      navigateTo(href);
    }
  };

  const handleRequestCustomMpn = (mpnString) => {
    const cleanMpn = String(mpnString || "").trim();
    if (cleanMpn && !bomItems.some((entry) => entry.mpn === cleanMpn)) {
      const next = [
        ...bomItems,
        {
          mpn: cleanMpn,
          brand: locale === "zh" ? "定制寻源 / 替代评估" : "Custom Sourcing / Cross-Ref",
          qty: 100,
          leadTime: locale === "zh" ? "待评估" : "TBD",
        },
      ];
      persistBom(next);
    }
    setSelectedFocuses(["cross_ref"]);
    navigateTo(routeHref(locale, "contact"));
  };

  const handleTriggerSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      navigateTo(routeHref(locale, "products"));
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  };

  const toggleFocusChip = (val) => {
    setSelectedFocuses((prev) => {
      if (prev.includes(val)) {
        return prev.length > 1 ? prev.filter((x) => x !== val) : prev;
      }
      return [...prev, val];
    });
  };

  // Search computations
  const heroSearchResults = useMemo(() => {
    if (!heroQuery.trim()) return null;
    return catalogApi.searchProducts(heroQuery, { page: 1, pageSize: 8 });
  }, [catalogApi, heroQuery]);

  const standingStockItems = useMemo(() => {
    const preferredMpns = localeContent.homeSections?.standingStockSection?.featuredMpns || [];
    const resolved = [];
    const seen = new Set();
    for (const mpn of preferredMpns) {
      const hit = catalogApi.getProductByMpn(mpn);
      if (hit && !seen.has(hit.id)) {
        seen.add(hit.id);
        resolved.push(hit);
      }
    }
    if (resolved.length < 5) {
      for (const fallbackItem of catalogApi.getFeaturedProducts(8)) {
        if (!seen.has(fallbackItem.id)) {
          seen.add(fallbackItem.id);
          resolved.push(fallbackItem);
        }
        if (resolved.length >= 6) break;
      }
    }
    return resolved.slice(0, 6);
  }, [catalogApi, localeContent]);

  const mappedSortKey =
    catalogSort === "stock_desc"
      ? "stock-desc"
      : catalogSort === "price_asc"
        ? "price-asc"
        : "";

  const catalogResult = useMemo(
    () =>
      catalogApi.searchProducts(catalogQuery, {
        brandId: selectedBrand,
        categoryId: selectedCategory,
        sortBy: mappedSortKey,
        page: catalogPage,
        pageSize: 20,
      }),
    [catalogApi, catalogQuery, selectedBrand, selectedCategory, mappedSortKey, catalogPage]
  );

  const activeBrandObj =
    selectedBrand && selectedBrand !== "all"
      ? brandMap.get(String(selectedBrand).toLowerCase())
      : null;

  // Active BOM rows displayed on /contact
  const activeContactRows = bomItems.length > 0 ? bomItems : manualRows;
  const nonEmptyContactRows = activeContactRows.filter((r) => String(r.mpn || "").trim().length > 0);
  const effectiveBomText = useMemo(
    () => serializeRowsToText(nonEmptyContactRows, bomTab === "paste" ? rfqBomText : "", locale),
    [nonEmptyContactRows, bomTab, rfqBomText, locale]
  );

  const primaryInquiryType = selectedFocuses[0] || "bom";

  const handleRfqSubmit = async (event) => {
    event.preventDefault();
    const hasBomOrNotes =
      nonEmptyContactRows.length > 0 ||
      rfqBomText.trim().length >= 3 ||
      rfqMessage.trim().length >= 5;
    if (!rfqName.trim() || rfqContact.trim().length < 5 || !hasBomOrNotes || !rfqConsent) {
      setRfqStatus("validation_error");
      return;
    }

    setRfqStatus("submitting");
    const submittedItems = nonEmptyContactRows.map((r) => ({
      mpn: String(r.mpn || "").trim(),
      qty: Number(r.qty) || 100,
      brand: r.brand || r.leadTime || "",
    }));

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rfqName.trim(),
          company: rfqCompany.trim(),
          contact: rfqContact.trim(),
          customerType: rfqCustomerType,
          inquiryType: primaryInquiryType,
          bomItems: submittedItems,
          bomText: effectiveBomText,
          message:
            selectedFocuses.length > 0
              ? `[${selectedFocuses.join(", ")}] ${rfqMessage.trim()}`.trim()
              : rfqMessage.trim(),
          consent: rfqConsent,
          website: rfqHoneypot,
          locale,
          source: currentPath,
        }),
      });
      if (res.ok) {
        setRfqStatus("success");
      } else {
        setRfqStatus("fallback");
      }
    } catch {
      setRfqStatus("fallback");
    }
  };

  const formattedRfqSummary = useMemo(() => {
    const summaryLines = [
      locale === "zh"
        ? `【上海欧连电子 BOM 询价单】`
        : `[Ou-Link Electronics BOM RFQ]`,
      `${locale === "zh" ? "联系人" : "Contact"}: ${rfqName || "-"} (${rfqCompany || "-"})`,
      `${locale === "zh" ? "电话/邮箱" : "Phone/Email"}: ${rfqContact || "-"}`,
      `--- BOM ---`,
      effectiveBomText,
    ];
    if (rfqMessage.trim()) {
      summaryLines.push(`--- Notes ---`, rfqMessage.trim());
    }
    return summaryLines.join("\n");
  }, [locale, rfqName, rfqCompany, rfqContact, effectiveBomText, rfqMessage]);

  const mailtoHref = useMemo(() => {
    const subject =
      locale === "zh"
        ? `[官网 BOM 询价] ${rfqCompany || rfqName || "汽车连接器配单需求"}`
        : `[Website BOM RFQ] ${rfqCompany || rfqName || "Automotive Connector Inquiry"}`;
    return `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      formattedRfqSummary
    )}`;
  }, [locale, contact.email, rfqCompany, rfqName, formattedRfqSummary]);

  const handleCopyFallback = async () => {
    try {
      await navigator.clipboard.writeText(formattedRfqSummary);
      setCopiedFallback(true);
      setTimeout(() => setCopiedFallback(false), 2400);
    } catch {
      setCopiedFallback(false);
    }
  };

  // Sidebar brand list expansion logic
  const visibleSidebarBrands = useMemo(() => {
    const all = catalogApi.brands;
    if (brandsExpanded || all.length <= 8) return all;
    const top8 = all.slice(0, 8);
    if (
      selectedBrand !== "all" &&
      !top8.some((b) => b.slug.toLowerCase() === String(selectedBrand).toLowerCase())
    ) {
      return all;
    }
    return top8;
  }, [catalogApi.brands, brandsExpanded, selectedBrand]);

  const solutionsCopy = localeContent.solutions;
  const activeRoleTab =
    solutionsCopy?.roleTabs?.find((t) => t.id === activeRoleId) ||
    solutionsCopy?.roleTabs?.[0];

  const aboutCopy = localeContent.about;
  const contactCopy = localeContent.contact;
  const productsCopy = localeContent.productsPage;

  return (
    <div className="site-shell">
      <a href="#main-content" className="skip-link">
        {localeContent.accessibility.skip}
      </a>

      <Header
        locale={locale}
        route={route}
        pathname={currentPath}
        brand={brand}
        contact={contact}
        localeContent={localeContent}
        bomCount={bomItems.length}
        onNavigate={navigateTo}
        onTriggerSearch={handleTriggerSearch}
      />

      <main id="main-content">
        {/* =================================================================
            PAGE 1: HOME (/zh, /en)
        ================================================================= */}
        {route === "home" && (
          <>
            {/* 1. Editorial Split Hero */}
            <section className="editorial-hero is-home-hero">
              <div className="ou-container hero-split-grid">
                <div className="hero-copy-col">
                  <div className="editorial-eyebrow-tick">
                    <span>{localeContent.hero.eyebrow}</span>
                  </div>
                  <h1>{localeContent.hero.title}</h1>
                  <p className="hero-lead">{localeContent.hero.subtitle}</p>

                  <div className="hero-cta-row">
                    <a
                      href="#authorized-brands"
                      className="btn-primary"
                      onClick={handleInlineLink("#authorized-brands")}
                    >
                      <span>{localeContent.hero.primaryCta}</span>
                    </a>
                    <a
                      href={routeHref(locale, "contact")}
                      className="btn-outline"
                      onClick={handleInlineLink(routeHref(locale, "contact"))}
                    >
                      <span>{localeContent.hero.secondaryCta}</span>
                    </a>
                  </div>

                  <MpnSearchEngine
                    locale={locale}
                    mode="hero"
                    query={heroQuery}
                    onQueryChange={setHeroQuery}
                    searchResults={heroSearchResults}
                    mpnCopy={localeContent.mpnSearch}
                    bomItems={bomItems}
                    onAddBom={handleAddBom}
                    onRequestCustomMpn={handleRequestCustomMpn}
                    onNavigate={navigateTo}
                    inputRef={searchInputRef}
                  />
                </div>

                <div className="hero-media-col">
                  <div className="editorial-photo-frame is-home-hero-photo">
                    <img
                      src={localeContent.hero.imagePath}
                      alt={localeContent.hero.title}
                      width="480"
                      height="504"
                    />
                    {localeContent.hero.imageBadge ? (
                      <span className="photo-corner-badge">
                        {localeContent.hero.imageBadge}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Deep Forest Green Full-Bleed Capability Strip (13+ Years + 4 Pillars) */}
            {localeContent.hero.statsStrip ? (
              <section className="forest-stats-band">
                <div className="ou-container forest-stats-grid">
                  <div className="forest-years-cell">
                    <div className="forest-years-num-line">
                      <strong className="forest-gold-num mpn-code">
                        {localeContent.hero.statsStrip.yearsValue}
                      </strong>
                      {localeContent.hero.statsStrip.yearsUnit ? (
                        <span className="forest-years-unit">
                          {localeContent.hero.statsStrip.yearsUnit}
                        </span>
                      ) : null}
                    </div>
                    <span className="forest-years-caption">
                      {localeContent.hero.statsStrip.yearsLabel}
                    </span>
                  </div>

                  {localeContent.hero.statsStrip.items.map((item, idx) => (
                    <div key={idx} className="forest-capability-cell">
                      <strong>{item.title}</strong>
                      <span>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* 3. Brand Matrix (5 Authorized + 12 Partner = 17 Partner Brand SVGs) */}
            <section id="authorized-brands" className="ou-section">
              <div className="ou-container">
                <BrandMatrix
                  locale={locale}
                  brands={catalogApi.brands}
                  brandCopy={localeContent.brandMatrix}
                  onSelectBrand={(slug, targetHref) => {
                    setSelectedBrand(slug);
                    navigateTo(targetHref);
                  }}
                  onNavigate={navigateTo}
                />
              </div>
            </section>

            {/* 4. Component Categories (4 Real Photography Cards) */}
            {localeContent.homeSections?.categoriesSection ? (
              <section className="ou-section is-bordered-top">
                <div className="ou-container">
                  <div className="editorial-section-head">
                    <div>
                      <span className="gold-top-rule" aria-hidden="true" />
                      <h2>{localeContent.homeSections.categoriesSection.title}</h2>
                    </div>
                    <a
                      href={routeHref(locale, "products")}
                      className="editorial-text-link"
                      onClick={handleInlineLink(routeHref(locale, "products"))}
                    >
                      {localeContent.homeSections.categoriesSection.actionText}
                    </a>
                  </div>

                  <div className="category-editorial-grid">
                    {localeContent.homeSections.categoriesSection.cards.map((cat) => {
                      const catHref = `${routeHref(locale, "products")}?category=${encodeURIComponent(
                        cat.categoryId
                      )}`;
                      return (
                        <a
                          key={cat.categoryId}
                          href={catHref}
                          className="category-editorial-item"
                          onClick={handleInlineLink(catHref)}
                        >
                          <div className="editorial-photo-frame is-category-photo">
                            <img
                              src={cat.imagePath}
                              alt={cat.title}
                              width="306"
                              height="198"
                            />
                            {cat.imageBadge ? (
                              <span className="photo-corner-badge is-mini">
                                {cat.imageBadge}
                              </span>
                            ) : null}
                          </div>
                          <div className="category-item-body">
                            <h3>{cat.title}</h3>
                            <p>{cat.desc}</p>
                            <span className="category-item-link">
                              {cat.actionText ||
                                localeContent.homeSections.categoriesSection.cardAction}
                            </span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </section>
            ) : null}

            {/* 5. Engineering Synergy Split (Left Harness Photo + Right 3 Points & Audiences) */}
            {localeContent.homeSections?.engineeringSection ? (
              <section className="ou-section ou-section-warm">
                <div className="ou-container engineering-home-split">
                  <div className="editorial-photo-frame is-harness-photo">
                    <img
                      src={localeContent.homeSections.engineeringSection.imagePath}
                      alt={localeContent.homeSections.engineeringSection.title}
                      width="513"
                      height="267"
                    />
                    {localeContent.homeSections.engineeringSection.imageBadge ? (
                      <span className="photo-corner-badge">
                        {localeContent.homeSections.engineeringSection.imageBadge}
                      </span>
                    ) : null}
                  </div>

                  <div className="engineering-home-copy">
                    <span className="gold-top-rule" aria-hidden="true" />
                    <h2>{localeContent.homeSections.engineeringSection.title}</h2>
                    <p className="engineering-home-lead">
                      {localeContent.homeSections.engineeringSection.subtitle}
                    </p>

                    <ul className="editorial-check-list">
                      {localeContent.homeSections.engineeringSection.points.map((pt, idx) => (
                        <li key={idx}>
                          <Check size={15} className="check-icon-forest" aria-hidden="true" />
                          <div>
                            <strong>{pt.title}</strong>
                            <span>{pt.desc}</span>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="engineering-home-action">
                      <a
                        href={routeHref(locale, "solutions")}
                        className="editorial-text-link is-strong"
                        onClick={handleInlineLink(routeHref(locale, "solutions"))}
                      >
                        {localeContent.homeSections.engineeringSection.actionText}
                      </a>
                    </div>

                    <div className="audiences-hairline-bar">
                      {localeContent.homeSections.engineeringSection.audiencesLine}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {/* 6. Standing Stock Quick Entry (Left Intro + Right Compact MPN Table) */}
            {localeContent.homeSections?.standingStockSection ? (
              <section className="ou-section">
                <div className="ou-container standing-stock-split">
                  <div className="standing-stock-intro">
                    <span className="gold-top-rule" aria-hidden="true" />
                    <h2>{localeContent.homeSections.standingStockSection.title}</h2>
                    <p>{localeContent.homeSections.standingStockSection.subtitle}</p>
                    <a
                      href={routeHref(locale, "products")}
                      className="editorial-text-link is-strong"
                      onClick={handleInlineLink(routeHref(locale, "products"))}
                    >
                      {localeContent.homeSections.standingStockSection.actionText}
                    </a>
                  </div>

                  <div className="standing-stock-table-wrap">
                    <div className="table-scroll-wrap">
                      <table className="compact-mpn-table">
                        <thead>
                          <tr>
                            <th scope="col">
                              {localeContent.homeSections.standingStockSection.tableHeaders.mpn}
                            </th>
                            <th scope="col">
                              {localeContent.homeSections.standingStockSection.tableHeaders.brand}
                            </th>
                            <th scope="col">
                              {localeContent.homeSections.standingStockSection.tableHeaders.category}
                            </th>
                            <th scope="col" className="num-col">
                              {localeContent.homeSections.standingStockSection.tableHeaders.action}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {standingStockItems.map((item) => {
                            const added = bomItems.some((b) => b.mpn === item.mpn);
                            return (
                              <tr key={item.id} className={added ? "is-selected" : undefined}>
                                <td className="mpn-code compact-mpn-primary">{item.mpn}</td>
                                <td>{locale === "zh" ? item.brandNameZh : item.brandNameEn}</td>
                                <td className="compact-cat-col">
                                  {locale === "zh" ? item.categoryZh : item.categoryEn}
                                </td>
                                <td className="num-col">
                                  <button
                                    type="button"
                                    className={`add-bom-btn is-sm${added ? " is-added" : ""}`}
                                    onClick={() => handleToggleBom(item)}
                                  >
                                    {added ? (
                                      <Check size={12} aria-hidden="true" />
                                    ) : (
                                      <Plus size={12} aria-hidden="true" />
                                    )}
                                    <span>
                                      {added
                                        ? localeContent.homeSections.standingStockSection.addedBomText
                                        : localeContent.homeSections.standingStockSection.addBomText}
                                    </span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="compact-table-disclaimer">
                      {localeContent.homeSections.standingStockSection.disclaimer}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {/* 7. Bottom Sage-Stone CTA Strip */}
            {localeContent.homeSections?.bottomCta ? (
              <section className="bottom-cta-strip">
                <div className="ou-container bottom-cta-inner">
                  <div className="bottom-cta-copy">
                    {localeContent.homeSections.bottomCta.eyebrow ? (
                      <span className="bottom-cta-eyebrow">
                        {localeContent.homeSections.bottomCta.eyebrow}
                      </span>
                    ) : null}
                    <h2>{localeContent.homeSections.bottomCta.title}</h2>
                  </div>
                  <a
                    href={routeHref(locale, "contact")}
                    className="btn-primary"
                    onClick={handleInlineLink(routeHref(locale, "contact"))}
                  >
                    <span>{localeContent.homeSections.bottomCta.buttonText}</span>
                  </a>
                </div>
              </section>
            ) : null}
          </>
        )}

        {/* =================================================================
            PAGE 2: PRODUCTS & MPN DIRECTORY (/zh/products, /en/products)
        ================================================================= */}
        {route === "products" && (
          <>
            <section className="editorial-hero is-subpage-hero">
              <div className="ou-container">
                <nav className="breadcrumb-bar" aria-label="Breadcrumb">
                  <a
                    href={routeHref(locale, "home")}
                    onClick={handleInlineLink(routeHref(locale, "home"))}
                  >
                    {localeContent.breadcrumbs?.home || localeContent.nav.home}
                  </a>
                  <span aria-hidden="true">/</span>
                  <span>{localeContent.breadcrumbs?.products || localeContent.nav.products}</span>
                </nav>

                <div className="subpage-hero-split">
                  <div className="subpage-hero-copy">
                    <h1>{productsCopy.heading}</h1>
                    <p className="hero-lead">{productsCopy.lead}</p>

                    <MpnSearchEngine
                      locale={locale}
                      mode="catalog"
                      query={catalogQuery}
                      onQueryChange={(val) => {
                        setCatalogQuery(val);
                        setCatalogPage(1);
                      }}
                      mpnCopy={localeContent.mpnSearch}
                      catalogCopy={productsCopy}
                      bomItems={bomItems}
                      onAddBom={handleAddBom}
                      onRequestCustomMpn={handleRequestCustomMpn}
                      onNavigate={navigateTo}
                      inputRef={searchInputRef}
                    />
                  </div>

                  <div className="subpage-hero-media">
                    <div className="editorial-photo-frame is-products-hero-photo">
                      <img
                        src={productsCopy.heroImagePath}
                        alt={productsCopy.heading}
                        width="627"
                        height="339"
                      />
                      {productsCopy.heroImageBadge ? (
                        <span className="photo-corner-badge">
                          {productsCopy.heroImageBadge}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="ou-section is-catalog-body">
              <div className="ou-container catalog-layout-grid">
                {/* Left Sidebar Filter */}
                <aside className="catalog-sidebar" aria-label={productsCopy.sidebar?.filterTitle}>
                  <div className="sidebar-header-row">
                    <strong>{productsCopy.sidebar?.filterTitle}</strong>
                    <button
                      type="button"
                      className="sidebar-reset-btn"
                      onClick={() => {
                        setCatalogQuery("");
                        setSelectedBrand("all");
                        setSelectedCategory("all");
                        setCatalogSort("mpn");
                        setCatalogPage(1);
                      }}
                    >
                      {productsCopy.sidebar?.resetButton}
                    </button>
                  </div>

                  <div className="sidebar-filter-group">
                    <h2 className="sidebar-group-title">{productsCopy.sidebar?.brandTitle}</h2>
                    <ul className="sidebar-check-list">
                      <li>
                        <button
                          type="button"
                          className={`sidebar-filter-item${
                            selectedBrand === "all" ? " is-active" : ""
                          }`}
                          onClick={() => {
                            setSelectedBrand("all");
                            setCatalogPage(1);
                          }}
                        >
                          <span className="filter-box-indicator" aria-hidden="true" />
                          <span className="filter-item-name">{productsCopy.allBrandsLabel}</span>
                          <span className="filter-item-count tabular-num">
                            {catalogApi.stats.totalSkus}
                          </span>
                        </button>
                      </li>
                      {visibleSidebarBrands.map((b) => {
                        const isActive =
                          String(selectedBrand).toLowerCase() === String(b.slug).toLowerCase();
                        return (
                          <li key={b.id}>
                            <button
                              type="button"
                              className={`sidebar-filter-item${isActive ? " is-active" : ""}`}
                              onClick={() => {
                                setSelectedBrand(isActive ? "all" : b.slug);
                                setCatalogPage(1);
                              }}
                            >
                              <span className="filter-box-indicator" aria-hidden="true" />
                              <span className="filter-item-name">
                                {locale === "zh" ? b.nameZh : b.nameEn}
                              </span>
                              <span className="filter-item-count tabular-num">{b.skuCount}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {catalogApi.brands.length > 8 ? (
                      <button
                        type="button"
                        className="sidebar-expand-btn"
                        onClick={() => setBrandsExpanded((prev) => !prev)}
                      >
                        {brandsExpanded
                          ? productsCopy.sidebar?.collapseBrandsText
                          : productsCopy.sidebar?.expandBrandsText}
                      </button>
                    ) : null}
                  </div>

                  <div className="sidebar-filter-group">
                    <h2 className="sidebar-group-title">{productsCopy.sidebar?.categoryTitle}</h2>
                    <ul className="sidebar-check-list">
                      <li>
                        <button
                          type="button"
                          className={`sidebar-filter-item${
                            selectedCategory === "all" ? " is-active" : ""
                          }`}
                          onClick={() => {
                            setSelectedCategory("all");
                            setCatalogPage(1);
                          }}
                        >
                          <span className="filter-box-indicator" aria-hidden="true" />
                          <span className="filter-item-name">
                            {productsCopy.allCategoriesLabel}
                          </span>
                        </button>
                      </li>
                      {(PRODUCT_CATEGORIES || catalogApi.categories).map((cat) => {
                        const isActive = selectedCategory === cat.id;
                        return (
                          <li key={cat.id}>
                            <button
                              type="button"
                              className={`sidebar-filter-item${isActive ? " is-active" : ""}`}
                              onClick={() => {
                                setSelectedCategory(isActive ? "all" : cat.id);
                                setCatalogPage(1);
                              }}
                            >
                              <span className="filter-box-indicator" aria-hidden="true" />
                              <span className="filter-item-name">
                                {locale === "zh" ? cat.nameZh : cat.nameEn}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="sidebar-support-box">
                    <span>{productsCopy.sidebar?.supportPromptTitle}</span>
                    <button
                      type="button"
                      className="editorial-text-link is-button"
                      onClick={() => handleRequestCustomMpn(catalogQuery)}
                    >
                      {productsCopy.sidebar?.supportPromptAction}
                    </button>
                  </div>
                </aside>

                {/* Right Main Catalog Data Sheet */}
                <div className="catalog-main-col">
                  <div className="catalog-toolbar">
                    <div className="catalog-count-display">
                      <strong className="gold-count-num mpn-code">{catalogResult.total}</strong>
                      <span>{productsCopy.countUnit}</span>
                      {activeBrandObj ? (
                        <span className="active-filter-tag">
                          {locale === "zh" ? activeBrandObj.nameZh : activeBrandObj.nameEn}
                        </span>
                      ) : null}
                    </div>

                    <div className="catalog-sort-wrap">
                      <select
                        className="catalog-sort-select"
                        aria-label={productsCopy.sortLabel}
                        value={catalogSort}
                        onChange={(e) => {
                          setCatalogSort(e.target.value);
                          setCatalogPage(1);
                        }}
                      >
                        {(productsCopy.sortOptions || []).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <ProductSpecTable
                    locale={locale}
                    items={catalogResult.items}
                    tableCopy={productsCopy}
                    mpnCopy={localeContent.mpnSearch}
                    bomItems={bomItems}
                    onAddBom={handleAddBom}
                    onToggleBom={handleToggleBom}
                    onRequestCustomMpn={handleRequestCustomMpn}
                    activeQuery={catalogQuery}
                    activeBrandName={
                      activeBrandObj
                        ? locale === "zh"
                          ? activeBrandObj.nameZh
                          : activeBrandObj.nameEn
                        : ""
                    }
                    pagination={{
                      page: catalogResult.page,
                      totalPages: catalogResult.totalPages,
                      total: catalogResult.total,
                      onPageChange: (nextP) => {
                        setCatalogPage(nextP);
                        window.scrollTo({ top: 240, behavior: "smooth" });
                      },
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Bottom Kitting Showcase (4 Photography Cards) */}
            {productsCopy.kittingSection ? (
              <section className="ou-section ou-section-warm">
                <div className="ou-container">
                  <div className="editorial-section-head">
                    <div>
                      <span className="gold-top-rule" aria-hidden="true" />
                      <h2>{productsCopy.kittingSection.title}</h2>
                      {productsCopy.kittingSection.subtitle ? (
                        <p>{productsCopy.kittingSection.subtitle}</p>
                      ) : null}
                    </div>
                    <a
                      href={routeHref(locale, "contact")}
                      className="editorial-text-link"
                      onClick={handleInlineLink(routeHref(locale, "contact"))}
                    >
                      {productsCopy.kittingSection.actionText}
                    </a>
                  </div>

                  <div className="category-editorial-grid">
                    {productsCopy.kittingSection.items.map((kit) => (
                      <div key={kit.id} className="category-editorial-item is-static">
                        <div className="editorial-photo-frame is-category-photo">
                          <img
                            src={kit.imagePath}
                            alt={kit.title}
                            width="294"
                            height="198"
                          />
                          {kit.imageBadge ? (
                            <span className="photo-corner-badge is-mini">{kit.imageBadge}</span>
                          ) : null}
                        </div>
                        <div className="category-item-body">
                          <h3>{kit.title}</h3>
                          <p>{kit.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}

        {/* =================================================================
            PAGE 3: ENGINEERING SOLUTIONS (/zh/solutions, /en/solutions)
        ================================================================= */}
        {route === "solutions" && (
          <>
            <section className="editorial-hero is-subpage-hero">
              <div className="ou-container">
                <nav className="breadcrumb-bar" aria-label="Breadcrumb">
                  <a
                    href={routeHref(locale, "home")}
                    onClick={handleInlineLink(routeHref(locale, "home"))}
                  >
                    {localeContent.breadcrumbs?.home || localeContent.nav.home}
                  </a>
                  <span aria-hidden="true">/</span>
                  <span>{localeContent.breadcrumbs?.solutions || localeContent.nav.solutions}</span>
                </nav>

                <div className="subpage-hero-split">
                  <div className="subpage-hero-copy">
                    <div className="editorial-eyebrow-tick">
                      <span>{solutionsCopy.eyebrow}</span>
                    </div>
                    <h1>{solutionsCopy.heading}</h1>
                    <p className="hero-lead">{solutionsCopy.lead}</p>

                    <div className="hero-cta-row">
                      <a
                        href={routeHref(locale, "contact")}
                        className="btn-primary"
                        onClick={handleInlineLink(routeHref(locale, "contact"))}
                      >
                        <span>{solutionsCopy.primaryCta}</span>
                      </a>
                      <a
                        href="#prep-checklist"
                        className="btn-outline"
                        onClick={handleInlineLink("#prep-checklist")}
                      >
                        <span>{solutionsCopy.secondaryCta}</span>
                      </a>
                    </div>
                  </div>

                  <div className="subpage-hero-media">
                    <div className="editorial-photo-frame is-solutions-hero-photo">
                      <img
                        src={solutionsCopy.heroImagePath}
                        alt={solutionsCopy.heading}
                        width="642"
                        height="570"
                      />
                      {solutionsCopy.heroImageBadge ? (
                        <span className="photo-corner-badge">{solutionsCopy.heroImageBadge}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Industry Role Switcher Tabs */}
            {Array.isArray(solutionsCopy.roleTabs) && solutionsCopy.roleTabs.length > 0 ? (
              <section className="role-tabs-band">
                <div className="ou-container">
                  <div className="role-tabs-bar" role="tablist">
                    {solutionsCopy.roleTabs.map((tab) => {
                      const isActive = tab.id === activeRoleTab?.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          className={`role-tab-btn${isActive ? " is-active" : ""}`}
                          onClick={() => setActiveRoleId(tab.id)}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {activeRoleTab ? (
                    <div className="role-tab-panel" role="tabpanel">
                      <div className="role-panel-main">
                        <h2>{activeRoleTab.title}</h2>
                        <p>{activeRoleTab.summary}</p>
                      </div>
                      <ul className="role-panel-points">
                        {activeRoleTab.highlights.map((pt, i) => (
                          <li key={i}>
                            <Check size={14} className="check-icon-forest" aria-hidden="true" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* 01. Full BOM Kitting (Left 4-Part Kit Photo + Right 3 Hairline Rows) */}
            {solutionsCopy.section01 ? (
              <section className="ou-section">
                <div className="ou-container solutions-split-row">
                  <div className="solutions-media-block">
                    <div className="editorial-photo-frame">
                      <img
                        src={solutionsCopy.section01.imagePath}
                        alt={solutionsCopy.section01.title}
                        width="669"
                        height="330"
                      />
                      {solutionsCopy.section01.imageBadge ? (
                        <span className="photo-corner-badge">
                          {solutionsCopy.section01.imageBadge}
                        </span>
                      ) : null}
                    </div>
                    {Array.isArray(solutionsCopy.section01.partTags) ? (
                      <div className="kit-part-tags">
                        {solutionsCopy.section01.partTags.map((tag, idx) => (
                          <span key={idx} className="kit-part-tag">
                            <span className="mpn-code">0{idx + 1}</span> {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="solutions-editorial-col">
                    <div className="solutions-num-heading">
                      <span className="editorial-big-num mpn-code">
                        {solutionsCopy.section01.num}
                      </span>
                      <span className="editorial-eyebrow-gold">
                        {solutionsCopy.section01.eyebrow}
                      </span>
                    </div>
                    <h2>{solutionsCopy.section01.title}</h2>

                    <div className="editorial-kv-rows">
                      {solutionsCopy.section01.rows.map((row, idx) => (
                        <div key={idx} className="editorial-kv-row">
                          <span className="kv-row-tag">{row.label}</span>
                          <div className="kv-row-content">
                            <strong>{row.title}</strong>
                            <p>{row.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {/* 02. Domestic Replacement & Reverse/Forward Engineering (Left 5-Check List + Right Caliper Photo) */}
            {solutionsCopy.section02 ? (
              <section className="ou-section ou-section-warm">
                <div className="ou-container solutions-split-row is-reversed">
                  <div className="solutions-editorial-col">
                    <div className="solutions-num-heading">
                      <span className="editorial-big-num mpn-code">
                        {solutionsCopy.section02.num}
                      </span>
                      <span className="editorial-eyebrow-gold">
                        {solutionsCopy.section02.eyebrow}
                      </span>
                    </div>
                    <h2>{solutionsCopy.section02.title}</h2>
                    {solutionsCopy.section02.subtitle ? (
                      <p className="solutions-sub-note">{solutionsCopy.section02.subtitle}</p>
                    ) : null}

                    <ul className="solutions-verify-checklist">
                      {solutionsCopy.section02.checklist.map((item, idx) => (
                        <li key={idx}>
                          <Check size={15} className="check-icon-forest" aria-hidden="true" />
                          <div>
                            <strong>{item.title}</strong>
                            <span>{item.desc}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="solutions-media-block">
                    <div className="editorial-photo-frame">
                      <img
                        src={solutionsCopy.section02.imagePath}
                        alt={solutionsCopy.section02.title}
                        width="678"
                        height="405"
                      />
                      {solutionsCopy.section02.imageBadge ? (
                        <span className="photo-corner-badge">
                          {solutionsCopy.section02.imageBadge}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Custom Tooling 3-Step Dark Forest Banner */}
            {solutionsCopy.customDevBanner ? (
              <section className="forest-dev-banner">
                <div className="ou-container">
                  <div className="forest-banner-head">
                    <h2>{solutionsCopy.customDevBanner.title}</h2>
                    {solutionsCopy.customDevBanner.footnote ? (
                      <span>{solutionsCopy.customDevBanner.footnote}</span>
                    ) : null}
                  </div>

                  <div className="forest-steps-grid">
                    {solutionsCopy.customDevBanner.steps.map((st) => (
                      <div key={st.step} className="forest-step-cell">
                        <span className="forest-step-num mpn-code">{st.step}</span>
                        <h3>{st.title}</h3>
                        <p>{st.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {/* Vehicle Subsystem Matrix (Semantic Hairline Table + Right Red Latch Connector Photo) */}
            <section className="ou-section">
              <div className="ou-container">
                <div className="editorial-section-head">
                  <div>
                    <span className="gold-top-rule" aria-hidden="true" />
                    <h2>{solutionsCopy.matrixTitle}</h2>
                    <p>{solutionsCopy.matrixSubtitle}</p>
                  </div>
                </div>

                <div className="subsystem-editorial-split">
                  <div className="table-scroll-wrap subsystem-table-wrap">
                    <table className="subsystem-editorial-table">
                      <thead>
                        <tr>
                          <th scope="col">{solutionsCopy.matrixHeaders.subsystem}</th>
                          <th scope="col">{solutionsCopy.matrixHeaders.environment}</th>
                          <th scope="col">{solutionsCopy.matrixHeaders.brands}</th>
                          <th scope="col">{solutionsCopy.matrixHeaders.support}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {solutionsCopy.subsystemMatrix.map((row, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong>{row.subsystem}</strong>
                            </td>
                            <td>{row.environment}</td>
                            <td>{row.brands}</td>
                            <td>{row.support}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {solutionsCopy.matrixImagePath ? (
                    <div className="subsystem-side-photo">
                      <div className="editorial-photo-frame">
                        <img
                          src={solutionsCopy.matrixImagePath}
                          alt={solutionsCopy.matrixTitle}
                          width="453"
                          height="321"
                        />
                        {solutionsCopy.matrixImageBadge ? (
                          <span className="photo-corner-badge">
                            {solutionsCopy.matrixImageBadge}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Preparation Box & Engineering FAQs */}
            <section id="prep-checklist" className="ou-section ou-section-warm">
              <div className="ou-container">
                {solutionsCopy.prepChecklist ? (
                  <div className="prep-wireframe-box">
                    <div className="prep-box-main">
                      <h2>{solutionsCopy.prepChecklist.title}</h2>
                      <div className="prep-items-inline">
                        {solutionsCopy.prepChecklist.items.map((item, idx) => (
                          <span key={idx} className="prep-inline-pill">
                            <strong className="mpn-code">0{idx + 1}</strong>
                            <span>{item}</span>
                          </span>
                        ))}
                      </div>
                      {solutionsCopy.prepChecklist.footnote ? (
                        <p className="prep-footnote">{solutionsCopy.prepChecklist.footnote}</p>
                      ) : null}
                    </div>
                    <a
                      href={routeHref(locale, "contact")}
                      className="btn-primary"
                      onClick={handleInlineLink(routeHref(locale, "contact"))}
                    >
                      <span>{solutionsCopy.prepChecklist.buttonText}</span>
                    </a>
                  </div>
                ) : null}

                <div className="faq-section-wrap">
                  <div className="editorial-section-head">
                    <div>
                      <span className="gold-top-rule" aria-hidden="true" />
                      <h2>{solutionsCopy.faqTitle}</h2>
                    </div>
                  </div>
                  <FaqAccordion faqs={solutionsCopy.faqs} />
                </div>
              </div>
            </section>
          </>
        )}

        {/* =================================================================
            PAGE 4: QUALITY & TRACEABILITY (/zh/quality, /en/quality)
        ================================================================= */}
        {route === "quality" && (
          <>
            <section className="editorial-hero is-subpage-hero is-compact-hero">
              <div className="ou-container">
                <nav className="breadcrumb-bar" aria-label="Breadcrumb">
                  <a
                    href={routeHref(locale, "home")}
                    onClick={handleInlineLink(routeHref(locale, "home"))}
                  >
                    {localeContent.breadcrumbs?.home || localeContent.nav.home}
                  </a>
                  <span aria-hidden="true">/</span>
                  <span>{localeContent.breadcrumbs?.quality || localeContent.nav.quality}</span>
                </nav>

                <div className="quality-hero-header">
                  <div>
                    <div className="editorial-eyebrow-tick">
                      <span>{localeContent.quality.eyebrow}</span>
                    </div>
                    <h1>{localeContent.quality.heading}</h1>
                    <p className="hero-lead">{localeContent.quality.lead}</p>
                  </div>
                  <a
                    href={routeHref(locale, "contact")}
                    className="editorial-text-link is-strong"
                    onClick={handleInlineLink(routeHref(locale, "contact"))}
                  >
                    {localeContent.quality.actionText}
                  </a>
                </div>
              </div>
            </section>

            <section className="ou-section">
              <div className="ou-container">
                <QualityPipeline
                  locale={locale}
                  qualityCopy={localeContent.quality}
                  onNavigate={navigateTo}
                />
              </div>
            </section>

            <section className="ou-section ou-section-warm">
              <div className="ou-container">
                <div className="editorial-section-head">
                  <div>
                    <span className="gold-top-rule" aria-hidden="true" />
                    <h2>{localeContent.quality.faqTitle}</h2>
                  </div>
                </div>
                <FaqAccordion faqs={localeContent.quality.faqs} />
              </div>
            </section>
          </>
        )}

        {/* =================================================================
            PAGE 5: ABOUT OU-LINK (/zh/about, /en/about)
        ================================================================= */}
        {route === "about" && (
          <>
            <section className="editorial-hero is-about-hero">
              <div className="ou-container">
                <nav className="breadcrumb-bar" aria-label="Breadcrumb">
                  <a
                    href={routeHref(locale, "home")}
                    onClick={handleInlineLink(routeHref(locale, "home"))}
                  >
                    {localeContent.breadcrumbs?.home || localeContent.nav.home}
                  </a>
                  <span aria-hidden="true">/</span>
                  <span>{localeContent.breadcrumbs?.about || localeContent.nav.about}</span>
                </nav>

                <div className="about-hero-split">
                  <div className="about-hero-main">
                    <div className="editorial-eyebrow-tick">
                      <span className="mpn-code">{aboutCopy.eyebrow}</span>
                      <span>·</span>
                      <span>{aboutCopy.companyFullName}</span>
                    </div>
                    <h1>{aboutCopy.heading}</h1>
                    <p className="hero-lead">{aboutCopy.lead}</p>
                  </div>

                  <div className="about-year-monument">
                    <strong className="about-gold-year mpn-code">{aboutCopy.foundedYear}</strong>
                    <span>{aboutCopy.foundedCaption}</span>
                  </div>
                </div>

                {/* Wide Workbench Panorama Photo */}
                {aboutCopy.panoramaImagePath ? (
                  <div className="editorial-photo-frame is-about-panorama">
                    <img
                      src={aboutCopy.panoramaImagePath}
                      alt={aboutCopy.companyFullName}
                      width="1194"
                      height="522"
                    />
                    {aboutCopy.panoramaBadge ? (
                      <span className="photo-corner-badge">{aboutCopy.panoramaBadge}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            {/* What We Do (Left Heading + Right 3 Hairline Rows) */}
            {aboutCopy.whatWeDo ? (
              <section className="ou-section">
                <div className="ou-container about-what-split">
                  <div className="about-what-head">
                    <span className="gold-top-rule" aria-hidden="true" />
                    <span className="editorial-eyebrow-gold">{aboutCopy.whatWeDo.eyebrow}</span>
                    <h2>{aboutCopy.whatWeDo.title}</h2>
                  </div>

                  <div className="editorial-kv-rows">
                    {aboutCopy.whatWeDo.rows.map((row) => (
                      <div key={row.code} className="editorial-kv-row">
                        <span className="editorial-step-num mpn-code">{row.code}</span>
                        <div className="kv-row-content">
                          <h3>{row.title}</h3>
                          <p>{row.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {/* Brand & Cooperation Scope Strip */}
            {aboutCopy.brandScope ? (
              <section className="ou-section ou-section-warm">
                <div className="ou-container">
                  <div className="brand-scope-sheet">
                    <div className="brand-scope-top">
                      <h2>{aboutCopy.brandScope.title}</h2>
                      <a
                        href={routeHref(locale, "products")}
                        className="editorial-text-link"
                        onClick={handleInlineLink(routeHref(locale, "products"))}
                      >
                        {localeContent.brandMatrix?.allBrandsAction}
                      </a>
                    </div>
                    <p className="brand-scope-line">{aboutCopy.brandScope.allBrandsLine}</p>
                    <p className="brand-scope-note">* {aboutCopy.brandScope.note}</p>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Industry Roles + Shanghai Minhang Operations Hub */}
            <section className="ou-section">
              <div className="ou-container about-dual-grid">
                {aboutCopy.industryRoles ? (
                  <div>
                    <span className="gold-top-rule" aria-hidden="true" />
                    <h2 className="about-col-heading">{aboutCopy.industryRoles.title}</h2>
                    <div className="roles-hairline-list">
                      {aboutCopy.industryRoles.items.map((item, idx) => (
                        <div key={idx} className="role-hairline-row">
                          <strong>{item.role}</strong>
                          <span>{item.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {aboutCopy.operationsHub ? (
                  <div className="operations-hub-sheet">
                    <div className="hub-sheet-top">
                      <h2>{aboutCopy.operationsHub.title}</h2>
                      <span className="hub-code mpn-code">
                        {aboutCopy.operationsHub.locationCode}
                      </span>
                    </div>

                    <dl className="hub-details-list">
                      <div className="hub-detail-row">
                        <dt>{aboutCopy.operationsHub.addressLabel}</dt>
                        <dd>{aboutCopy.operationsHub.address}</dd>
                      </div>
                      <div className="hub-detail-row">
                        <dt>{aboutCopy.operationsHub.phoneLabel}</dt>
                        <dd className="mpn-code">
                          <a href={`tel:${aboutCopy.operationsHub.phone}`}>
                            {aboutCopy.operationsHub.phone}
                          </a>
                        </dd>
                      </div>
                      <div className="hub-detail-row">
                        <dt>{aboutCopy.operationsHub.salesPhoneLabel}</dt>
                        <dd className="mpn-code">
                          <a href={`tel:${aboutCopy.operationsHub.salesPhone}`}>
                            {aboutCopy.operationsHub.salesPhone}
                          </a>
                        </dd>
                      </div>
                      <div className="hub-detail-row">
                        <dt>{aboutCopy.operationsHub.emailLabel}</dt>
                        <dd className="mpn-code">
                          <a href={`mailto:${aboutCopy.operationsHub.email}`}>
                            {aboutCopy.operationsHub.email}
                          </a>
                        </dd>
                      </div>
                      <div className="hub-detail-row">
                        <dt>{aboutCopy.operationsHub.hoursLabel}</dt>
                        <dd>{aboutCopy.operationsHub.hours}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </div>
            </section>

            {/* Careers Accordion Section */}
            <section className="ou-section is-bordered-top">
              <div className="ou-container about-what-split">
                <div className="about-what-head">
                  <span className="gold-top-rule" aria-hidden="true" />
                  <h2>{aboutCopy.careersTitle}</h2>
                  <p className="careers-lead-copy">{aboutCopy.careersLead}</p>
                  <a
                    href={`mailto:${aboutCopy.applyEmail || contact.email}`}
                    className="editorial-text-link is-strong"
                  >
                    {aboutCopy.applyAction} {aboutCopy.applyEmail || contact.email}
                  </a>
                </div>

                <div className="faq-editorial-list">
                  {aboutCopy.careers.map((job, idx) => (
                    <details key={job.id} className="faq-editorial-item" open={idx === 0}>
                      <summary className="faq-editorial-summary">
                        <span className="faq-editorial-q">
                          <span className="faq-editorial-qtext">{job.title}</span>
                          <span className="career-type-tag">{job.type}</span>
                        </span>
                        <span className="faq-editorial-toggle" aria-hidden="true" />
                      </summary>
                      <div className="faq-editorial-answer">
                        <p className="career-para">{job.responsibilities}</p>
                        <p className="career-para is-muted">{job.requirements}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </section>

            {/* Bottom CTA Strip */}
            {aboutCopy.bottomCta ? (
              <section className="bottom-cta-strip">
                <div className="ou-container bottom-cta-inner">
                  <div className="bottom-cta-copy">
                    <h2>{aboutCopy.bottomCta.title}</h2>
                  </div>
                  <a
                    href={routeHref(locale, "contact")}
                    className="btn-primary"
                    onClick={handleInlineLink(routeHref(locale, "contact"))}
                  >
                    <span>{aboutCopy.bottomCta.buttonText}</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </a>
                </div>
              </section>
            ) : null}
          </>
        )}

        {/* =================================================================
            PAGE 6: BOM RFQ & CONTACT (/zh/contact, /en/contact)
        ================================================================= */}
        {route === "contact" && (
          <>
            <section className="editorial-hero is-subpage-hero">
              <div className="ou-container">
                <nav className="breadcrumb-bar" aria-label="Breadcrumb">
                  <a
                    href={routeHref(locale, "home")}
                    onClick={handleInlineLink(routeHref(locale, "home"))}
                  >
                    {localeContent.breadcrumbs?.home || localeContent.nav.home}
                  </a>
                  <span aria-hidden="true">/</span>
                  <span>{localeContent.breadcrumbs?.contact || localeContent.nav.contact}</span>
                </nav>

                <div className="subpage-hero-split">
                  <div className="subpage-hero-copy">
                    <h1>{contactCopy.heading}</h1>
                    <p className="hero-lead">{contactCopy.lead}</p>

                    {Array.isArray(contactCopy.steps) ? (
                      <div className="contact-steps-strip">
                        {contactCopy.steps.map((st, idx) => (
                          <React.Fragment key={idx}>
                            <span className="contact-step-item">
                              <strong className="mpn-code">0{idx + 1}</strong>
                              <span>{st}</span>
                            </span>
                            {idx < contactCopy.steps.length - 1 ? (
                              <span className="contact-step-arrow" aria-hidden="true">
                                →
                              </span>
                            ) : null}
                          </React.Fragment>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="subpage-hero-media">
                    <div className="editorial-photo-frame is-contact-hero-photo">
                      <img
                        src={contactCopy.heroImagePath}
                        alt={contactCopy.heading}
                        width="681"
                        height="438"
                      />
                      {contactCopy.heroImageBadge ? (
                        <span className="photo-corner-badge">{contactCopy.heroImageBadge}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="ou-section">
              <div className="ou-container contact-editorial-grid">
                {/* Left Column: 01 BOM List Builder + 02 Inquiry & Contact Form */}
                <div className="contact-main-col">
                  {/* 01. BOM List Panel (Placed outside <form> so first text input inside <form> is strictly 'name') */}
                  <div className="rfq-sheet-block">
                    <div className="rfq-block-header">
                      <div className="rfq-step-heading">
                        <span className="editorial-step-num mpn-code">
                          {contactCopy.bomSection.stepNum}
                        </span>
                        <h2>{contactCopy.bomSection.title}</h2>
                        {bomItems.length > 0 ? (
                          <span className="bom-state-tag is-selected">
                            {contactCopy.bomSection.selectedBadge} ({bomItems.length})
                          </span>
                        ) : sampleUntouched ? (
                          <span className="bom-state-tag">
                            {contactCopy.bomSection.sampleBadge}
                          </span>
                        ) : null}
                      </div>

                      <div className="bom-mode-tabs" role="tablist">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={bomTab === "manual"}
                          className={`bom-mode-tab${bomTab === "manual" ? " is-active" : ""}`}
                          onClick={() => setBomTab("manual")}
                        >
                          {contactCopy.bomSection.tabs.manual}
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={bomTab === "paste"}
                          className={`bom-mode-tab${bomTab === "paste" ? " is-active" : ""}`}
                          onClick={() => setBomTab("paste")}
                        >
                          {contactCopy.bomSection.tabs.paste}
                        </button>
                      </div>
                    </div>

                    {bomTab === "manual" ? (
                      <div className="bom-manual-editor">
                        <div className="table-scroll-wrap">
                          <table className="bom-edit-table">
                            <thead>
                              <tr>
                                <th scope="col">{contactCopy.bomSection.tableHeaders.mpn}</th>
                                <th scope="col" className="qty-col">
                                  {contactCopy.bomSection.tableHeaders.qty}
                                </th>
                                <th scope="col">
                                  {contactCopy.bomSection.tableHeaders.leadTime}
                                </th>
                                <th scope="col" className="num-col">
                                  {contactCopy.bomSection.tableHeaders.action}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeContactRows.map((row, idx) => (
                                <tr key={row.id || `${row.mpn}-${idx}`}>
                                  <td>
                                    <input
                                      type="search"
                                      value={row.mpn}
                                      placeholder={contactCopy.bomSection.rowPlaceholders.mpn}
                                      aria-label={`${contactCopy.bomSection.tableHeaders.mpn} ${
                                        idx + 1
                                      }`}
                                      onChange={(e) =>
                                        handleUpdateBomField(idx, "mpn", e.target.value)
                                      }
                                      className="bom-cell-input is-mono"
                                    />
                                  </td>
                                  <td className="qty-col">
                                    <input
                                      type="number"
                                      min="1"
                                      value={row.qty}
                                      placeholder={contactCopy.bomSection.rowPlaceholders.qty}
                                      aria-label={`${contactCopy.bomSection.tableHeaders.qty} ${
                                        idx + 1
                                      }`}
                                      onChange={(e) =>
                                        handleUpdateBomField(idx, "qty", e.target.value)
                                      }
                                      className="bom-cell-input is-mono"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="search"
                                      value={row.leadTime || ""}
                                      placeholder={contactCopy.bomSection.rowPlaceholders.leadTime}
                                      aria-label={`${contactCopy.bomSection.tableHeaders.leadTime} ${
                                        idx + 1
                                      }`}
                                      onChange={(e) =>
                                        handleUpdateBomField(idx, "leadTime", e.target.value)
                                      }
                                      className="bom-cell-input"
                                    />
                                  </td>
                                  <td className="num-col">
                                    <button
                                      type="button"
                                      className="bom-row-remove"
                                      aria-label={`${contactCopy.bomSection.removeRowLabel} ${
                                        row.mpn || idx + 1
                                      }`}
                                      onClick={() => handleRemoveContactRow(idx)}
                                    >
                                      <Trash2 size={14} aria-hidden="true" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="bom-editor-actions">
                          <button
                            type="button"
                            className="btn-outline is-compact"
                            onClick={handleAddContactRow}
                          >
                            <span>{contactCopy.bomSection.addRowButton}</span>
                          </button>

                          <button
                            type="button"
                            className="editorial-text-link is-button"
                            onClick={() => setBomTab("paste")}
                          >
                            {contactCopy.bomSection.pasteLabel} →
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bom-paste-editor">
                        <label htmlFor="bom-paste-area" className="bom-paste-hint">
                          {contactCopy.bomSection.pasteHint}
                        </label>
                        <textarea
                          id="bom-paste-area"
                          value={rfqBomText}
                          onChange={(e) => setRfqBomText(e.target.value)}
                          placeholder={contactCopy.bomSection.pastePlaceholder}
                          className="form-control is-mono-area"
                        />
                      </div>
                    )}
                  </div>

                  {/* 02. Requirements & Contact Details (<form>) */}
                  <form className="rfq-sheet-block is-form-block" onSubmit={handleRfqSubmit} noValidate>
                    <input type="hidden" name="bomText" value={effectiveBomText} readOnly />

                    <div className="rfq-block-header">
                      <div className="rfq-step-heading">
                        <span className="editorial-step-num mpn-code">
                          {contactCopy.formSection.stepNum}
                        </span>
                        <h2>{contactCopy.formSection.title}</h2>
                      </div>
                    </div>

                    <div className="form-grid-2col">
                      <div className="form-field">
                        <label htmlFor="rfq-name">{contactCopy.fields.name}</label>
                        <input
                          id="rfq-name"
                          name="name"
                          type="text"
                          required
                          value={rfqName}
                          onChange={(e) => setRfqName(e.target.value)}
                          placeholder={contactCopy.fields.namePlaceholder}
                          className="form-control"
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="rfq-company">{contactCopy.fields.company}</label>
                        <input
                          id="rfq-company"
                          name="company"
                          type="text"
                          value={rfqCompany}
                          onChange={(e) => setRfqCompany(e.target.value)}
                          placeholder={contactCopy.fields.companyPlaceholder}
                          className="form-control"
                        />
                      </div>
                    </div>

                    <div className="form-grid-2col">
                      <div className="form-field">
                        <label htmlFor="rfq-contact">{contactCopy.fields.contact}</label>
                        <input
                          id="rfq-contact"
                          name="contact"
                          type="text"
                          required
                          value={rfqContact}
                          onChange={(e) => setRfqContact(e.target.value)}
                          placeholder={contactCopy.fields.contactPlaceholder}
                          className="form-control"
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="rfq-customer-type">
                          {contactCopy.fields.customerType}
                        </label>
                        <select
                          id="rfq-customer-type"
                          name="customerType"
                          value={rfqCustomerType}
                          onChange={(e) => setRfqCustomerType(e.target.value)}
                          className="form-control"
                        >
                          {contactCopy.fields.customerTypes.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {Array.isArray(contactCopy.formSection.focusChips) ? (
                      <div className="form-field">
                        <span className="field-group-label">
                          {contactCopy.formSection.focusLabel}
                        </span>
                        <div className="focus-chips-row">
                          {contactCopy.formSection.focusChips.map((chip) => {
                            const active = selectedFocuses.includes(chip.value);
                            return (
                              <button
                                key={chip.value}
                                type="button"
                                aria-pressed={active}
                                className={`focus-chip-btn${active ? " is-active" : ""}`}
                                onClick={() => toggleFocusChip(chip.value)}
                              >
                                {active ? <Check size={13} aria-hidden="true" /> : null}
                                <span>{chip.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* Anti-bot Honeypot */}
                    <div aria-hidden="true" className="honeypot-field">
                      <label htmlFor="rfq-website">Website</label>
                      <input
                        id="rfq-website"
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={rfqHoneypot}
                        onChange={(e) => setRfqHoneypot(e.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="rfq-message">{contactCopy.fields.message}</label>
                      <textarea
                        id="rfq-message"
                        name="message"
                        value={rfqMessage}
                        onChange={(e) => setRfqMessage(e.target.value)}
                        placeholder={contactCopy.fields.messagePlaceholder}
                        className="form-control"
                      />
                    </div>

                    <div className="consent-row">
                      <input
                        id="rfq-consent"
                        name="consent"
                        type="checkbox"
                        required
                        checked={rfqConsent}
                        onChange={(e) => setRfqConsent(e.target.checked)}
                      />
                      <label htmlFor="rfq-consent">{contactCopy.fields.consent}</label>
                    </div>

                    <div className="rfq-submit-bar">
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={rfqStatus === "submitting"}
                      >
                        <span>
                          {rfqStatus === "submitting"
                            ? contactCopy.fields.submitting
                            : contactCopy.fields.submit}
                        </span>
                      </button>

                      <a href={mailtoHref} className="editorial-text-link">
                        <Mail size={14} aria-hidden="true" />
                        <span>{contactCopy.formSection.emailActionText}</span>
                      </a>
                    </div>

                    <p className="rfq-submit-footnote">
                      {contactCopy.formSection.submitFootnote}
                    </p>

                    <div role="status" aria-live="polite">
                      {rfqStatus === "validation_error" ? (
                        <div className="rfq-feedback-box is-warning">
                          <strong>{contactCopy.feedback.validationError}</strong>
                        </div>
                      ) : null}

                      {rfqStatus === "success" ? (
                        <div className="rfq-feedback-box is-success">
                          <strong className="feedback-title-row">
                            <CheckCircle2 size={17} aria-hidden="true" />
                            <span>{contactCopy.feedback.successTitle}</span>
                          </strong>
                          <p>{contactCopy.feedback.successBody}</p>
                        </div>
                      ) : null}

                      {rfqStatus === "fallback" ? (
                        <div className="rfq-feedback-box is-fallback">
                          <h3>{contactCopy.feedback.fallbackTitle}</h3>
                          <p>{contactCopy.feedback.fallbackBody}</p>
                          <div className="fallback-actions-row">
                            <button
                              type="button"
                              className="btn-outline is-compact"
                              onClick={handleCopyFallback}
                            >
                              <Copy size={13} aria-hidden="true" />
                              <span>
                                {copiedFallback
                                  ? contactCopy.feedback.copiedBomButton
                                  : contactCopy.feedback.copyBomButton}
                              </span>
                            </button>
                            <a href={mailtoHref} className="btn-primary is-compact">
                              <Mail size={13} aria-hidden="true" />
                              <span>{contactCopy.feedback.mailtoButton}</span>
                            </a>
                            <a href={`tel:${contact.phone}`} className="btn-outline is-compact">
                              <PhoneCall size={13} aria-hidden="true" />
                              <span>{contactCopy.feedback.callButton}</span>
                            </a>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </form>
                </div>

                {/* Right Sidebar: Direct Shanghai Team Info + Product Photo */}
                <aside className="contact-sidebar-col">
                  <div className="direct-contact-sheet">
                    <h2>{contactCopy.directChannelsTitle}</h2>
                    <dl className="hub-details-list">
                      <div className="hub-detail-row">
                        <dt>{contactCopy.labels.phone}</dt>
                        <dd className="mpn-code">
                          <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                        </dd>
                      </div>
                      <div className="hub-detail-row">
                        <dt>{contactCopy.labels.salesPhone}</dt>
                        <dd className="mpn-code">
                          <a href={`tel:${contact.salesPhone}`}>{contact.salesPhone}</a>
                        </dd>
                      </div>
                      <div className="hub-detail-row">
                        <dt>{contactCopy.labels.email}</dt>
                        <dd className="mpn-code">
                          <a href={`mailto:${contact.email}`}>{contact.email}</a>
                        </dd>
                      </div>
                      <div className="hub-detail-row">
                        <dt>{contactCopy.labels.qq}</dt>
                        <dd className="mpn-code">{contact.qq}</dd>
                      </div>
                      <div className="hub-detail-row">
                        <dt>{contactCopy.labels.address}</dt>
                        <dd>{locale === "zh" ? contact.addressZh : contact.addressEn}</dd>
                      </div>
                      <div className="hub-detail-row">
                        <dt>{contactCopy.labels.hours}</dt>
                        <dd>{locale === "zh" ? contact.hoursZh : contact.hoursEn}</dd>
                      </div>
                    </dl>

                    {brand.wechatQr ? (
                      <div className="sidebar-qr-box">
                        <img
                          src={brand.wechatQr}
                          alt={contactCopy.labels.wechat}
                          width="68"
                          height="68"
                        />
                        <div>
                          <strong>{contactCopy.labels.wechat}</strong>
                          <span>
                            {locale === "zh"
                              ? "扫码添加微信对接料号与库存"
                              : "Scan on WeChat for BOM & stock inquiries"}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {contactCopy.sidebarImagePath ? (
                    <div className="editorial-photo-frame is-sidebar-photo">
                      <img
                        src={contactCopy.sidebarImagePath}
                        alt={contactCopy.directChannelsTitle}
                        width="375"
                        height="354"
                      />
                      {contactCopy.sidebarImageBadge ? (
                        <span className="photo-corner-badge is-mini">
                          {contactCopy.sidebarImageBadge}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </aside>
              </div>
            </section>

            {/* Bottom 3-Item Preparation Panel */}
            {contactCopy.prepPanel ? (
              <section className="ou-section ou-section-warm">
                <div className="ou-container">
                  <div className="contact-prep-panel">
                    <h2>{contactCopy.prepPanel.title}</h2>
                    <div className="contact-prep-grid">
                      {contactCopy.prepPanel.items.map((item) => (
                        <div key={item.num} className="contact-prep-cell">
                          <span className="editorial-step-num mpn-code">{item.num}</span>
                          <h3>{item.title}</h3>
                          <p>{item.desc}</p>
                        </div>
                      ))}
                    </div>
                    <p className="contact-prep-note">{contactCopy.prepPanel.note}</p>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}

        {/* =================================================================
            404 NOT FOUND
        ================================================================= */}
        {route === "notFound" && (
          <section className="ou-section" style={{ minHeight: "62vh" }}>
            <div className="ou-container">
              <div className="not-found-sheet">
                <span className="editorial-eyebrow-gold mpn-code">
                  HTTP {localeContent.notFound.code || "404"}
                </span>
                <h1>{localeContent.notFound.title}</h1>
                <p>{localeContent.notFound.description}</p>
                <div className="hero-cta-row">
                  <a
                    href={routeHref(locale, "products")}
                    className="btn-primary"
                    onClick={handleInlineLink(routeHref(locale, "products"))}
                  >
                    <span>{localeContent.notFound.catalogAction}</span>
                  </a>
                  <a
                    href={routeHref(locale, "home")}
                    className="btn-outline"
                    onClick={handleInlineLink(routeHref(locale, "home"))}
                  >
                    <span>{localeContent.notFound.action}</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <BomDrawer
        locale={locale}
        route={route}
        isOpen={bomDrawerOpen}
        onClose={() => setBomDrawerOpen(false)}
        onOpen={() => setBomDrawerOpen(true)}
        bomItems={bomItems}
        onUpdateQty={handleUpdateBomQty}
        onRemoveItem={handleRemoveBomItem}
        onClearBom={handleClearBom}
        onNavigate={navigateTo}
        drawerCopy={localeContent.bomDrawer}
        stickyCopy={localeContent.productsPage?.stickyBomBar}
      />

      <Footer
        locale={locale}
        brand={brand}
        contact={contact}
        localeContent={localeContent}
        onNavigate={navigateTo}
      />
    </div>
  );
}
