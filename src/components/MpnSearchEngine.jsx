import React, { memo, useMemo } from "react";
import { Search, X, Plus, Check, ArrowRight } from "lucide-react";
import { routeHref } from "../routing.js";

export const MpnSearchEngine = memo(function MpnSearchEngine({
  locale = "zh",
  mode = "hero",
  query = "",
  onQueryChange,
  searchResults = null,
  mpnCopy,
  catalogCopy = null,
  bomItems = [],
  onAddBom,
  onRequestCustomMpn,
  onNavigate,
  inputRef,
}) {
  const bomMpnSet = useMemo(() => new Set(bomItems.map((entry) => entry.mpn)), [bomItems]);
  const isInBom = (mpn) => bomMpnSet.has(mpn);
  const catalogUrl = `${routeHref(locale, "products")}${
    query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""
  }`;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (mode === "hero" && onNavigate) {
      onNavigate(catalogUrl);
    }
  };

  const placeholderText =
    mode === "catalog" && catalogCopy?.searchPlaceholder
      ? catalogCopy.searchPlaceholder
      : mpnCopy.placeholder;
  const submitButtonText =
    mode === "catalog" && catalogCopy?.searchButton
      ? catalogCopy.searchButton
      : mpnCopy.buttonText;
  const quickQueries =
    mode === "catalog" && Array.isArray(catalogCopy?.recentQueries)
      ? catalogCopy.recentQueries
      : mpnCopy.hotQueries || [];
  const quickLabel =
    mode === "catalog" && catalogCopy?.recentLabel
      ? `${catalogCopy.recentLabel}：`
      : mpnCopy.hotLabel;

  return (
    <div className={`mpn-search-module is-${mode}`}>
      <form
        className="mpn-search-form"
        action={routeHref(locale, "products")}
        method="get"
        role="search"
        onSubmit={handleSubmit}
      >
        <div className="mpn-input-wrap">
          <Search size={16} className="mpn-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholderText}
            aria-label={mpnCopy.label || placeholderText}
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
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <button type="submit" className="btn-primary mpn-submit-btn">
          <span>{submitButtonText}</span>
        </button>
      </form>

      {mode === "catalog" && quickQueries.length > 0 ? (
        <div className="mpn-recent-row">
          <span className="mpn-recent-label">{quickLabel}</span>
          {quickQueries.map((sample) => (
            <button
              key={sample}
              type="button"
              className="mpn-recent-chip"
              onClick={() => onQueryChange(sample)}
            >
              {sample}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "hero" && query.trim().length > 0 && searchResults ? (
        <div className="mpn-inline-results" aria-live="polite">
          {searchResults.total > 0 ? (
            <>
              <div className="mpn-results-bar">
                <span>
                  {mpnCopy.resultCountPrefix}：{" "}
                  <strong className="mpn-code">{searchResults.total}</strong>
                </span>
                <a
                  href={catalogUrl}
                  className="editorial-text-link"
                  onClick={(event) => {
                    if (onNavigate) {
                      event.preventDefault();
                      onNavigate(catalogUrl);
                    }
                  }}
                >
                  <span>{mpnCopy.viewAllText}</span>
                </a>
              </div>
              <div className="mpn-result-list">
                {searchResults.items.slice(0, 6).map((item) => {
                  const added = isInBom(item.mpn);
                  return (
                    <div key={item.id} className={`mpn-result-row${added ? " is-selected" : ""}`}>
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
                        <span className="tabular-num mpn-result-price">
                          {Number(item.stockQty).toLocaleString()} PCS
                        </span>
                        <button
                          type="button"
                          className={`add-bom-btn${added ? " is-added" : ""}`}
                          onClick={() => onAddBom(item)}
                        >
                          {added ? <Check size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
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
                {mpnCopy.noMatchTitle}：<span className="mpn-code">&ldquo;{query.trim()}&rdquo;</span>
              </h3>
              <p>{mpnCopy.noMatchBody}</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => onRequestCustomMpn(query.trim())}
              >
                <span>{mpnCopy.noMatchAction}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
});
