import React, { useEffect, useState } from "react";
import { Menu, X, PhoneCall } from "lucide-react";
import { routeHref, switchLocaleHref } from "../routing.js";

const PRIMARY_NAV_KEYS = ["home", "products", "solutions", "quality", "about"];

export function Header({
  locale = "zh",
  route = "home",
  pathname = "/zh",
  brand,
  contact,
  localeContent,
  bomCount = 0,
  onNavigate,
  onTriggerSearch,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const otherLocale = locale === "zh" ? "en" : "zh";

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
  const contactHref = routeHref(locale, "contact");
  const ctaLabel = localeContent.headerCta || localeContent.nav.contact;
  const zhLabel = localeContent.localePair?.zh || "中";
  const enLabel = localeContent.localePair?.en || "EN";

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
            width="150"
            height="44"
          />
        </a>

        <nav className="desktop-nav" aria-label={localeContent.accessibility.navigation}>
          {PRIMARY_NAV_KEYS.map((key) => {
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
          <a
            href={contactHref}
            className={`btn-primary header-cta-btn${route === "contact" ? " is-current" : ""}`}
            aria-current={route === "contact" ? "page" : undefined}
            onClick={handleLinkClick(contactHref)}
          >
            <span>{ctaLabel}</span>
            {bomCount > 0 ? <span className="header-bom-count">{bomCount}</span> : null}
          </a>

          <div className="locale-toggle-pair" role="group" aria-label={localeContent.localeSwitchAria}>
            {locale === "zh" ? (
              <>
                <span className="locale-active">{zhLabel}</span>
                <span className="locale-sep" aria-hidden="true">/</span>
                <a
                  href={switchHref}
                  className="locale-switch-link"
                  aria-label={localeContent.localeSwitchAria}
                  onClick={handleLinkClick(switchHref)}
                >
                  {enLabel}
                </a>
              </>
            ) : (
              <>
                <a
                  href={switchHref}
                  className="locale-switch-link"
                  aria-label={localeContent.localeSwitchAria}
                  onClick={handleLinkClick(switchHref)}
                >
                  {zhLabel}
                </a>
                <span className="locale-sep" aria-hidden="true">/</span>
                <span className="locale-active">{enLabel}</span>
              </>
            )}
          </div>

          <button
            type="button"
            className="mobile-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={
              menuOpen
                ? localeContent.accessibility.mobileMenuClose || localeContent.accessibility.mobileMenuOpen
                : localeContent.accessibility.mobileMenuOpen
            }
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div id="mobile-nav-drawer" className="mobile-nav-drawer">
          <nav className="mobile-nav-list" aria-label={localeContent.accessibility.navigation}>
            {[...PRIMARY_NAV_KEYS, "contact"].map((key) => {
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
                  <span>{key === "contact" ? ctaLabel : localeContent.nav[key]}</span>
                  {key === "contact" && bomCount > 0 ? (
                    <span className="mpn-code">({bomCount})</span>
                  ) : null}
                </a>
              );
            })}
          </nav>
          <div className="mobile-nav-meta">
            <a href={`tel:${contact.phone}`} className="mobile-meta-item">
              <PhoneCall size={13} aria-hidden="true" />
              <span className="mpn-code">{contact.phone} / {contact.salesPhone}</span>
            </a>
            <a href={`mailto:${contact.email}`} className="mpn-code mobile-meta-item">
              {contact.email}
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
