import { HEADER_CHROME, galleryLayout, heroFor, phoneLabel } from "./season.js";

export const GALLERY = [
  {
    key: "starry-night-two-story-home-with-multicolor-holiday-lights",
    alt: "Large two-story home with colorful holiday lights outlining its rooflines under a starry night sky",
    cat: "holiday",
    label: "Multicolor roofline lighting",
  },
  {
    key: "freshly-mowed-lawn-with-clean-edges-in-front-of-a-brick-home",
    alt: "Freshly mowed lawn and shaped hedges in front of a brick home",
    cat: "lawn",
    label: "Lawn & hedge maintenance",
  },
  {
    key: "warm-white-holiday-lights-installed-along-a-homes-roofline",
    alt: "Home with warm white holiday lights along the roofline and garage",
    cat: "holiday",
    label: "Warm white lighting",
  },
  {
    key: "neatly-rounded-shrubs-in-a-mulched-bed-beside-a-front-porch",
    alt: "Rounded shrubs trimmed and bedded in fresh black mulch",
    cat: "lawn",
    label: "Shrub trimming",
  },
  {
    key: "flower-bed-refreshed-with-new-red-mulch-along-a-porch",
    alt: "Flower bed refreshed with red mulch along a front porch",
    cat: "lawn",
    label: "Flower bed cleanout",
  },
  {
    key: "stone-front-two-story-home-with-multicolor-holiday-lights-framing-every-window-and-gable",
    alt: "Stone-front home with multicolor lights framing windows and gables",
    cat: "holiday",
    label: "Window & gable accents",
  },
  {
    key: "neatly-edged-corner-lot-lawn-after-mowing",
    alt: "Neatly edged corner lot lawn after mowing",
    cat: "lawn",
    label: "Mowing & edging",
  },
];

const SERVICES = [
  "Holiday Light Installation",
  "Lawn Maintenance",
  "Shrub & Hedge Trimming",
  "Flower Bed Cleanouts",
  "Multiple Services",
];

function assetSrc(assets, key) {
  const record = assets[key];
  if (!record?.src) throw new Error(`Asset map is missing ${key}. Run npm run extract.`);
  return record.src;
}

function field(value = "") {
  return {
    value,
    error: "",
    border: value ? "1px solid #D7DDD6" : "1px solid #D7DDD6",
  };
}

export function buildHomeData(site, assets, { isMobile = false, filter = "all" } = {}) {
  const hero = heroFor(site.season, site.name);
  const galleryItems = GALLERY.map((item, index) => {
    const layout = galleryLayout(index, isMobile);
    return {
      ...item,
      src: assetSrc(assets, item.key),
      ...layout,
    };
  });
  const filters = [
    { id: "all", label: "All Projects" },
    { id: "lawn", label: "Lawn & Landscaping" },
    { id: "holiday", label: "Holiday Lighting" },
  ].map((item) => {
    const active = item.id === filter;
    return {
      ...item,
      active,
      bg: active ? "#103D27" : "transparent",
      ink: active ? "#F8F7F2" : "#103D27",
    };
  });
  const first = galleryItems[0];
  return {
    ...HEADER_CHROME.dark,
    phoneLabel: phoneLabel(site.phone, isMobile),
    navLinks: [
      { label: "Home", href: "#home" },
      { label: "Lawn Care", href: "#services" },
      { label: "Holiday Lights", href: "#holiday" },
      { label: "Our Work", href: "#work" },
      { label: "Contact", href: "#estimate" },
    ],
    heroImage: assetSrc(assets, hero.imageKey),
    heroAlt: hero.heroAlt,
    heroFocus: hero.heroFocus,
    heroEyebrow: hero.heroEyebrow,
    heroCopy: hero.heroCopy,
    heroSecondaryHref: hero.heroSecondaryHref,
    heroSecondaryLabel: hero.heroSecondaryLabel,
    heroNote: hero.heroNote,
    filters,
    galleryItems,
    services: SERVICES,
    name: field(),
    phone: field(),
    email: field(),
    service: field(),
    address: field(),
    notes: field(),
    lbSrc: first.src,
    lbAlt: first.alt,
    lbLabel: first.label,
    lbCount: `1 / ${galleryItems.length}`,
    year: new Date().getFullYear(),
    // Both viewport branches are rendered. CSS shows the one that fits.
    isDesktop: true,
    isMobile: true,
    showBottomBar: true,
    // Closed and unsent states stay in the DOM, hidden, so they work without a rebuild.
    menuOpen: true,
    menuExpanded: false,
    lightboxOpen: true,
    notSubmitted: true,
    submitted: true,
  };
}
