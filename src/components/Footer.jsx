import React, { memo } from "react";
import { Mail, Phone } from "lucide-react";
import { routeHref } from "../routing.js";
import { VERIFIED_COMPANY_FACTS } from "../content/claimLedger.js";

function toLogoWebp(src) {
  return typeof src === "string" && /\/assets\/brand\/oulink-logo(?:-dark)?\.svg$/i.test(src)
    ? src.replace(/\.svg$/i, ".webp")
    : null;
}

export const Footer = memo(function Footer({
  locale = "zh",
  brand,
  contact,
  localeContent,
  onNavigate,
}) {
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
      onNavigate(href);
    }
  };

  const icpRecord = brand.icpRecord || VERIFIED_COMPANY_FACTS.icpRecord;
  const email = localeContent.footer?.email || contact.email;
  const hqPhone = localeContent.footer?.hqPhone || contact.phone;
  const salesPhone = localeContent.footer?.salesPhone || contact.salesPhone;

  return (
    <footer className="site-footer">
      <div className="ou-container footer-bar">
        <a
          href={routeHref(locale, "home")}
          className="footer-brand-link"
          onClick={handleLinkClick(routeHref(locale, "home"))}
        >
          <picture>
            {toLogoWebp(brand.logoDark) ? (
              <source srcSet={toLogoWebp(brand.logoDark)} type="image/webp" />
            ) : null}
            <img
              src={brand.logoDark}
              alt={locale === "zh" ? brand.fullNameZh : brand.fullNameEn}
              className="footer-logo"
              width="146"
              height="43"
              loading="lazy"
              decoding="async"
            />
          </picture>
        </a>

        <div className="footer-contact-inline">
          <a href={`mailto:${email}`} className="footer-contact-item">
            <Mail size={14} aria-hidden="true" />
            <span className="mpn-code">{email}</span>
          </a>
          <span className="footer-divider" aria-hidden="true">|</span>
          <span className="footer-contact-item">
            <Phone size={14} aria-hidden="true" />
            <a href={`tel:${hqPhone}`} className="mpn-code">{hqPhone}</a>
            <span className="footer-phone-sep" aria-hidden="true">/</span>
            <a href={`tel:${salesPhone}`} className="mpn-code">{salesPhone}</a>
          </span>
        </div>

        <div className="footer-legal-inline">
          <span>{localeContent.footer?.copyright}</span>
          {icpRecord ? (
            <a
              href={VERIFIED_COMPANY_FACTS.icpFilingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-icp-link"
            >
              {icpRecord}
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
});
