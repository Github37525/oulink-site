import React from "react";
import { routeHref, routeKeys } from "../routing.js";
import { CLAIM_BOUNDARIES, VERIFIED_COMPANY_FACTS } from "../content/claimLedger.js";

export function Footer({
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

  const boundaries = CLAIM_BOUNDARIES[locale] || CLAIM_BOUNDARIES.zh;
  const icpRecord = brand.icpRecord || VERIFIED_COMPANY_FACTS.icpRecord;

  return (
    <footer className="site-footer">
      <div className="ou-container">
        <div className="footer-top-grid">
          <div>
            <a
              href={routeHref(locale, "home")}
              onClick={handleLinkClick(routeHref(locale, "home"))}
            >
              <img
                src={brand.logoDark}
                alt={locale === "zh" ? brand.fullNameZh : brand.fullNameEn}
                className="footer-logo"
                width="140"
                height="42"
              />
            </a>
            <p style={{ margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.65, color: "rgba(247,250,252,0.82)" }}>
              {localeContent.footer.positioning}
            </p>
            <div className="footer-qr-row">
              <img
                src={brand.wechatQr || VERIFIED_COMPANY_FACTS.wechatQrPath}
                alt={
                  locale === "zh"
                    ? "上海欧连电子官方微信公众号二维码"
                    : "Ou-Link Electronics Official WeChat QR Code"
                }
                width="76"
                height="76"
              />
              <div style={{ fontSize: 12.5, color: "rgba(247,250,252,0.78)" }}>
                <strong style={{ display: "block", color: "#ffffff", marginBottom: 3 }}>
                  {localeContent.contact.labels.wechat}
                </strong>
                <span>
                  {locale === "zh"
                    ? "扫码关注获取车规连接器现货动态与选型资料"
                    : "Scan on WeChat for standing inventory updates"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="footer-heading">{localeContent.footer.quickLinksTitle}</h2>
            <ul className="footer-links">
              {["home", ...routeKeys].map((key) => {
                const href = routeHref(locale, key);
                return (
                  <li key={key}>
                    <a href={href} onClick={handleLinkClick(href)}>
                      {localeContent.nav[key]}
                    </a>
                  </li>
                );
              })}
            </ul>

            <h2 className="footer-heading" style={{ marginTop: 20 }}>
              {localeContent.footer.geoResourcesTitle}
            </h2>
            <ul className="footer-links">
              <li>
                <a href="/llms.txt">
                  /llms.txt ({locale === "zh" ? "AI 精要索引" : "AI Summary Index"})
                </a>
              </li>
              <li>
                <a href="/llms-full.txt">
                  /llms-full.txt ({locale === "zh" ? "383+全量料号表" : "Full 383+ MPN Index"})
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="footer-heading">{localeContent.footer.contactTitle}</h2>
            <ul className="footer-links" style={{ gap: 9 }}>
              <li>
                <strong>{localeContent.contact.labels.address}：</strong>
                <span>{locale === "zh" ? contact.addressZh : contact.addressEn}</span>
              </li>
              <li>
                <strong>{localeContent.contact.labels.phone}：</strong>
                <a href={`tel:${contact.phone}`} className="mpn-code">
                  {contact.phone}
                </a>
              </li>
              <li>
                <strong>{localeContent.contact.labels.salesPhone}：</strong>
                <a href={`tel:${contact.salesPhone}`} className="mpn-code">
                  {contact.salesPhone}
                </a>
              </li>
              <li>
                <strong>{localeContent.contact.labels.email}：</strong>
                <a href={`mailto:${contact.email}`} className="mpn-code">
                  {contact.email}
                </a>
              </li>
              <li>
                <strong>{localeContent.contact.labels.qq}：</strong>
                <span className="mpn-code">{contact.qq}</span>
              </li>
              <li>
                <strong>{localeContent.contact.labels.hours}：</strong>
                <span>{locale === "zh" ? contact.hoursZh : contact.hoursEn}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="claim-boundaries-section">
          <h2 className="footer-heading" style={{ marginBottom: 8 }}>
            {localeContent.footer.boundariesTitle}
          </h2>
          <ul className="claim-boundaries-list">
            {boundaries.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="footer-bottom-bar">
          <span>{localeContent.footer.copyright}</span>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {icpRecord ? (
              <a
                href={VERIFIED_COMPANY_FACTS.icpFilingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {icpRecord}
              </a>
            ) : null}
            <span className="mpn-code" style={{ fontSize: 12 }}>
              SHANGHAI MINHANG · AUTOMOTIVE INTERCONNECT HUB
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
