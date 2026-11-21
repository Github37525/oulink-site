import React from "react";
import { Plus, Check, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

export function ProductSpecTable({
  locale = "zh",
  items = [],
  brandMap = new Map(),
  tableCopy,
  mpnCopy,
  bomItems = [],
  onAddBom,
  onRequestCustomMpn,
  activeQuery = "",
  activeBrandName = "",
  pagination = null, // { page, totalPages, total, onPageChange }
}) {
  const headers = tableCopy.tableHeaders;
  const isInBom = (mpn) => bomItems.some((entry) => entry.mpn === mpn);

  if (items.length === 0) {
    const targetLabel = activeQuery || activeBrandName || (locale === "zh" ? "定制连接器型号" : "Custom Connector MPN");
    return (
      <div className="spec-table-card" style={{ padding: 28 }}>
        <div className="mpn-no-match-box">
          <h3>
            {mpnCopy.noMatchTitle}
            {activeQuery || activeBrandName ? (
              <>
                :{" "}
                <span className="mpn-code">
                  &ldquo;{activeQuery || activeBrandName}&rdquo;
                </span>
              </>
            ) : null}
          </h3>
          <p>{mpnCopy.noMatchBody}</p>
          <button
            type="button"
            className="btn-volt"
            onClick={() => onRequestCustomMpn?.(targetLabel)}
          >
            <span>{mpnCopy.noMatchAction}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spec-table-card">
      <table className="spec-table">
        <thead>
          <tr>
            <th scope="col">{headers.mpn}</th>
            <th scope="col">{headers.brand}</th>
            <th scope="col">{headers.category}</th>
            <th scope="col" className="num-col">{headers.pack}</th>
            <th scope="col" className="num-col">{headers.stock}</th>
            <th scope="col" className="num-col">{headers.price}</th>
            <th scope="col" className="num-col">{headers.action}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const brandInfo = brandMap.get(String(item.brandId || "").toLowerCase());
            const added = isInBom(item.mpn);
            const brandLabel = locale === "zh" ? item.brandNameZh : item.brandNameEn;
            const categoryLabel = locale === "zh" ? item.categoryZh : item.categoryEn;

            return (
              <tr key={item.id}>
                <td data-label={headers.mpn}>
                  <div className="spec-mpn-cell">
                    <span className="spec-mpn-primary">{item.mpn}</span>
                    {item.batchYear ? (
                      <span className="spec-batch-tag">
                        DC {item.batchYear} · {tableCopy.inStockBadge}
                      </span>
                    ) : (
                      <span className="spec-batch-tag">{tableCopy.inStockBadge}</span>
                    )}
                  </div>
                </td>
                <td data-label={headers.brand}>
                  <div className="spec-brand-cell">
                    {brandInfo?.logoPath ? (
                      <span className="spec-brand-mini-logo">
                        <img
                          src={brandInfo.logoPath}
                          alt={brandLabel}
                          width="66"
                          height="22"
                        />
                      </span>
                    ) : null}
                    <span style={{ fontWeight: 600, color: "var(--ou-navy)" }}>
                      {brandLabel}
                    </span>
                  </div>
                </td>
                <td data-label={headers.category}>
                  <div>
                    <strong style={{ display: "block", fontSize: 13.5, color: "var(--ou-navy)" }}>
                      {categoryLabel}
                    </strong>
                    <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                      {item.series}
                    </span>
                  </div>
                </td>
                <td data-label={headers.pack} className="num-col tabular-num">
                  {item.spq} / {item.moq}
                </td>
                <td data-label={headers.stock} className="num-col tabular-num">
                  <strong style={{ color: "var(--ou-navy)" }}>
                    {Number(item.stockQty).toLocaleString()}
                  </strong>
                </td>
                <td data-label={headers.price} className="num-col tabular-num">
                  ¥{Number(item.priceCny).toFixed(4)}
                </td>
                <td className="num-col action-col">
                  <button
                    type="button"
                    className={`add-bom-btn${added ? " is-added" : ""}`}
                    onClick={() => onAddBom(item)}
                  >
                    {added ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                    <span>{added ? mpnCopy.addedBomText : mpnCopy.addBomText}</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pagination && pagination.totalPages > 1 ? (
        <div className="pagination-bar">
          <span>
            {tableCopy.pageInfo
              .replace("{page}", String(pagination.page))
              .replace("{totalPages}", String(pagination.totalPages))
              .replace("{total}", String(pagination.total))}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn-navy-outline"
              style={{ minHeight: 36, padding: "4px 12px", fontSize: 13 }}
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft size={15} aria-hidden="true" />
              <span>{tableCopy.prevPage}</span>
            </button>
            <button
              type="button"
              className="btn-navy-outline"
              style={{ minHeight: 36, padding: "4px 12px", fontSize: 13 }}
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              <span>{tableCopy.nextPage}</span>
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
