import React, { useEffect, useState } from "react";
import { X, Trash2, ArrowRight, Copy, Check } from "lucide-react";
import { routeHref } from "../routing.js";

export function BomDrawer({
  locale = "zh",
  route = "home",
  isOpen = false,
  onClose,
  onOpen,
  bomItems = [],
  onUpdateQty,
  onRemoveItem,
  onClearBom,
  onNavigate,
  drawerCopy,
  stickyCopy,
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const contactHref = routeHref(locale, "contact");

  const handleCopyBom = async () => {
    const text = bomItems
      .map((item) => `${item.mpn}\t${item.brand || ""}\t${item.qty} PCS`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const handleGoContact = (event) => {
    if (
      onNavigate &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      onClose?.();
      onNavigate(contactHref);
    } else {
      onClose?.();
    }
  };

  const countTemplate =
    stickyCopy?.selectedCountTemplate ||
    (locale === "zh" ? "已加入 {count} 个料号" : "{count} MPNs selected");
  const selectedSummaryLabel = countTemplate.replace("{count}", String(bomItems.length));
  const submitLabel = stickyCopy?.submitAction || drawerCopy?.proceedToContact || "查看 BOM 并询价 →";
  const clearLabel = stickyCopy?.clearText || drawerCopy?.clearAll || "清空";
  const previewMpns = bomItems
    .slice(0, 4)
    .map((item) => item.mpn)
    .join(" · ");
  const extraCount = bomItems.length > 4 ? ` +${bomItems.length - 4}` : "";

  return (
    <>
      {bomItems.length > 0 && route !== "contact" && !isOpen ? (
        <div className="sticky-bom-bar" role="region" aria-label={drawerCopy.title}>
          <div className="ou-container sticky-bom-inner">
            <div className="sticky-bom-left">
              <button
                type="button"
                className="sticky-bom-summary-btn"
                onClick={onOpen}
              >
                <span className="sticky-bom-check" aria-hidden="true">
                  <Check size={12} strokeWidth={2.6} />
                </span>
                <strong>{selectedSummaryLabel}</strong>
              </button>
              <span className="sticky-bom-sep" aria-hidden="true">|</span>
              <span className="sticky-bom-preview mpn-code">
                {previewMpns}
                {extraCount}
              </span>
            </div>

            <div className="sticky-bom-actions">
              <button
                type="button"
                className="sticky-bom-clear"
                onClick={onClearBom}
              >
                {clearLabel}
              </button>
              <a
                href={contactHref}
                className="btn-light-on-dark"
                onClick={handleGoContact}
              >
                <span>{submitLabel}</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {isOpen ? (
        <div
          className="bom-drawer-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <aside
            className="bom-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={drawerCopy.title}
          >
            <div className="bom-drawer-header">
              <div>
                <h2>{drawerCopy.title}</h2>
                <span>{drawerCopy.subtitle}</span>
              </div>
              <button
                type="button"
                className="bom-drawer-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="bom-drawer-body">
              {bomItems.length === 0 ? (
                <p className="bom-drawer-empty">{drawerCopy.emptyText}</p>
              ) : (
                <div className="bom-drawer-list">
                  {bomItems.map((item) => (
                    <div key={item.mpn} className="attached-bom-item">
                      <div className="attached-bom-info">
                        <strong className="mpn-code">{item.mpn}</strong>
                        <span>{item.brand}</span>
                      </div>
                      <div className="attached-bom-controls">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          aria-label={`${drawerCopy.qtyLabel} ${item.mpn}`}
                          onChange={(e) => onUpdateQty(item.mpn, e.target.value)}
                          className="qty-input"
                        />
                        <button
                          type="button"
                          className="icon-outline-btn"
                          onClick={() => onRemoveItem(item.mpn)}
                          aria-label={`${drawerCopy.removeLabel} ${item.mpn}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {bomItems.length > 0 ? (
              <div className="bom-drawer-footer">
                <a
                  href={contactHref}
                  className="btn-primary"
                  style={{ width: "100%" }}
                  onClick={handleGoContact}
                >
                  <span>{drawerCopy.proceedToContact}</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
                <div className="bom-drawer-subactions">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={handleCopyBom}
                  >
                    {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                    <span>{copied ? drawerCopy.copied : drawerCopy.copyList}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={onClearBom}
                  >
                    {drawerCopy.clearAll}
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
