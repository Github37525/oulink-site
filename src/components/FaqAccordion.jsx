import React from "react";

export function FaqAccordion({ faqs = [] }) {
  if (!Array.isArray(faqs) || faqs.length === 0) return null;

  return (
    <div className="faq-editorial-list">
      {faqs.map((item, idx) => (
        <details key={idx} className="faq-editorial-item" open>
          <summary className="faq-editorial-summary">
            <span className="faq-editorial-q">
              <span className="faq-editorial-num mpn-code">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="faq-editorial-qtext">{item.q}</span>
            </span>
            <span className="faq-editorial-toggle" aria-hidden="true" />
          </summary>
          <div className="faq-editorial-answer">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
