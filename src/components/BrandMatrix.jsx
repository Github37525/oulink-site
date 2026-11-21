import React from "react";
import { routeHref } from "../routing.js";

export function BrandMatrix({
  locale = "zh",
  brands = [],
  brandCopy,
  onSelectBrand,
  onNavigate,
}) {
  const catalogHref = routeHref(locale, "products");

  const handleBrandClick = (slug) => (event) => {
    const targetHref = `${catalogHref}?brand=${encodeURIComponent(slug)}`;
    if (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      if (onSelectBrand) {
        event.preventDefault();
        onSelectBrand(slug, targetHref);
        return;
      }
      if (onNavigate) {
        event.preventDefault();
        onNavigate(targetHref);
      }
    }
  };

  const handleAllClick = (event) => {
    if (
      onNavigate &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      onNavigate(catalogHref);
    }
  };

  const byId = new Map();
  for (const b of brands) {
    byId.set(String(b.id).toLowerCase(), b);
    byId.set(String(b.slug).toLowerCase(), b);
  }

  const authSpec = brandCopy?.authorizedSection;
  const partnerSpec = brandCopy?.partnerSection;

  // Resolve 5 authorized brands in exact Image 2.6 editorial order, falling back cleanly if custom brands are injected
  const resolvedAuth = [];
  const usedIds = new Set();

  if (Array.isArray(authSpec?.items)) {
    for (const item of authSpec.items) {
      const matched = byId.get(String(item.id).toLowerCase());
      if (matched) {
        usedIds.add(matched.id);
        resolvedAuth.push({
          brand: matched,
          label: item.label || (locale === "zh" ? matched.nameZh : matched.nameEn),
        });
      }
    }
  }
  for (const b of brands) {
    if (b.tier === "authorized" && !usedIds.has(b.id)) {
      usedIds.add(b.id);
      resolvedAuth.push({
        brand: b,
        label: locale === "zh" ? b.nameZh : b.nameEn,
      });
    }
  }

  const resolvedPartners = [];
  if (Array.isArray(partnerSpec?.items)) {
    for (const item of partnerSpec.items) {
      const matched = byId.get(String(item.id).toLowerCase());
      if (matched && !usedIds.has(matched.id)) {
        usedIds.add(matched.id);
        resolvedPartners.push({
          brand: matched,
          label: item.label || (locale === "zh" ? matched.nameZh : matched.nameEn),
          badge: item.badge || "",
        });
      }
    }
  }
  for (const b of brands) {
    if (!usedIds.has(b.id)) {
      usedIds.add(b.id);
      resolvedPartners.push({
        brand: b,
        label: locale === "zh" ? b.nameZh : b.nameEn,
        badge: "",
      });
    }
  }

  const cardCta = authSpec?.cardAction || brandCopy?.filterAction || "品牌产品 →";

  return (
    <div className="brand-editorial-sections">
      {/* 1. Authorized Brands (5-Column Strip) */}
      <div className="brand-tier-block">
        <div className="editorial-section-head">
          <div>
            <span className="gold-top-rule" aria-hidden="true" />
            <h2>{authSpec?.title || brandCopy?.title}</h2>
            {authSpec?.subtitle ? <p>{authSpec.subtitle}</p> : null}
          </div>
          <a href={catalogHref} className="editorial-text-link" onClick={handleAllClick}>
            {authSpec?.actionText || brandCopy?.allBrandsAction}
          </a>
        </div>

        <div className="authorized-brands-grid">
          {resolvedAuth.map(({ brand, label }) => {
            const targetHref = `${catalogHref}?brand=${encodeURIComponent(brand.slug)}`;
            return (
              <a
                key={brand.id}
                href={targetHref}
                className="brand-card is-authorized"
                onClick={handleBrandClick(brand.slug)}
              >
                <div className="brand-logo-viewport">
                  <img
                    src={brand.logoPath}
                    alt={`${brand.nameEn} ${brand.nameZh || ""}`.trim()}
                    width="168"
                    height="56"
                  />
                </div>
                <div className="brand-auth-meta">
                  <span className="brand-auth-label">{label}</span>
                  <span className="brand-auth-link">{cardCta}</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* 2. Partner & Distribution Brands (4x3 12-Cell Hairline Matrix) */}
      {resolvedPartners.length > 0 ? (
        <div className="brand-tier-block is-partner-tier">
          <div className="editorial-section-head">
            <div>
              <h2>{partnerSpec?.title || brandCopy?.partnerBadge}</h2>
              {partnerSpec?.subtitle ? <p>{partnerSpec.subtitle}</p> : null}
            </div>
            <a href={catalogHref} className="editorial-text-link" onClick={handleAllClick}>
              {partnerSpec?.actionText || brandCopy?.allBrandsAction}
            </a>
          </div>

          <div className="partner-brands-grid">
            {resolvedPartners.map(({ brand, label, badge }) => {
              const targetHref = `${catalogHref}?brand=${encodeURIComponent(brand.slug)}`;
              return (
                <a
                  key={brand.id}
                  href={targetHref}
                  className="brand-item partner-cell"
                  onClick={handleBrandClick(brand.slug)}
                >
                  <div className="partner-logo-viewport">
                    <img
                      src={brand.logoPath}
                      alt={`${brand.nameEn} ${brand.nameZh || ""}`.trim()}
                      width="144"
                      height="48"
                    />
                  </div>
                  <div className="partner-cell-caption">
                    <span className="partner-cell-name">{label}</span>
                    {badge ? <span className="partner-cell-badge">{badge}</span> : null}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
