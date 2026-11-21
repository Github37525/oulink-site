import React from "react";
import { ArrowRight } from "lucide-react";
import { routeHref } from "../routing.js";

export function BrandMatrix({
  locale = "zh",
  brands = [],
  brandCopy,
  onSelectBrand,
  onNavigate,
}) {
  const handleBrandClick = (brand) => (event) => {
    const targetHref = `${routeHref(locale, "products")}?brand=${encodeURIComponent(brand.slug)}`;
    if (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      if (onSelectBrand) {
        event.preventDefault();
        onSelectBrand(brand.slug, targetHref);
        return;
      }
      if (onNavigate) {
        event.preventDefault();
        onNavigate(targetHref);
      }
    }
  };

  return (
    <div className="brand-matrix-grid">
      {brands.map((brand) => {
        const isAuth = brand.tier === "authorized";
        const targetHref = `${routeHref(locale, "products")}?brand=${encodeURIComponent(brand.slug)}`;
        const displayName =
          locale === "zh"
            ? `${brand.nameZh} (${brand.nameEn})`
            : brand.nameEn;
        const seriesText =
          locale === "zh" ? brand.seriesSummaryZh : brand.seriesSummaryEn;

        return (
          <a
            key={brand.id}
            href={targetHref}
            className={`brand-card ${isAuth ? "is-authorized" : "is-partner"}`}
            onClick={handleBrandClick(brand)}
          >
            <div>
              <div className="brand-card-top">
                <span className={`tier-pill ${isAuth ? "authorized" : "partner"}`}>
                  {isAuth ? brandCopy.authorizedBadge : brandCopy.partnerBadge}
                </span>
                <span className="brand-sku-pill">
                  {brand.skuCount > 0
                    ? `${brand.skuCount} SKU`
                    : locale === "zh"
                      ? "支持订货"
                      : "Orderable"}
                </span>
              </div>

              <div className="brand-logo-viewport">
                <img
                  src={brand.logoPath}
                  alt={displayName}
                  width="180"
                  height="60"
                />
              </div>

              <h3 className="brand-card-name">{displayName}</h3>
              <p className="brand-card-series">{seriesText}</p>
            </div>

            <span className="brand-card-cta">
              <span>{brandCopy.filterAction}</span>
              <ArrowRight size={13} aria-hidden="true" />
            </span>
          </a>
        );
      })}
    </div>
  );
}
