import { SERVICE_CATALOG } from "../lib/schema.js";

const hrefs = {
  "Holiday Light Installation": "/#holiday",
  "Lawn Maintenance": "/#services",
  "Shrub & Hedge Trimming": "/#services",
  "Flower Bed Cleanouts": "/#services",
};

export default {
  permalink: "/llms.txt",
  eleventyExcludeFromCollections: true,
  layout: false,
  services: SERVICE_CATALOG.map((service) => ({
    ...service,
    href: hrefs[service.name] || "/#services",
  })),
};
