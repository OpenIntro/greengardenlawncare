import { resolveSeason } from "../lib/season.js";
import { normalizeSiteOrigin } from "../lib/urls.js";

/**
 * Site facts. Templates read these keys; they do not invent missing ones.
 *
 * Season controls the hero only:
 *   "holiday"  — holiday lighting hero (the design default)
 *   "standard" — lawn-care hero
 * Change configuredSeason after the holidays.
 * SEASON=holiday or SEASON=standard overrides it for one build.
 * Keep this file's export as the default object. A named export makes Eleventy
 * pass the module itself into templates, and the phone and name disappear.
 */
const configuredSeason = "holiday";

const site = {
  name: "Green Garden Lawn Care",
  wordmarkPrimary: "Green Garden",
  wordmarkSecondary: "Lawn Care",
  phone: "214-962-9089",
  phoneHref: "tel:2149629089",
  email: null,
  hours: null,
  address: null,
  googleBusinessProfile: null,
  gtmId: "GTM-WCT6WQWC",
  contactName: "Chris Rivera",
  contactShort: "Chris",
  areaServed: "North Texas",
  season: resolveSeason(process.env.SEASON, configuredSeason),
  url: normalizeSiteOrigin(process.env.SITE_URL || ""),
  ogImage: "/assets/og/greengarden-holiday-home-showcase.jpg",
  ogImageAlt:
    "Green Garden Lawn Care logo beside a two-story home outlined in multicolor holiday lights",
};

export default site;
