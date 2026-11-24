import React, { memo } from "react";
import { routeHref } from "../routing.js";

function toEditorialWebp(src) {
  return typeof src === "string" && /\/assets\/editorial\/[^/]+\.jpg$/i.test(src)
    ? src.replace(/\.jpg$/i, ".webp")
    : null;
}

export const QualityPipeline = memo(function QualityPipeline({
  locale = "zh",
  qualityCopy,
  onNavigate,
}) {
  const contactHref = routeHref(locale, "contact");
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
      onNavigate(contactHref);
    }
  };

  const batchCard = qualityCopy.batchRecordCard;

  return (
    <div className="quality-editorial-flow">
      {/* 1. Batch Record Sample: Left Real Bag Photo + Right 6-Row Hairline Sheet */}
      {batchCard ? (
        <div className="quality-batch-split">
          <div className="editorial-photo-frame is-square-lot">
            <picture>
              {toEditorialWebp(batchCard.imagePath) ? (
                <source srcSet={toEditorialWebp(batchCard.imagePath)} type="image/webp" />
              ) : null}
              <img
                src={batchCard.imagePath}
                alt={batchCard.title}
                width="619"
                height="624"
                fetchPriority="high"
                decoding="async"
              />
            </picture>
            {batchCard.imageBadge ? (
              <span className="photo-corner-badge">{batchCard.imageBadge}</span>
            ) : null}
          </div>

          <div className="batch-record-sheet">
            <span className="editorial-eyebrow-gold">{batchCard.eyebrow}</span>
            <h2>{batchCard.title}</h2>

            <dl className="batch-fields-list">
              {batchCard.fields.map((field, idx) => (
                <div key={idx} className="batch-field-row">
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
            </dl>

            <div className="batch-sheet-footer">
              <span className="batch-footnote">{batchCard.footnote}</span>
              <a
                href={contactHref}
                className="btn-outline is-compact"
                onClick={handleGoContact}
              >
                {batchCard.actionButton}
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. Five-Stage Traceability Process (01-05 Editorial Hairline Rows + Inline Photos on 02/04/05) */}
      <div className="quality-process-block">
        <div className="editorial-section-head">
          <div>
            <span className="gold-top-rule" aria-hidden="true" />
            <h2>{qualityCopy.stepsTitle}</h2>
          </div>
        </div>

        <div className="qc-editorial-rows">
          {qualityCopy.steps.map((item) => (
            <article key={item.step} className="qc-editorial-row">
              <div className="qc-row-head">
                <span className="editorial-step-num mpn-code">{item.step}</span>
                <h3>{item.title}</h3>
              </div>

              <div className="qc-row-body">
                <p>{item.description}</p>
                {Array.isArray(item.checkPoints) && item.checkPoints.length > 0 ? (
                  <div className="qc-row-tags">
                    {item.checkPoints.map((pt, idx) => (
                      <span key={idx} className="qc-check-tag">
                        {pt}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="qc-row-media">
                {item.hasPhoto && item.imagePath ? (
                  <div className="editorial-photo-frame is-process-thumb">
                    <picture>
                      {toEditorialWebp(item.imagePath) ? (
                        <source srcSet={toEditorialWebp(item.imagePath)} type="image/webp" />
                      ) : null}
                      <img
                        src={item.imagePath}
                        alt={item.title}
                        width="260"
                        height="83"
                        loading="lazy"
                        decoding="async"
                      />
                    </picture>
                    {item.imageBadge ? (
                      <span className="photo-corner-badge is-mini">{item.imageBadge}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 3. Verification Documents per Supplier Onboarding (3 Hairline Rows + Honest Footnote) */}
      <div className="quality-credentials-block">
        <div className="editorial-section-head">
          <div>
            <span className="gold-top-rule" aria-hidden="true" />
            <h2>{qualityCopy.credentialsTitle}</h2>
            {qualityCopy.credentialsSubtitle ? <p>{qualityCopy.credentialsSubtitle}</p> : null}
          </div>
        </div>

        <div className="credentials-editorial-list">
          {qualityCopy.certificateSlots.map((slot) => (
            <div key={slot.id} className="credential-editorial-row">
              <div className="credential-row-main">
                <div className="credential-title-line">
                  <h3>{slot.title}</h3>
                  {slot.scope ? <span className="credential-scope-tag">{slot.scope}</span> : null}
                </div>
                <p>{slot.summary}</p>
              </div>
              <div className="credential-row-action">
                <a
                  href={contactHref}
                  className="btn-outline is-compact"
                  onClick={handleGoContact}
                >
                  {slot.actionLabel || qualityCopy.credentialsActionText}
                </a>
              </div>
            </div>
          ))}
        </div>

        {qualityCopy.credentialsFootnote ? (
          <p className="credentials-honest-footnote">
            * {qualityCopy.credentialsFootnote}
          </p>
        ) : null}
      </div>

      {/* 4. Material Compliance Bar (RoHS · REACH · ELV) */}
      {qualityCopy.complianceCard ? (
        <div className="material-compliance-strip">
          <div className="compliance-strip-left">
            <span className="compliance-label">{qualityCopy.complianceCard.title}</span>
            <strong className="compliance-standards mpn-code">
              {qualityCopy.complianceCard.standards}
            </strong>
          </div>
          <p className="compliance-strip-desc">
            {qualityCopy.complianceCard.description}
          </p>
        </div>
      ) : null}
    </div>
  );
});
