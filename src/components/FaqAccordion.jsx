import React from "react";

export function FaqAccordion({ faqs = [] }) {
  return (
    <div className="faq-list">
      {faqs.map((item, idx) => (
        <details key={idx} className="faq-item" open>
          <summary>
            <span>
              <span className="faq-q-badge">Q0{idx + 1}</span>
              <span>{item.q}</span>
            </span>
          </summary>
          <div className="faq-answer">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
