import React from "react";

export function QualityPipeline({ qualityCopy }) {
  return (
    <div>
      <div className="pipeline-banner-card">
        <img
          src={qualityCopy.diagramPath}
          alt={qualityCopy.diagramAlt}
          width="960"
          height="220"
        />
      </div>

      <div className="qc-steps-grid">
        {qualityCopy.steps.map((item) => (
          <article key={item.step} className="qc-step-card">
            <div className="qc-step-header">
              <img src={item.icon} alt={item.title} width="52" height="52" />
              <div>
                <span className="qc-step-num">{item.step}</span>
                <h3>{item.title}</h3>
              </div>
            </div>
            <p>{item.description}</p>
            <ul className="qc-checkpoints">
              {item.checkPoints.map((pt, idx) => (
                <li key={idx}>{pt}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {qualityCopy.complianceCard ? (
        <div className="rohs-compliance-bar">
          <img
            src={qualityCopy.complianceCard.icon}
            alt={qualityCopy.complianceCard.title}
            width="60"
            height="60"
          />
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: 17, color: "var(--ou-navy)" }}>
              {qualityCopy.complianceCard.title}
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-body)", lineHeight: 1.6 }}>
              {qualityCopy.complianceCard.description}
            </p>
          </div>
        </div>
      ) : null}

      <div className="section-header">
        <h2>{qualityCopy.credentialsTitle}</h2>
        <p>{qualityCopy.credentialsSubtitle}</p>
      </div>

      <div className="credentials-grid">
        {qualityCopy.certificateSlots.map((slot) => {
          const isVerified = Boolean(slot.verified && slot.imagePath);
          return (
            <article key={slot.id} className="credential-slot-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span className="mpn-code" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  {slot.code}
                </span>
                <span className={`tier-pill ${isVerified ? "partner" : "authorized"}`}>
                  {isVerified ? qualityCopy.verifiedBadge : qualityCopy.unverifiedBadge}
                </span>
              </div>

              <div className="credential-preview">
                <img
                  src={isVerified ? slot.imagePath : slot.placeholderIcon}
                  alt={slot.title}
                  width="180"
                  height="236"
                />
              </div>

              <h3 style={{ margin: 0, fontSize: 16, color: "var(--ou-navy)" }}>{slot.title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-body)", lineHeight: 1.6 }}>
                {slot.summary}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
