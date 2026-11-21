import React from "react";
import { Plus, Check, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

function buildPageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export function ProductSpecTable({
  locale = "zh",
  items = [],
  tableCopy,
  mpnCopy,
  bomItems = [],
  onAddBom,
  onToggleBom,
  onRequestCustomMpn,
  activeQuery = "",
  activeBrandName = "",
  pagination = null,
}) {
  const headers = tableCopy.tableHeaders || {};
  const isInBom = (mpn) => bomItems.some((entry) => entry.mpn === mpn);

  const handleToggle = (item) => {
    if (onToggleBom) {
      onToggleBom(item);
    } else if (onAddBom) {
      onAddBom(item);
    }
  };

  if (items.length === 0) {
    const targetLabel =
      activeQuery ||
      activeBrandName ||
      (locale === "zh" ? "定制连接器型号" : "Custom Connector MPN");
    return (
      <div className="spec-table-sheet is-empty">
        <div className="mpn-no-match-box">
          <h3>
            {mpnCopy.noMatchTitle}
            {activeQuery || activeBrandName ? (
              <>
                ：{" "}
                <span className="mpn-code">
                  &ldquo;{activeQuery || activeBrandName}&rdquo;
                </span>
              </>
            ) : null}
          </h3>
          <p>{mpnCopy.noMatchBody}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onRequestCustomMpn?.(targetLabel)}
          >
            <span>{mpnCopy.noMatchAction}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  const pageTokens =
    pagination && pagination.totalPages > 1
      ? buildPageNumbers(pagination.page, pagination.totalPages)
      : [];

  const addText = tableCopy.addBomButton || mpnCopy.addBomText || "+ BOM";
  const addedText = tableCopy.addedBomButton || mpnCopy.addedBomText || "已加入";

  return (
    <div className="spec-table-sheet">
      <div className="table-scroll-wrap">
        <table className="spec-table">
          <thead>
            <tr>
              <th scope="col" className="check-col">
                <span className="sr-only">{headers.select || "Select"}</span>
              </th>
              <th scope="col">{headers.mpnBrand || headers.mpn}</th>
              <th scope="col">{headers.category}</th>
              <th scope="col" className="num-col">{headers.pack}</th>
              <th scope="col" className="num-col">{headers.stock}</th>
              <th scope="col" className="num-col">{headers.price}</th>
              <th scope="col" className="num-col action-col">{headers.action}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const added = isInBom(item.mpn);
              const brandLabel = locale === "zh" ? item.brandNameZh : item.brandNameEn;
              const categoryLabel = locale === "zh" ? item.categoryZh : item.categoryEn;

              return (
                <tr key={item.id} className={added ? "is-selected" : undefined}>
                  <td className="check-col">
                    <input
                      type="checkbox"
                      className="spec-row-checkbox"
                      checked={added}
                      onChange={() => handleToggle(item)}
                      aria-label={`${headers.select || "Select"} ${item.mpn}`}
                    />
                  </td>
                  <td>
                    <div className="spec-mpn-cell">
                      <span className="spec-mpn-primary">{item.mpn}</span>
                      <span className="spec-mpn-sub">
                        {brandLabel}
                        {item.batchYear ? ` · DC ${item.batchYear}` : ""}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="spec-cat-cell">
                      <span className="spec-cat-primary">{categoryLabel}</span>
                      {item.series ? (
                        <span className="spec-cat-series">{item.series}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="num-col tabular-num">
                    {item.spq} / {item.moq}
                  </td>
                  <td className="num-col tabular-num spec-stock-val">
                    {Number(item.stockQty).toLocaleString()}
                  </td>
                  <td className="num-col tabular-num spec-price-val">
                    ¥{Number(item.priceCny).toFixed(4)}
                  </td>
                  <td className="num-col action-col">
                    <button
                      type="button"
                      className={`add-bom-btn${added ? " is-added" : ""}`}
                      onClick={() => handleToggle(item)}
                    >
                      {added ? <Check size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
                      <span>{added ? addedText : addText}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="spec-table-footer">
        <p className="spec-disclaimer">
          {tableCopy.disclaimer || tableCopy.ssrNote}
        </p>

        {pagination && pagination.totalPages > 1 ? (
          <nav className="pagination-controls" aria-label="Pagination">
            <button
              type="button"
              className="page-nav-btn"
              disabled={pagination.page <= 1}
              aria-label={tableCopy.prevPage}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>

            {pageTokens.map((token, idx) =>
              token === "..." ? (
                <span key={`ellipsis-${idx}`} className="page-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={token}
                  type="button"
                  className={`page-num-btn${token === pagination.page ? " is-active" : ""}`}
                  aria-current={token === pagination.page ? "page" : undefined}
                  onClick={() => pagination.onPageChange(token)}
                >
                  {token}
                </button>
              )
            )}

            <button
              type="button"
              className="page-nav-btn"
              disabled={pagination.page >= pagination.totalPages}
              aria-label={tableCopy.nextPage}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
