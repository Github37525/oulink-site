import React, { useEffect, useState } from "react";
import { Menu, X, Search, ShoppingBag, Globe, PhoneCall } from "lucide-react";
import { routeHref, routeKeys, switchLocaleHref } from "../routing.js";

export function Header({
  locale = "zh",
  route = "home",
  pathname = "/zh",
  brand,
  contact,
  localeContent,
  bomCount = 0,
  onNavigate,
  onOpenBom,
  onTriggerSearch,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const otherLocale = locale === "zh" ? "en" : "zh";
  const allNavRoutes = ["home", ...routeKeys];

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const onSlashShortcut = (event) => {
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "")
      ) {
        event.preventDefault();
        onTriggerSearch?.();
      }
    };
    window.addEventListener("keydown", onSlashShortcut);
    return () => window.removeEventListener("keydown", onSlashShortcut);
  }, [onTriggerSearch]);

  const handleLinkClick = (href) => (event) => {
    if (
      onNavigate &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      setMenuOpen(false);
      onNavigate(href);
    }
  };

  const switchHref = switchLocaleHref(pathname, otherLocale);

  return (
    <header className="site-header">
      <div className="ou-container header-inner">
        <a
          href={routeHref(locale, "home")}
          className="header-brand"
          onClick={handleLinkClick(routeHref(locale, "home"))}
        >
          <img
            src={brand.logoPrimary}
            alt={locale === "zh" ? brand.fullNameZh : brand.fullNameEn}
            width="133"
            height="40"
          />
        </a>

        <nav className="desktop-nav" aria-label={localeContent.accessibility.navigation}>
          {allNavRoutes.map((key) => {
            const href = routeHref(locale, key);
            const isCurrent = route === key;
            return (
              <a
                key={key}
                href={href}
                className="nav-link"
                aria-current={isCurrent ? "page" : undefined}
                onClick={handleLinkClick(href)}
              >
                {localeContent.nav[key]}
              </a>
            );
          })}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="header-icon-btn header-search-shortcut"
            onClick={onTriggerSearch}
            aria-label={localeContent.accessibility.searchTrigger}
          >
            <Search size={15} aria-hidden="true" />
            <span>MPN</span>
            <kbd className="kbd-hint">/</kbd>
          </button>

          <button
            type="button"
            className="bom-trigger-btn"
            onClick={onOpenBom}
            aria-label={`${localeContent.accessibility.bomTrigger} (${bomCount})`}
          >
            <ShoppingBag size={15} aria-hidden="true" />
            <span className="bom-trigger-text">BOM</span>
            <span className="bom-count-badge">{bomCount}</span>
          </button>

          <a
            href={switchHref}
            className="locale-switch-link"
            aria-label={localeContent.localeSwitchAria}
            onClick={handleLinkClick(switchHref)}
          >
            <Globe size={14} aria-hidden="true" style={{ marginRight: 4 }} />
            <span>{localeContent.localeLabel}</span>
          </a>

          <button
            type="button"
            className="mobile-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={localeContent.accessibility.mobileMenuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-nav-drawer" className="mobile-nav-drawer">
          <nav className="mobile-nav-list" aria-label={localeContent.accessibility.navigation}>
            {allNavRoutes.map((key) => {
              const href = routeHref(locale, key);
              const isCurrent = route === key;
              return (
                <a
                  key={key}
                  href={href}
                  className="mobile-nav-link"
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={handleLinkClick(href)}
                >
                  <span>{localeContent.nav[key]}</span>
                </a>
              );
            })}
          </nav>
          <div className="mobile-nav-meta">
            <a href={`tel:${contact.salesPhone}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <PhoneCall size={14} aria-hidden="true" />
              <span className="mpn-code">{contact.salesPhone}</span>
            </a>
            <span>{contact.email}</span>
          </div>
        </div>
      )}
    </header>
  );
}
