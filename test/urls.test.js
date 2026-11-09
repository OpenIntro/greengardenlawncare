import test from "node:test";
import assert from "node:assert/strict";
import { canonicalUrl, normalizeSiteOrigin, withPrefix } from "../src/lib/urls.js";

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
  assert.equal(canonicalUrl("http://localhost:8080", "", "/"), "http://localhost:8080/");
});

test("a hostname without a protocol is published as https", () => {
  assert.equal(normalizeSiteOrigin(""), "");
  assert.equal(normalizeSiteOrigin("greengardenlawncare.com"), "https://greengardenlawncare.com");
  assert.equal(normalizeSiteOrigin("https://greengardenlawncare.com/"), "https://greengardenlawncare.com");
  assert.equal(canonicalUrl("greengardenlawncare.com/", "", "/sitemap.xml"), "https://greengardenlawncare.com/sitemap.xml");
});
