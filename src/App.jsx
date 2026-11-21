import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Copy, Mail, PhoneCall, Trash2, MapPin, Briefcase } from "lucide-react";
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

function formatBomSummaryText(bomItems, manualBomText, locale = "zh") {
  const lines = [];
  if (bomItems.length > 0) {
    for (const item of bomItems) {
      lines.push(`${item.mpn}  |  ${item.brand || "-"}  |  ${item.qty} PCS`);
    }
  }
  if (manualBomText && manualBomText.trim()) {
    lines.push(manualBomText.trim());
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
  const [catalogPage, setCatalogPage] = useState(1);

  const [bomItems, setBomItems] = useState([]);
  const [bomDrawerOpen, setBomDrawerOpen] = useState(false);

  // RFQ Form states
  const [rfqName, setRfqName] = useState("");
  const [rfqCompany, setRfqCompany] = useState("");
  const [rfqContact, setRfqContact] = useState("");
  const [rfqCustomerType, setRfqCustomerType] = useState("harness");
  const [rfqInquiryType, setRfqInquiryType] = useState("bom");
  const [rfqBomText, setRfqBomText] = useState("");
  const [rfqBomTextTouched, setRfqBomTextTouched] = useState(false);
  const [rfqMessage, setRfqMessage] = useState("");
  const [rfqConsent, setRfqConsent] = useState(true);
  const [rfqHoneypot, setRfqHoneypot] = useState("");
  const [rfqStatus, setRfqStatus] = useState("idle"); // idle | submitting | validation_error | success | fallback
  const [copiedFallback, setCopiedFallback] = useState(false);

  const searchInputRef = useRef(null);

  // Sync pathname prop changes (e.g. SSR or controlled tests)
  useEffect(() => {
    setCurrentPath(initialPathname);
  }, [initialPathname]);

  const { locale, route } = resolveRoute(currentPath);
  const localeContent = activeContent[locale] || activeContent.zh;
  const brand = activeContent.brand;
  const contact = activeContent.contact;

  // Rebuild catalog API dynamically so config-only mutations immediately reflect
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

  // Keep RFQ textarea automatically populated with selected BOM items unless manually edited
  useEffect(() => {
    if (!rfqBomTextTouched) {
      if (bomItems.length > 0) {
        const autoLines = bomItems
          .map((item) => `${item.mpn}\t${item.qty} PCS\t(${item.brand || "OEM"})`)
          .join("\n");
        setRfqBomText(autoLines);
      } else {
        setRfqBomText("");
      }
    }
  }, [bomItems, rfqBomTextTouched]);

  // Update document title & html lang on client-side SPA navigation
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    const meta =
      route === "notFound"
        ? { title: `${localeContent.notFound.title} — ${locale === "zh" ? brand.fullNameZh : brand.fullNameEn}` }
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
      setBomDrawerOpen(false);
      return;
    }
    const next = [
      ...bomItems,
      {
        mpn: product.mpn,
        brand: locale === "zh" ? product.brandNameZh : product.brandNameEn,
        qty: product.moq || product.spq || 100,
      },
    ];
    persistBom(next);
  };

  const handleUpdateBomQty = (mpn, rawVal) => {
    const parsed = Number.parseInt(String(rawVal), 10);
    const qty = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 9_999_999) : 1;
    persistBom(bomItems.map((item) => (item.mpn === mpn ? { ...item, qty } : item)));
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
    setCatalogPage(1);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleRequestCustomMpn = (mpnString) => {
    const cleanMpn = String(mpnString || "").trim();
    if (cleanMpn && !bomItems.some((entry) => entry.mpn === cleanMpn)) {
      const next = [
        ...bomItems,
        {
          mpn: cleanMpn,
          brand: locale === "zh" ? "定制寻源 / 国产替代评估" : "Custom Sourcing / Cross-Ref",
          qty: 100,
        },
      ];
      persistBom(next);
    }
    setRfqInquiryType("cross_ref");
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

  // Search computations
  const heroSearchResults = useMemo(() => {
    if (!heroQuery.trim()) return null;
    return catalogApi.searchProducts(heroQuery, { page: 1, pageSize: 8 });
  }, [catalogApi, heroQuery]);

  const featuredProducts = useMemo(
    () => catalogApi.getFeaturedProducts(12),
    [catalogApi]
  );

  const catalogResult = useMemo(
    () =>
      catalogApi.searchProducts(catalogQuery, {
        brandId: selectedBrand,
        categoryId: selectedCategory,
        page: catalogPage,
        pageSize: 24,
      }),
    [catalogApi, catalogQuery, selectedBrand, selectedCategory, catalogPage]
  );

  const activeBrandObj =
    selectedBrand && selectedBrand !== "all"
      ? brandMap.get(String(selectedBrand).toLowerCase())
      : null;

  const handleRfqSubmit = async (event) => {
    event.preventDefault();
    const hasBomOrNotes =
      bomItems.length > 0 || rfqBomText.trim().length >= 3 || rfqMessage.trim().length >= 5;
    if (!rfqName.trim() || rfqContact.trim().length < 5 || !hasBomOrNotes || !rfqConsent) {
      setRfqStatus("validation_error");
      return;
    }

    setRfqStatus("submitting");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rfqName.trim(),
          company: rfqCompany.trim(),
          contact: rfqContact.trim(),
          customerType: rfqCustomerType,
          inquiryType: rfqInquiryType,
          bomItems,
          bomText: rfqBomText.trim(),
          message: rfqMessage.trim(),
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
      `${locale === "zh" ? "联络方式" : "Reply-To"}: ${rfqContact || "-"}`,
      `${locale === "zh" ? "需求类型" : "Category"}: ${rfqInquiryType}`,
      `--- BOM MPNs ---`,
      formatBomSummaryText(bomItems, rfqBomTextTouched ? rfqBomText : "", locale),
      `--- Notes ---`,
      rfqMessage || "-",
    ];
    return summaryLines.join("\n");
  }, [locale, rfqName, rfqCompany, rfqContact, rfqInquiryType, bomItems, rfqBomText, rfqBomTextTouched, rfqMessage]);

  const mailtoHref = useMemo(() => {
    const subject =
      locale === "zh"
        ? `[BOM询价] ${rfqCompany || rfqName || "汽车连接器询价"}`
        : `[BOM RFQ] ${rfqCompany || rfqName || "Automotive Connector Inquiry"}`;
    return `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedRfqSummary)}`;
  }, [locale, rfqCompany, rfqName, contact.email, formattedRfqSummary]);

  const handleCopyFallback = async () => {
    try {
      await navigator.clipboard.writeText(formattedRfqSummary);
      setCopiedFallback(true);
      setTimeout(() => setCopiedFallback(false), 2400);
    } catch {
      setCopiedFallback(false);
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
      event.preventDefault();
      navigateTo(href);
    }
  };

  const heroTitleText = localeContent.heroTitle || localeContent.hero.title;
  const heroSubtitleText = localeContent.heroBody || localeContent.hero.subtitle;

  return (
    <div className="app-shell" data-route={route}>
      <a href="#main" className="skip-link">
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
        onOpenBom={() => setBomDrawerOpen(true)}
        onTriggerSearch={handleTriggerSearch}
      />

      <main id="main" data-route={route} tabIndex={-1}>
        {route === "home" && (
          <>
            {/* 1. Precision CAD Blueprint Hero + Instant MPN Engine */}
            <section className="hero-section blueprint-surface">
              <div className="ou-container">
                <div className="hero-grid">
                  <div>
                    <div className="eyebrow-tag">{localeContent.hero.eyebrow}</div>
                    <div className="hero-heading">
                      <h1>{heroTitleText}</h1>
                    </div>
                    <p className="hero-lead">{heroSubtitleText}</p>

                    <div className="hero-cta-row">
                      <a
                        href={routeHref(locale, "products")}
                        className="btn-volt"
                        onClick={handleInlineLink(routeHref(locale, "products"))}
                      >
                        <span>{localeContent.hero.primaryCta}</span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </a>
                      <a
                        href={routeHref(locale, "contact")}
                        className="btn-navy-outline"
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

                  {/* Right CAD Specification & Core Pillars Panel (Replaces Blurry Truncated Legacy Banner) */}
                  <aside className="cad-spec-panel" aria-label={locale === "zh" ? "欧连核心工程指标" : "Ou-Link Core Metrics"}>
                    <div className="cad-panel-header">
                      <span>SPEC // OU-LINK-2012-SH</span>
                      <span>TOLERANCE: ZERO-COUNTERFEIT</span>
                    </div>

                    <div className="cad-metrics-grid">
                      {localeContent.hero.metrics.map((m) => (
                        <div key={m.code} className="cad-metric-box">
                          <span className="cad-metric-code">{m.code}</span>
                          <span className="cad-metric-value">{m.value}</span>
                          <span className="cad-metric-label">{m.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="cad-pillars-list">
                      {localeContent.hero.pillars.map((pillar) => (
                        <div key={pillar.code} className="cad-pillar-item">
                          <span className="cad-pillar-code">{pillar.code}</span>
                          <strong className="cad-pillar-title">{pillar.title}</strong>
                          <p className="cad-pillar-desc">{pillar.desc}</p>
                        </div>
                      ))}
                    </div>
                  </aside>
                </div>
              </div>
            </section>

            {/* 2. 17 Global Automotive Brands Vector Matrix */}
            <section className="ou-section">
              <div className="ou-container">
                <div className="section-header">
                  <div className="eyebrow-tag">{localeContent.brandMatrix.eyebrow}</div>
                  <h2>{localeContent.brandMatrix.title}</h2>
                  <p>{localeContent.brandMatrix.subtitle}</p>
                </div>

                <BrandMatrix
                  locale={locale}
                  brands={catalogApi.brands}
                  brandCopy={localeContent.brandMatrix}
                  onNavigate={navigateTo}
                />
              </div>
            </section>

            {/* 3. Server-Rendered Representative In-Stock Connector Spec Sheet */}
            <section className="ou-section ou-section-alt">
              <div className="ou-container">
                <div className="section-header">
                  <div className="eyebrow-tag">{localeContent.homeSections.featuredCatalogEyebrow}</div>
                  <h2>{localeContent.homeSections.featuredCatalogTitle}</h2>
                  <p>{localeContent.homeSections.featuredCatalogSubtitle}</p>
                </div>

                <ProductSpecTable
                  locale={locale}
                  items={featuredProducts}
                  brandMap={brandMap}
                  tableCopy={localeContent.productsPage}
                  mpnCopy={localeContent.mpnSearch}
                  bomItems={bomItems}
                  onAddBom={handleAddBom}
                  onRequestCustomMpn={handleRequestCustomMpn}
                />

                <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                  <a
                    href={routeHref(locale, "products")}
                    className="btn-navy-outline"
                    onClick={handleInlineLink(routeHref(locale, "products"))}
                  >
                    <span>{localeContent.brandMatrix.allBrandsAction}</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </section>

            {/* 4. Four Manufacturing & Supply Chain Capabilities Overview */}
            <section className="ou-section">
              <div className="ou-container">
                <div className="section-header">
                  <div className="eyebrow-tag">{localeContent.homeSections.solutionsEyebrow}</div>
                  <h2>{localeContent.homeSections.solutionsTitle}</h2>
                </div>

                <div className="pillars-grid-2x2">
                  {localeContent.solutions.pillars.map((pillar) => (
                    <article key={pillar.id} className="solution-card">
                      <span className="solution-code">{pillar.code}</span>
                      <span className="solution-audience">{pillar.audience}</span>
                      <h3>{pillar.title}</h3>
                      <p>{pillar.summary}</p>
                      <ul className="deliverables-list">
                        {pillar.deliverables.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* 5. Crawlable Engineering & Procurement FAQs */}
            <section className="ou-section ou-section-alt">
              <div className="ou-container">
                <div className="section-header">
                  <div className="eyebrow-tag">{localeContent.homeSections.faqEyebrow}</div>
                  <h2>{localeContent.homeSections.faqTitle}</h2>
                </div>
                <FaqAccordion faqs={localeContent.faqs} />
              </div>
            </section>
          </>
        )}

        {route === "products" && (
          <>
            <section className="page-hero blueprint-surface">
              <div className="ou-container">
                <nav className="breadcrumb-bar" aria-label="Breadcrumb">
                  <a href={routeHref(locale, "home")} onClick={handleInlineLink(routeHref(locale, "home"))}>
                    {localeContent.nav.home}
                  </a>
                  <span>/</span>
                  <span>{localeContent.nav.products}</span>
                </nav>
                <div className="eyebrow-tag">{localeContent.productsPage.eyebrow}</div>
                <h1>{localeContent.productsPage.heading}</h1>
                <p className="page-lead">{localeContent.productsPage.lead}</p>

                <MpnSearchEngine
                  locale={locale}
                  mode="catalog"
                  query={catalogQuery}
                  onQueryChange={(val) => {
                    setCatalogQuery(val);
                    setCatalogPage(1);
                  }}
                  mpnCopy={localeContent.mpnSearch}
                  bomItems={bomItems}
                  onAddBom={handleAddBom}
                  onRequestCustomMpn={handleRequestCustomMpn}
                  onNavigate={navigateTo}
                  inputRef={searchInputRef}
                />
              </div>
            </section>

            <section className="ou-section">
              <div className="ou-container">
                <div className="catalog-filter-panel">
                  <div style={{ marginBottom: 14 }}>
                    <span className="filter-group-label">{localeContent.productsPage.allBrandsLabel}</span>
                    <div className="filter-pills-row">
                      <button
                        type="button"
                        className={`filter-pill-btn${selectedBrand === "all" ? " is-active" : ""}`}
                        onClick={() => {
                          setSelectedBrand("all");
                          setCatalogPage(1);
                        }}
                      >
                        {localeContent.productsPage.allBrandsLabel} ({catalogApi.stats.totalSkus})
                      </button>
                      {catalogApi.brands.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className={`filter-pill-btn${selectedBrand === b.slug ? " is-active" : ""}`}
                          onClick={() => {
                            setSelectedBrand(b.slug);
                            setCatalogPage(1);
                          }}
                        >
                          <span>{locale === "zh" ? b.nameZh : b.nameEn}</span>
                          <span className="tabular-num" style={{ opacity: 0.78 }}>
                            ({b.skuCount})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="filter-group-label">{localeContent.productsPage.allCategoriesLabel}</span>
                    <div className="filter-pills-row">
                      <button
                        type="button"
                        className={`filter-pill-btn${selectedCategory === "all" ? " is-active" : ""}`}
                        onClick={() => {
                          setSelectedCategory("all");
                          setCatalogPage(1);
                        }}
                      >
                        {localeContent.productsPage.allCategoriesLabel}
                      </button>
                      {(PRODUCT_CATEGORIES || catalogApi.categories).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`filter-pill-btn${selectedCategory === cat.id ? " is-active" : ""}`}
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setCatalogPage(1);
                          }}
                        >
                          <span>{locale === "zh" ? cat.nameZh : cat.nameEn}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <ProductSpecTable
                  locale={locale}
                  items={catalogResult.items}
                  brandMap={brandMap}
                  tableCopy={localeContent.productsPage}
                  mpnCopy={localeContent.mpnSearch}
                  bomItems={bomItems}
                  onAddBom={handleAddBom}
                  onRequestCustomMpn={handleRequestCustomMpn}
                  activeQuery={catalogQuery}
                  activeBrandName={
                    activeBrandObj
                      ? locale === "zh"
                        ? `${activeBrandObj.nameZh} (${activeBrandObj.nameEn})`
                        : activeBrandObj.nameEn
                      : ""
                  }
                  pagination={{
                    page: catalogResult.page,
                    totalPages: catalogResult.totalPages,
                    total: catalogResult.total,
                    onPageChange: (nextP) => {
                      setCatalogPage(nextP);
                      window.scrollTo({ top: 280, behavior: "smooth" });
                    },
                  }}
                />

                <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--text-muted)" }}>
                  {localeContent.productsPage.ssrNote}
                </p>
              </div>
            </section>
          </>
        )}

        {route === "solutions" && (
          <>
            <section className="page-hero blueprint-surface">
              <div className="ou-container">
                <nav className="breadcrumb-bar" aria-label="Breadcrumb">
                  <a href={routeHref(locale, "home")} onClick={handleInlineLink(routeHref(locale, "home"))}>
                    {localeContent.nav.home}
                  </a>
                  <span>/</span>
                  <span>{localeContent.nav.solutions}</span>
                </nav>
                <div className="eyebrow-tag">{localeContent.solutions.eyebrow}</div>
                <h1>{localeContent.solutions.heading}</h1>
                <p className="page-lead">{localeContent.solutions.lead}</p>
              </div>
            </section>

            <section className="ou-section">
              <div className="ou-container">
                <div className="pillars-grid-2x2">
                  {localeContent.solutions.pillars.map((pillar) => (
                    <article key={pillar.id} className="solution-card">
                      <span className="solution-code">{pillar.code}</span>
                      <span className="solution-audience">{pillar.audience}</span>
                      <h2>{pillar.title}</h2>
                      <p>{pillar.summary}</p>
                      <ul className="deliverables-list">
                        {pillar.deliverables.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="ou-section ou-section-alt">
              <div className="ou-container">
                <div className="section-header">
                  <h2>{localeContent.solutions.matrixTitle}</h2>
                  <p>{localeContent.solutions.matrixSubtitle}</p>
                </div>

                <div className="spec-table-card">
                  <table className="subsystem-table">
                    <thead>
                      <tr>
                        <th scope="col">{localeContent.solutions.matrixHeaders.subsystem}</th>
                        <th scope="col">{localeContent.solutions.matrixHeaders.environment}</th>
                        <th scope="col">{localeContent.solutions.matrixHeaders.brands}</th>
                        <th scope="col">{localeContent.solutions.matrixHeaders.support}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localeContent.solutions.subsystemMatrix.map((row, idx) => (
                        <tr key={idx}>
                          <td data-label={localeContent.solutions.matrixHeaders.subsystem}>
                            <strong style={{ color: "var(--ou-navy)" }}>{row.subsystem}</strong>
                          </td>
                          <td data-label={localeContent.solutions.matrixHeaders.environment}>
                            {row.environment}
                          </td>
                          <td data-label={localeContent.solutions.matrixHeaders.brands}>
                            {row.brands}
                          </td>
                          <td data-label={localeContent.solutions.matrixHeaders.support}>
                            {row.support}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="ou-section">
              <div className="ou-container">
                <div className="section-header">
                  <div className="eyebrow-tag">{localeContent.homeSections.faqEyebrow}</div>
                  <h2>{localeContent.homeSections.faqTitle}</h2>
                </div>
                <FaqAccordion faqs={localeContent.faqs} />
              </div>
            </section>
          </>
        )}

        {route === "quality" && (
          <>
            <section className="page-hero blueprint-surface">
              <div className="ou-container">
                <nav className="breadcrumb-bar" aria-label="Breadcrumb">
                  <a href={routeHref(locale, "home")} onClick={handleInlineLink(routeHref(locale, "home"))}>
                    {localeContent.nav.home}
                  </a>
                  <span>/</span>
                  <span>{localeContent.nav.quality}</span>
                </nav>
                <div className="eyebrow-tag">{localeContent.quality.eyebrow}</div>
                <h1>{localeContent.quality.heading}</h1>
                <p className="page-lead">{localeContent.quality.lead}</p>
              </div>
            </section>

            <section className="ou-section">
              <div className="ou-container">
                <QualityPipeline qualityCopy={localeContent.quality} />
              </div>
            </section>

            <section className="ou-section ou-section-alt">
              <div className="ou-container">
                <div className="section-header">
                  <div className="eyebrow-tag">{localeContent.homeSections.faqEyebrow}</div>
                  <h2>{localeContent.homeSections.faqTitle}</h2>
                </div>
                <FaqAccordion faqs={localeContent.faqs} />
              </div>
            </section>
          </>
        )}

        {route === "about" && (
          <>
            <section className="page-hero blueprint-surface">
              <div className="ou-container">
                <nav className="breadcrumb-bar" aria-label="Breadcrumb">
                  <a href={routeHref(locale, "home")} onClick={handleInlineLink(routeHref(locale, "home"))}>
                    {localeContent.nav.home}
                  </a>
                  <span>/</span>
                  <span>{localeContent.nav.about}</span>
                </nav>
                <div className="eyebrow-tag">{localeContent.about.eyebrow}</div>
                <h1>{localeContent.about.heading}</h1>
                <p className="page-lead">{localeContent.about.lead}</p>
              </div>
            </section>

            <section className="ou-section">
              <div className="ou-container">
                <div className="about-story-grid">
                  <div className="contact-info-card">
                    {localeContent.about.storyParagraphs.map((para, idx) => (
                      <p
                        key={idx}
                        style={{
                          fontSize: 15.5,
                          lineHeight: 1.72,
                          color: "var(--text-body)",
                          margin: idx === 0 ? "0 0 16px" : 0,
                        }}
                      >
                        {para}
                      </p>
                    ))}

                    <div
                      style={{
                        marginTop: 24,
                        paddingTop: 20,
                        borderTop: "1px solid var(--border-subtle)",
                      }}
                    >
                      <h2 style={{ fontSize: 18, margin: "0 0 12px", color: "var(--ou-navy)" }}>
                        {localeContent.about.headquartersTitle}
                      </h2>
                      <p style={{ margin: "0 0 6px", fontSize: 14.5, display: "flex", alignItems: "center", gap: 8 }}>
                        <MapPin size={16} color="var(--ou-volt-orange)" aria-hidden="true" />
                        <span>{locale === "zh" ? contact.addressZh : contact.addressEn}</span>
                      </p>
                      <p className="mpn-code" style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)" }}>
                        Tel: {contact.phone} / {contact.salesPhone} · {contact.email}
                      </p>
                    </div>
                  </div>

                  <div className="milestone-list">
                    {localeContent.about.milestones.map((ms) => (
                      <div key={ms.year} className="milestone-item">
                        <span className="milestone-year">{ms.year}</span>
                        <h3 style={{ margin: "4px 0 6px", fontSize: 16, color: "var(--ou-navy)" }}>
                          {ms.title}
                        </h3>
                        <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-body)" }}>
                          {ms.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="ou-section ou-section-alt">
              <div className="ou-container">
                <div className="section-header">
                  <div className="eyebrow-tag">{localeContent.about.careersEyebrow}</div>
                  <h2>{localeContent.about.careersTitle}</h2>
                  <p>{localeContent.about.careersLead}</p>
                </div>

                <div className="careers-grid">
                  {localeContent.about.careers.map((job) => (
                    <article key={job.id} className="career-card">
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ou-cyber-dark)", fontWeight: 700 }}>
                        <Briefcase size={14} aria-hidden="true" />
                        <span>{job.type}</span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: 17, color: "var(--ou-navy)" }}>{job.title}</h3>
                      <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-muted)" }}>
                        <MapPin size={13} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />
                        {job.location}
                      </p>
                      <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-body)" }}>
                        {job.responsibilities}
                      </p>
                      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-muted)" }}>
                        {job.requirements}
                      </p>
                      <a
                        href={`mailto:${contact.email}?subject=${encodeURIComponent(`[Job Application] ${job.title}`)}`}
                        className="btn-navy-outline"
                        style={{ marginTop: "auto", minHeight: 38, fontSize: 13 }}
                      >
                        <Mail size={14} aria-hidden="true" />
                        <span>{localeContent.about.applyAction}</span>
                      </a>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {route === "contact" && (
          <>
            <section className="page-hero blueprint-surface">
              <div className="ou-container">
                <nav className="breadcrumb-bar" aria-label="Breadcrumb">
                  <a href={routeHref(locale, "home")} onClick={handleInlineLink(routeHref(locale, "home"))}>
                    {localeContent.nav.home}
                  </a>
                  <span>/</span>
                  <span>{localeContent.nav.contact}</span>
                </nav>
                <div className="eyebrow-tag">{localeContent.contact.eyebrow}</div>
                <h1>{localeContent.contact.heading}</h1>
                <p className="page-lead">{localeContent.contact.lead}</p>
              </div>
            </section>

            <section className="ou-section">
              <div className="ou-container">
                <div className="contact-layout-grid">
                  {/* Direct Verified Shanghai Contact Card */}
                  <aside className="contact-info-card">
                    <h2 style={{ margin: "0 0 18px", fontSize: 20, color: "var(--ou-navy)" }}>
                      {localeContent.contact.directChannelsTitle}
                    </h2>
                    <dl className="contact-dl">
                      <div>
                        <dt>{localeContent.contact.labels.salesPhone}</dt>
                        <dd>
                          <a href={`tel:${contact.salesPhone}`} className="mpn-code" style={{ color: "var(--ou-volt-orange)" }}>
                            {contact.salesPhone}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt>{localeContent.contact.labels.phone}</dt>
                        <dd>
                          <a href={`tel:${contact.phone}`} className="mpn-code">
                            {contact.phone}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt>{localeContent.contact.labels.email}</dt>
                        <dd>
                          <a href={`mailto:${contact.email}`} className="mpn-code" style={{ color: "var(--ou-cyber-dark)" }}>
                            {contact.email}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt>{localeContent.contact.labels.qq}</dt>
                        <dd className="mpn-code">{contact.qq}</dd>
                      </div>
                      <div>
                        <dt>{localeContent.contact.labels.address}</dt>
                        <dd>{locale === "zh" ? contact.addressZh : contact.addressEn}</dd>
                      </div>
                      <div>
                        <dt>{localeContent.contact.labels.hours}</dt>
                        <dd>{locale === "zh" ? contact.hoursZh : contact.hoursEn}</dd>
                      </div>
                    </dl>

                    <div
                      style={{
                        marginTop: 22,
                        paddingTop: 18,
                        borderTop: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <img
                        src={brand.wechatQr}
                        alt={localeContent.contact.labels.wechat}
                        width="84"
                        height="84"
                        style={{ borderRadius: 6, border: "1px solid var(--border-subtle)" }}
                      />
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        <strong style={{ display: "block", color: "var(--ou-navy)", marginBottom: 4 }}>
                          {localeContent.contact.labels.wechat}
                        </strong>
                        <span>
                          {locale === "zh"
                            ? "微信扫码联系欧连商务客服获取实时现货支持"
                            : "Scan WeChat QR code for direct engineering support"}
                        </span>
                      </div>
                    </div>
                  </aside>

                  {/* Structured Multi-MPN BOM RFQ Form */}
                  <div className="rfq-form-card">
                    <h2 style={{ margin: "0 0 6px", fontSize: 22, color: "var(--ou-navy)" }}>
                      {localeContent.contact.formTitle}
                    </h2>
                    <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-muted)" }}>
                      {localeContent.contact.formSubtitle}
                    </p>

                    <form action="/api/inquiry" method="post" onSubmit={handleRfqSubmit} noValidate>
                      {/* Honeypot field hidden from human users */}
                      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
                        <label htmlFor="rfq-website-hp">Website</label>
                        <input
                          id="rfq-website-hp"
                          type="text"
                          name="website"
                          tabIndex={-1}
                          autoComplete="off"
                          value={rfqHoneypot}
                          onChange={(e) => setRfqHoneypot(e.target.value)}
                        />
                      </div>

                      {bomItems.length > 0 ? (
                        <div className="attached-bom-box">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <strong style={{ fontSize: 13, color: "var(--ou-navy)" }}>
                              {localeContent.contact.fields.bomList} ({bomItems.length})
                            </strong>
                            <button
                              type="button"
                              onClick={handleClearBom}
                              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}
                            >
                              {localeContent.bomDrawer.clearAll}
                            </button>
                          </div>
                          {bomItems.map((item) => (
                            <div key={item.mpn} className="attached-bom-item">
                              <div>
                                <strong className="mpn-code" style={{ color: "var(--ou-navy)", marginRight: 8 }}>
                                  {item.mpn}
                                </strong>
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.brand}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  aria-label={`Qty ${item.mpn}`}
                                  onChange={(e) => handleUpdateBomQty(item.mpn, e.target.value)}
                                  className="qty-input"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBomItem(item.mpn)}
                                  aria-label={`Remove ${item.mpn}`}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                                >
                                  <Trash2 size={15} aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="form-row-2">
                        <div className="form-field">
                          <label htmlFor="rfq-name">{localeContent.contact.fields.name}</label>
                          <input
                            id="rfq-name"
                            name="name"
                            type="text"
                            required
                            value={rfqName}
                            onChange={(e) => setRfqName(e.target.value)}
                            placeholder={localeContent.contact.fields.namePlaceholder}
                            className="form-control"
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor="rfq-company">{localeContent.contact.fields.company}</label>
                          <input
                            id="rfq-company"
                            name="company"
                            type="text"
                            value={rfqCompany}
                            onChange={(e) => setRfqCompany(e.target.value)}
                            placeholder={localeContent.contact.fields.companyPlaceholder}
                            className="form-control"
                          />
                        </div>
                      </div>

                      <div className="form-row-2">
                        <div className="form-field">
                          <label htmlFor="rfq-contact">{localeContent.contact.fields.contact}</label>
                          <input
                            id="rfq-contact"
                            name="contact"
                            type="text"
                            required
                            value={rfqContact}
                            onChange={(e) => setRfqContact(e.target.value)}
                            placeholder={localeContent.contact.fields.contactPlaceholder}
                            className="form-control"
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor="rfq-customer-type">{localeContent.contact.fields.customerType}</label>
                          <select
                            id="rfq-customer-type"
                            name="customerType"
                            value={rfqCustomerType}
                            onChange={(e) => setRfqCustomerType(e.target.value)}
                            className="form-control"
                          >
                            {localeContent.contact.fields.customerTypes.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="form-field">
                        <label htmlFor="rfq-inquiry-type">{localeContent.contact.fields.inquiryType}</label>
                        <select
                          id="rfq-inquiry-type"
                          name="inquiryType"
                          value={rfqInquiryType}
                          onChange={(e) => setRfqInquiryType(e.target.value)}
                          className="form-control"
                        >
                          {localeContent.contact.fields.inquiryTypes.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-field">
                        <label htmlFor="rfq-bom-text">{localeContent.contact.fields.bomText}</label>
                        <textarea
                          id="rfq-bom-text"
                          name="bomText"
                          value={rfqBomText}
                          onChange={(e) => {
                            setRfqBomTextTouched(true);
                            setRfqBomText(e.target.value);
                          }}
                          placeholder={localeContent.contact.fields.bomTextPlaceholder}
                          className="form-control"
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="rfq-message">{localeContent.contact.fields.message}</label>
                        <textarea
                          id="rfq-message"
                          name="message"
                          value={rfqMessage}
                          onChange={(e) => setRfqMessage(e.target.value)}
                          placeholder={localeContent.contact.fields.messagePlaceholder}
                          className="form-control"
                          style={{ fontFamily: "var(--font-sans)", minHeight: 88 }}
                        />
                      </div>

                      <div className="form-field" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <input
                          id="rfq-consent"
                          name="consent"
                          type="checkbox"
                          required
                          checked={rfqConsent}
                          onChange={(e) => setRfqConsent(e.target.checked)}
                          style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
                        />
                        <label htmlFor="rfq-consent" style={{ fontWeight: 400, fontSize: 13, color: "var(--text-body)", margin: 0 }}>
                          {localeContent.contact.fields.consent}
                        </label>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                        <button
                          type="submit"
                          className="btn-volt"
                          disabled={rfqStatus === "submitting"}
                        >
                          <span>
                            {rfqStatus === "submitting"
                              ? localeContent.contact.fields.submitting
                              : localeContent.contact.fields.submit}
                          </span>
                          <ArrowRight size={15} aria-hidden="true" />
                        </button>

                        <a href={mailtoHref} className="btn-navy-outline">
                          <Mail size={15} aria-hidden="true" />
                          <span>{contact.email}</span>
                        </a>
                      </div>

                      <div role="status" aria-live="polite">
                        {rfqStatus === "validation_error" ? (
                          <div className="honest-fallback-panel">
                            <strong style={{ color: "var(--ou-navy)", fontSize: 14 }}>
                              {localeContent.contact.feedback.validationError}
                            </strong>
                          </div>
                        ) : null}

                        {rfqStatus === "success" ? (
                          <div className="success-panel">
                            <strong style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ou-navy)", marginBottom: 4 }}>
                              <CheckCircle2 size={18} color="var(--ou-cyber-dark)" aria-hidden="true" />
                              <span>{localeContent.contact.feedback.successTitle}</span>
                            </strong>
                            <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-body)" }}>
                              {localeContent.contact.feedback.successBody}
                            </p>
                          </div>
                        ) : null}

                        {rfqStatus === "fallback" ? (
                          <div className="honest-fallback-panel">
                            <h3 style={{ margin: "0 0 6px", fontSize: 15, color: "var(--ou-navy)" }}>
                              {localeContent.contact.feedback.fallbackTitle}
                            </h3>
                            <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--text-body)" }}>
                              {localeContent.contact.feedback.fallbackBody}
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                              <button
                                type="button"
                                className="btn-navy-outline"
                                onClick={handleCopyFallback}
                              >
                                <Copy size={14} aria-hidden="true" />
                                <span>
                                  {copiedFallback
                                    ? localeContent.contact.feedback.copiedBomButton
                                    : localeContent.contact.feedback.copyBomButton}
                                </span>
                              </button>
                              <a href={mailtoHref} className="btn-volt">
                                <Mail size={14} aria-hidden="true" />
                                <span>{localeContent.contact.feedback.mailtoButton}</span>
                              </a>
                              <a href={`tel:${contact.salesPhone}`} className="btn-navy-outline">
                                <PhoneCall size={14} aria-hidden="true" />
                                <span>{localeContent.contact.feedback.callButton}</span>
                              </a>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {route === "notFound" && (
          <section className="ou-section blueprint-surface" style={{ minHeight: "62vh" }}>
            <div className="ou-container">
              <div className="rfq-form-card" style={{ maxWidth: 760, marginInline: "auto", borderTop: "4px solid var(--ou-volt-orange)" }}>
                <span className="eyebrow-tag">HTTP 404 · ROUTE NOT FOUND</span>
                <h1>{localeContent.notFound.title}</h1>
                <p className="page-lead">{localeContent.notFound.description}</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <a
                    href={routeHref(locale, "products")}
                    className="btn-volt"
                    onClick={handleInlineLink(routeHref(locale, "products"))}
                  >
                    <span>{localeContent.notFound.catalogAction}</span>
                  </a>
                  <a
                    href={routeHref(locale, "home")}
                    className="btn-navy-outline"
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
