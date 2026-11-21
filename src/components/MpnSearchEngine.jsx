import React from "react";
import { Search, X, Plus, Check, ArrowRight } from "lucide-react";
import { routeHref } from "../routing.js";

export function MpnSearchEngine({
  locale = "zh",
  mode = "hero", // "hero" shows inline dropdown results; "catalog" drives main table directly
  query = "",
  onQueryChange,
  searchResults = null,
  mpnCopy,
  bomItems = [],
  onAddBom,
  onRequestCustomMpn,
  onNavigate,
  inputRef,
}) {
  const isInBom = (mpn) => bomItems.some((entry) => entry.mpn === mpn);
  const catalogUrl = `${routeHref(locale, "products")}${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (mode === "hero" && onNavigate) {
      onNavigate(catalogUrl);
    }
  };

  return (
    <div className="mpn-engine-card">
      <div className="mpn-engine-header">
        <span className="mpn-engine-badge">{mpnCopy.badge}</span>
      </div>

      <form
        className="mpn-search-form"
        action={routeHref(locale, "products")}
        method="get"
        role="search"
        onSubmit={handleSubmit}
      >
        <div className="mpn-input-wrap">
          <Search size={18} className="mpn-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={mpnCopy.placeholder}
            aria-label={mpnCopy.label}
            autoComplete="off"
            className="mpn-search-input"
          />
          {query ? (
            <button
              type="button"
              className="mpn-clear-btn"
              onClick={() => onQueryChange("")}
              aria-label={mpnCopy.clearText}
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <button type="submit" className="btn-volt" style={{ flexShrink: 0 }}>
          <span>{mpnCopy.buttonText}</span>
        </button>
      </form>

      <div className="mpn-hot-chips">
        <span>{mpnCopy.hotLabel}</span>
        {mpnCopy.hotQueries.map((sample) => (
          <button
            key={sample}
            type="button"
            className="mpn-chip-btn"
            onClick={() => onQueryChange(sample)}
          >
            {sample}
          </button>
        ))}
      </div>

      {mode === "hero" && query.trim().length > 0 && searchResults ? (
        <div className="mpn-inline-results" aria-live="polite">
          {searchResults.total > 0 ? (
            <>
              <div className="mpn-results-bar">
                <span>
                  {mpnCopy.resultCountPrefix}:{" "}
                  <strong className="mpn-code">{searchResults.total}</strong> SKU
                </span>
                <a
                  href={catalogUrl}
                  onClick={(event) => {
                    if (onNavigate) {
                      event.preventDefault();
                      onNavigate(catalogUrl);
                    }
                  }}
                  style={{ color: "var(--ou-cyber-dark)", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <span>{mpnCopy.viewAllText}</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
              <div className="mpn-result-list">
                {searchResults.items.slice(0, 6).map((item) => {
                  const added = isInBom(item.mpn);
                  return (
                    <div key={item.id} className="mpn-result-row">
                      <div className="mpn-result-main">
                        <span className="mpn-result-code">{item.mpn}</span>
                        <span className="mpn-result-brand">
                          {locale === "zh" ? item.brandNameZh : item.brandNameEn}
                        </span>
                        <span className="mpn-result-meta">
                          {locale === "zh" ? item.categoryZh : item.categoryEn} · {item.series}
                        </span>
                      </div>
                      <div className="mpn-result-actions">
                        <span className="tabular-num" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                          {item.stockQty.toLocaleString()} PCS · ¥{Number(item.priceCny).toFixed(4)}
                        </span>
                        <button
                          type="button"
                          className={`add-bom-btn${added ? " is-added" : ""}`}
                          onClick={() => onAddBom(item)}
                        >
                          {added ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                          <span>{added ? mpnCopy.addedBomText : mpnCopy.addBomText}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mpn-no-match-box">
              <h3>
                {mpnCopy.noMatchTitle}: <span className="mpn-code">&ldquo;{query.trim()}&rdquo;</span>
              </h3>
              <p>{mpnCopy.noMatchBody}</p>
              <button
                type="button"
                className="btn-volt"
                onClick={() => onRequestCustomMpn(query.trim())}
              >
                <span>{mpnCopy.noMatchAction}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
