import { routeHref } from "../routing.js";
import { VERIFIED_COMPANY_FACTS } from "../content/claimLedger.js";

function resolveRouteFaqs(localeContent, route) {
  if (route === "solutions") {
    const pageFaqs = localeContent.solutions?.faqs || localeContent.solutionsPage?.faqs;
    if (Array.isArray(pageFaqs) && pageFaqs.length > 0) return pageFaqs;
    return Array.isArray(localeContent.faqs) ? localeContent.faqs : [];
  }
  if (route === "quality") {
    const pageFaqs = localeContent.quality?.faqs || localeContent.qualityPage?.faqs;
    if (Array.isArray(pageFaqs) && pageFaqs.length > 0) return pageFaqs;
    return Array.isArray(localeContent.faqs) ? localeContent.faqs : [];
  }
  return [];
}

export function buildStructuredData({
  locale = "zh",
  route = "home",
  origin = "https://www.ou-link.com",
  content,
  featuredProducts = [],
}) {
  const safeLocale = locale === "en" ? "en" : "zh";
  const langTag = safeLocale === "zh" ? "zh-CN" : "en";
  const cleanOrigin = origin ? String(origin).replace(/\/+$/, "") : "";
  const pagePath = routeHref(safeLocale, route);
  const pageUrl = cleanOrigin ? `${cleanOrigin}${pagePath}` : undefined;
  const orgId = cleanOrigin ? `${cleanOrigin}/#organization` : "#organization";
  const siteId = cleanOrigin ? `${cleanOrigin}/#website` : "#website";

  const localeContent = content[safeLocale];
  const brand = content.brand;
  const contact = content.contact;
  const routeMeta = localeContent.routes[route] || localeContent.routes.home;

  const organizationNode = {
    "@type": "Organization",
    "@id": orgId,
    name: safeLocale === "zh" ? brand.fullNameZh : brand.fullNameEn,
    alternateName: [
      brand.chinese,
      brand.latin,
      brand.fullNameZh,
      brand.fullNameEn,
    ],
    foundingDate: String(brand.foundedYear || VERIFIED_COMPANY_FACTS.foundedYear),
    description: routeMeta.description,
    ...(cleanOrigin ? { url: `${cleanOrigin}/${safeLocale}` } : {}),
    ...(cleanOrigin ? { logo: `${cleanOrigin}${brand.logoPrimary}` } : {}),
    telephone: contact.phoneIntl || VERIFIED_COMPANY_FACTS.hqPhoneIntl,
    email: contact.email || VERIFIED_COMPANY_FACTS.email,
    address: {
      "@type": "PostalAddress",
      streetAddress:
        safeLocale === "zh"
          ? VERIFIED_COMPANY_FACTS.postalAddress.streetAddressZh
          : VERIFIED_COMPANY_FACTS.postalAddress.streetAddressEn,
      addressLocality:
        safeLocale === "zh"
          ? VERIFIED_COMPANY_FACTS.postalAddress.addressLocalityZh
          : VERIFIED_COMPANY_FACTS.postalAddress.addressLocalityEn,
      addressRegion:
        safeLocale === "zh"
          ? VERIFIED_COMPANY_FACTS.postalAddress.addressRegionZh
          : VERIFIED_COMPANY_FACTS.postalAddress.addressRegionEn,
      addressCountry: VERIFIED_COMPANY_FACTS.postalAddress.addressCountry,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: contact.phoneIntl || VERIFIED_COMPANY_FACTS.hqPhoneIntl,
        email: contact.email || VERIFIED_COMPANY_FACTS.email,
        contactType: "customer service",
        availableLanguage: ["zh-CN", "en"],
      },
      {
        "@type": "ContactPoint",
        telephone: contact.salesPhoneIntl || VERIFIED_COMPANY_FACTS.salesPhoneIntl,
        email: contact.email || VERIFIED_COMPANY_FACTS.email,
        contactType: "sales and technical support",
        availableLanguage: ["zh-CN", "en"],
      },
    ],
    knowsAbout: [
      "Automotive Connectors",
      "Wire Harness BOM Kitting",
      "Connector Pin-to-Pin Cross-Reference",
      "Forward and Reverse Connector Tooling",
      "Automotive Crimp Terminals and Wire Seals",
      "FAKRA and HSD High-Speed Automotive Interconnects",
    ],
  };

  const websiteNode = {
    "@type": "WebSite",
    "@id": siteId,
    name: routeMeta.title,
    inLanguage: langTag,
    publisher: { "@id": orgId },
    ...(pageUrl ? { url: pageUrl } : {}),
    ...(cleanOrigin
      ? {
          potentialAction: {
            "@type": "SearchAction",
            target: `${cleanOrigin}/${safeLocale}/products?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }
      : {}),
  };

  const homeHref = cleanOrigin
    ? `${cleanOrigin}${routeHref(safeLocale, "home")}`
    : routeHref(safeLocale, "home");

  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: localeContent.breadcrumbs?.home || localeContent.nav.home,
      item: homeHref,
    },
  ];

  if (route !== "home" && route !== "notFound") {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name:
        localeContent.breadcrumbs?.[route] ||
        localeContent.nav[route] ||
        routeMeta.title,
      item: pageUrl || pagePath,
    });
  }

  const breadcrumbNode = {
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  const graph = [organizationNode, websiteNode, breadcrumbNode];

  if ((route === "home" || route === "products") && featuredProducts.length > 0) {
    graph.push({
      "@type": "ItemList",
      name:
        safeLocale === "zh"
          ? "上海欧连电子常备汽车连接器代表料号目录"
          : "Ou-Link Electronics Standing Automotive Connector MPN Directory",
      numberOfItems: featuredProducts.length,
      itemListElement: featuredProducts.slice(0, 24).map((prod, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "Product",
          name: `${prod.mpn} — ${safeLocale === "zh" ? prod.brandNameZh : prod.brandNameEn} ${
            safeLocale === "zh" ? prod.categoryZh : prod.categoryEn
          }`,
          mpn: prod.mpn,
          sku: prod.id,
          description: safeLocale === "zh" ? prod.specSummaryZh : prod.specSummaryEn,
          brand: {
            "@type": "Brand",
            name: safeLocale === "zh" ? prod.brandNameZh : prod.brandNameEn,
          },
          offers: {
            "@type": "Offer",
            priceCurrency: "CNY",
            price: String(prod.priceCny),
            availability: "https://schema.org/InStock",
            seller: { "@id": orgId },
          },
        },
      })),
    });
  }

  const routeFaqs = resolveRouteFaqs(localeContent, route).filter(
    (faq) => faq && typeof faq.q === "string" && faq.q.trim() && typeof faq.a === "string" && faq.a.trim()
  );

  if ((route === "solutions" || route === "quality") && routeFaqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: routeFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function serializeJsonLd(schemaObject) {
  return JSON.stringify(schemaObject).replaceAll("<", "\\u003c");
}
