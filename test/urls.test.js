import test from "node:test";
import assert from "node:assert/strict";
import { canonicalUrl, withPrefix } from "../src/lib/urls.js";

test("withPrefix joins a subpath once", () => {
  assert.equal(withPrefix("/", "/assets/css/site.css"), "/assets/css/site.css");
  assert.equal(withPrefix("", "/"), "/");
  assert.equal(withPrefix("/lawn/", "/assets/img/logo.jpg"), "/lawn/assets/img/logo.jpg");
  assert.equal(withPrefix("lawn", "services"), "/lawn/services");
  assert.equal(withPrefix("/lawn", "https://example.com/a"), "https://example.com/a");
  assert.equal(withPrefix("/lawn", "tel:2149629089"), "tel:2149629089");
});

test("canonicalUrl uses the site origin when one is configured", () => {
  assert.equal(canonicalUrl("", "/lawn", "/"), "/lawn/");
  assert.equal(canonicalUrl("https://example.com/", "", "/"), "https://example.com/");
  assert.equal(canonicalUrl("https://example.com", "/lawn", "/sitemap.xml"), "https://example.com/lawn/sitemap.xml");
});
