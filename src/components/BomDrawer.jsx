import React, { useEffect, useState } from "react";
import { X, Trash2, ArrowRight, Copy, Check, ShoppingBag } from "lucide-react";
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
    if (onNavigate) {
      event.preventDefault();
      onClose();
      onNavigate(contactHref);
    } else {
      onClose();
    }
  };

  return (
    <>
      {/* Non-blocking Floating BOM Bar when items exist and not already on Contact page */}
      {bomItems.length > 0 && route !== "contact" && !isOpen ? (
        <div className="floating-bom-bar" role="region" aria-label={drawerCopy.title}>
          <button
            type="button"
            onClick={onOpen}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13.5,
            }}
          >
            <ShoppingBag size={16} color="var(--ou-volt-orange)" aria-hidden="true" />
            <span>
              BOM: <strong className="mpn-code">{bomItems.length}</strong> SKU
            </span>
          </button>
          <a
            href={contactHref}
            className="btn-volt"
            style={{ minHeight: 36, padding: "4px 14px", fontSize: 13 }}
            onClick={handleGoContact}
          >
            <span>{drawerCopy.proceedToContact}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </a>
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
                <h2 style={{ margin: 0, fontSize: 18 }}>{drawerCopy.title}</h2>
                <span style={{ fontSize: 12, color: "var(--ou-ice-blue)" }}>
                  {drawerCopy.subtitle}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: "#ffffff",
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="bom-drawer-body">
              {bomItems.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>
                  {drawerCopy.emptyText}
                </p>
              ) : (
                <div>
                  {bomItems.map((item) => (
                    <div key={item.mpn} className="attached-bom-item">
                      <div style={{ minWidth: 0, flex: "1 1 160px" }}>
                        <strong className="mpn-code" style={{ display: "block", color: "var(--ou-navy)" }}>
                          {item.mpn}
                        </strong>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {item.brand}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                          onClick={() => onRemoveItem(item.mpn)}
                          aria-label={`${drawerCopy.removeLabel} ${item.mpn}`}
                          style={{
                            background: "transparent",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: 4,
                            width: 34,
                            height: 34,
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trash2 size={15} aria-hidden="true" />
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
                  className="btn-volt"
                  style={{ width: "100%" }}
                  onClick={handleGoContact}
                >
                  <span>{drawerCopy.proceedToContact}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </a>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn-navy-outline"
                    style={{ flex: 1, minHeight: 38, fontSize: 13 }}
                    onClick={handleCopyBom}
                  >
                    {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    <span>{copied ? drawerCopy.copied : drawerCopy.copyList}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-navy-outline"
                    style={{ minHeight: 38, fontSize: 13 }}
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
