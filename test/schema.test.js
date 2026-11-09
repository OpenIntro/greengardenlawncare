import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { BUSINESS_SLOGAN, SERVICE_CATALOG, localBusinessJson } from "../src/lib/schema.js";
import { unpack } from "../tools/unpack.js";

const site = {
  name: "Green Garden Lawn Care",
  phoneHref: "tel:2149629089",
  areaServed: "North Texas",
  contactName: "Chris Rivera",
};

test("homepage schema states the visible business and does not invent proof", () => {
  const data = JSON.parse(
    localBusinessJson(site, "https://greengardenlawncare.com/", {
      image: "https://greengardenlawncare.com/assets/img/hero.jpg",
      logo: "https://greengardenlawncare.com/assets/img/logo.jpg",
      title: "Green Garden Lawn Care | Lawn Care & Holiday Light Installation in North Texas",
      description: "Residential lawn care and holiday lighting in North Texas.",
    }),
  );
  assert.equal(data["@context"], "https://schema.org");
  assert.deepEqual(
    data["@graph"].map((node) => node["@type"]),
    ["WebSite", "LocalBusiness", "WebPage"],
  );
  const business = data["@graph"][1];
  assert.equal(business["@id"], "https://greengardenlawncare.com/#business");
  assert.equal(business.url, "https://greengardenlawncare.com/");
  assert.equal(business.telephone, "+1-214-962-9089");
  assert.equal(business.slogan, BUSINESS_SLOGAN);
  assert.equal(business.image, "https://greengardenlawncare.com/assets/img/hero.jpg");
  assert.equal(business.logo, "https://greengardenlawncare.com/assets/img/logo.jpg");
  assert.equal(business.contactPoint.name, "Chris Rivera");
  assert.equal(business.areaServed.name, "North Texas");
  assert.equal(business.address, undefined);
  assert.equal(business.aggregateRating, undefined);
  const offers = business.hasOfferCatalog.itemListElement;
  assert.deepEqual(
    offers.map((offer) => offer.itemOffered.name),
    SERVICE_CATALOG.map((service) => service.name),
  );
  assert.equal(offers.some((offer) => "price" in offer || "price" in offer.itemOffered), false);
  assert.equal(data["@graph"][2].primaryImageOfPage.url, business.image);
  assert.equal(JSON.stringify(data).includes("review"), false);
});

test("schema stays usable when the build has no absolute origin", () => {
  const data = JSON.parse(localBusinessJson(site, "/"));
  assert.deepEqual(
    data["@graph"].map((node) => node["@type"]),
    ["LocalBusiness"],
  );
  assert.equal(data["@graph"][0].url, undefined);
  assert.equal(data["@graph"][0].image, undefined);
});

test("service schema repeats the homepage service cards", () => {
  const template = unpack(fs.readFileSync(new URL("../index.html", import.meta.url), "utf8")).template;
  for (const service of SERVICE_CATALOG) {
    const name = service.name.replaceAll("&", "&amp;");
    assert.equal(template.includes(name), true, service.name);
    assert.equal(template.includes(service.description), true, service.description);
  }
  assert.equal(template.includes("Beautiful Homes."), true);
  assert.equal(template.includes("Every Season."), true);
});
