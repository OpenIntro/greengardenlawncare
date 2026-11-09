function formatTelephone(phoneHref) {
  const digits = String(phoneHref || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return String(phoneHref || "");
}

function absoluteHttp(value) {
  return typeof value === "string" && /^https?:\/\//.test(value) ? value : "";
}

/** Visible service cards. Descriptions must stay aligned with the homepage copy. */
export const SERVICE_CATALOG = [
  {
    name: "Holiday Light Installation",
    description:
      "Make your home shine with professionally installed holiday lighting designed to highlight its best features.",
  },
  {
    name: "Lawn Maintenance",
    description:
      "Keep your yard neat, healthy-looking, and beautifully maintained with dependable mowing and lawn care.",
  },
  {
    name: "Shrub & Hedge Trimming",
    description: "Clean lines, neatly shaped shrubs, and carefully maintained landscaping for a polished appearance.",
  },
  {
    name: "Flower Bed Cleanouts",
    description:
      "Refresh overgrown or untidy flower beds with cleanouts and maintenance that bring your landscaping back to life.",
  },
];

export const BUSINESS_SLOGAN = "Beautiful Homes. Every Season.";

function offerCatalog(area) {
  return {
    "@type": "OfferCatalog",
    name: "Residential lawn care and holiday lighting",
    itemListElement: SERVICE_CATALOG.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.name,
        description: service.description,
        areaServed: area,
      },
    })),
  };
}

/**
 * Homepage entity graph. Address, hours, price, and reviews are omitted
 * because the site facts do not include them.
 */
export function localBusinessJson(site, canonical, extras = {}) {
  const pageUrl = absoluteHttp(canonical);
  const image = absoluteHttp(extras.image);
  const logo = absoluteHttp(extras.logo);
  const description = typeof extras.description === "string" ? extras.description.trim() : "";
  const title = typeof extras.title === "string" ? extras.title.trim() : "";
  const telephone = formatTelephone(site.phoneHref);
  const area = site.areaServed ? { "@type": "AdministrativeArea", name: site.areaServed } : undefined;
  const business = {
    "@type": "LocalBusiness",
    name: site.name,
    slogan: BUSINESS_SLOGAN,
    telephone,
    areaServed: area,
    hasOfferCatalog: offerCatalog(area),
  };
  if (description) business.description = description;
  if (pageUrl) {
    business["@id"] = `${pageUrl}#business`;
    business.url = pageUrl;
  }
  if (image) business.image = image;
  if (logo) business.logo = logo;
  if (site.contactName && telephone) {
    business.contactPoint = {
      "@type": "ContactPoint",
      telephone,
      contactType: "customer service",
      name: site.contactName,
      areaServed: area,
    };
  }

  const graph = [business];
  if (pageUrl) {
    graph.unshift({
      "@type": "WebSite",
      "@id": `${pageUrl}#website`,
      url: pageUrl,
      name: site.name,
      description: description || undefined,
      inLanguage: "en",
      publisher: { "@id": `${pageUrl}#business` },
    });
    const webpage = {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title || site.name,
      inLanguage: "en",
      isPartOf: { "@id": `${pageUrl}#website` },
      about: { "@id": `${pageUrl}#business` },
      mainEntity: { "@id": `${pageUrl}#business` },
    };
    if (description) webpage.description = description;
    if (image) webpage.primaryImageOfPage = { "@type": "ImageObject", url: image };
    graph.push(webpage);
  }

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}
