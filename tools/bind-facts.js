/**
 * Bind design literals to src/_data/site.js.
 * Missing facts (address, email, hours) are not given stand-in copy.
 */
export function bindSiteFacts(html) {
  return html
    .replaceAll("tel:2149629089", "{{ site.phoneHref }}")
    .replaceAll("214-962-9089", "{{ site.phone }}")
    .replaceAll("Green Garden Lawn Care", "{{ site.name }}")
    .replaceAll("Green Garden", "{{ site.wordmarkPrimary }}")
    .replaceAll("Lawn Care", "{{ site.wordmarkSecondary }}")
    .replaceAll("Chris Rivera", "{{ site.contactName }}")
    .replace(/\bChris\b/g, "{{ site.contactShort }}")
    .replaceAll("North Texas", "{{ site.areaServed }}");
}
