export const locales = ["zh", "en"];

export const routeKeys = ["products", "solutions", "quality", "about", "contact"];

export function routeHref(locale = "zh", route = "home") {
  const safeLocale = locale === "en" ? "en" : "zh";
  if (!route || route === "home") {
    return `/${safeLocale}`;
  }
  if (route === "notFound") {
    return `/${safeLocale}/404`;
  }
  if (routeKeys.includes(route)) {
    return `/${safeLocale}/${route}`;
  }
  return `/${safeLocale}`;
}

export function resolveRoute(pathname = "/") {
  const cleanPath = String(pathname || "/").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";

  if (cleanPath === "/" || cleanPath === "/zh") {
    return { locale: "zh", route: "home" };
  }
  if (cleanPath === "/en") {
    return { locale: "en", route: "home" };
  }
  if (cleanPath === "/404" || cleanPath === "/zh/404") {
    return { locale: "zh", route: "notFound" };
  }
  if (cleanPath === "/en/404") {
    return { locale: "en", route: "notFound" };
  }

  const segments = cleanPath.slice(1).split("/");
  const first = segments[0];
  if ((first === "zh" || first === "en") && segments.length === 2) {
    const second = segments[1];
    if (routeKeys.includes(second)) {
      return { locale: first, route: second };
    }
  }

  return {
    locale: first === "en" ? "en" : "zh",
    route: "notFound",
  };
}

export function switchLocaleHref(pathname = "/zh", targetLocale = "en") {
  const resolved = resolveRoute(pathname);
  const nextLocale = targetLocale === "en" ? "en" : "zh";
  if (resolved.route === "notFound") {
    return routeHref(nextLocale, "home");
  }
  return routeHref(nextLocale, resolved.route);
}

export function resolveLegacyRedirect(search = "") {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const tid = params.get("tid");
  const controller = params.get("c");
  if (controller === "View" || tid === "3" || tid === "5" || tid === "6") {
    return "/zh/products";
  }
  if (tid === "1" || tid === "8" || tid === "23") {
    return "/zh/about";
  }
  if (tid === "9") {
    return "/zh/quality";
  }
  if (tid === "2") {
    return "/zh/solutions";
  }
  if (tid === "30") {
    return "/zh/contact";
  }
  return null;
}
