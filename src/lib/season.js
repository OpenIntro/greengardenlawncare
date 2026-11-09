/** Holiday is the design default. "standard" is the after-holidays hero. */
export function resolveSeason(value, fallback = "holiday") {
  if (value === "holiday" || value === "standard") return value;
  if (fallback === "holiday" || fallback === "standard") return fallback;
  return "holiday";
}

export function phoneLabel(phone, isMobile) {
  return isMobile ? "Call" : `Call ${phone}`;
}

export function heroFor(season, siteName) {
  if (resolveSeason(season) === "standard") {
    return {
      imageKey: "freshly-mowed-lawn-with-clean-edges-in-front-of-a-brick-home",
      heroAlt: "Beautifully maintained lawn and trimmed hedges in front of a brick home",
      heroFocus: "60% 50%",
      heroEyebrow: "North Texas Residential Lawn Care",
      heroCopy:
        "Dependable mowing, trimming, and flower bed care that keeps your home looking sharp through every North Texas season.",
      heroSecondaryHref: "#services",
      heroSecondaryLabel: "Explore Lawn Care",
      heroNote: "Now Scheduling Weekly Lawn Service",
    };
  }
  return {
    imageKey: "starry-night-two-story-home-with-multicolor-holiday-lights",
    heroAlt: "Large two-story home with colorful holiday lights outlining its rooflines under a starry night sky",
    heroFocus: "70% 40%",
    heroEyebrow: "North Texas Lawn Care & Holiday Lighting",
    heroCopy: `From perfectly maintained lawns to beautifully illuminated holiday homes, ${siteName} helps your property look its best all year long.`,
    heroSecondaryHref: "#holiday",
    heroSecondaryLabel: "Explore Holiday Lighting",
    heroNote: "Now Booking Holiday Light Installations",
  };
}

/** Desktop spans match the design's renderVals() at width >= 900. */
export function galleryLayout(index, isMobile) {
  return {
    col: isMobile ? "1 / -1" : index === 0 ? "1 / span 4" : index < 3 ? "5 / span 2" : "span 2",
    ratio: isMobile ? "4 / 3" : index < 3 ? "auto" : "4 / 3",
    minH: !isMobile && index === 0 ? "560px" : !isMobile && index < 3 ? "272px" : "auto",
  };
}

export const HEADER_CHROME = {
  dark: {
    headerBg: "rgba(8,30,20,.35)",
    headerBorder: "rgba(255,255,255,.14)",
    headerInk: "#FFFFFF",
  },
  light: {
    headerBg: "rgba(248,247,242,.92)",
    headerBorder: "rgba(16,61,39,.1)",
    headerInk: "#103D27",
  },
};
