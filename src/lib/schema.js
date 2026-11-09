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

/** LocalBusiness for the homepage. Address is omitted when the site has none. */
export function localBusinessJson(site, canonical) {
  const telephone = formatTelephone(site.phoneHref);
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    telephone,
    areaServed: site.areaServed,
  };
  if (canonical && /^https?:\/\//.test(canonical)) data.url = canonical;
  if (site.contactName) {
    data.contactPoint = {
      "@type": "ContactPoint",
      telephone,
      contactType: "customer service",
      name: site.contactName,
      areaServed: site.areaServed,
    };
  }
  return JSON.stringify(data);
}
