import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { convertTemplate, importantify } from "../tools/convert.js";
import { unpack } from "../tools/unpack.js";
import { buildFontCss } from "../tools/fonts.js";

test("importantify marks every declaration", () => {
  assert.equal(importantify("color:#C6A35A;transform:translateY(-1px)"), "color:#C6A35A !important;transform:translateY(-1px) !important");
});

test("converter turns design constructs into nunjucks, links, and hover css", () => {
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const html = `<sc-if value="{{ isDesktop }}" hint-placeholder-val="{{ true }}">
<nav style-hover="color:#C6A35A">Hi</nav>
</sc-if>
<sc-for list="{{ navLinks }}" as="l" hint-placeholder-count="5">
<a href="{{ l.href }}" onClick="{{ closeMenu }}">{{ l.label }}</a>
</sc-for>
<img src="${png}" alt="Logo mark">
<button type="button" onClick="{{ toggleMenu }}" aria-expanded="{{ menuOpen }}">Menu</button>`;
  const converted = convertTemplate(html, { uriToSrc: new Map([[png, "/assets/img/logo-mark.png"]]) });
  assert.match(converted.html, /\{% if isDesktop %\}/);
  assert.match(converted.html, /class="when-desktop /);
  assert.match(converted.html, /\{% for l in navLinks %\}/);
  assert.match(converted.html, /data-action="close-menu"/);
  assert.match(converted.html, /data-action="toggle-menu"/);
  assert.match(converted.html, /aria-expanded="\{\{ menuExpanded \| tf \}\}"/);
  assert.match(converted.html, /\{\{ '\/assets\/img\/logo-mark\.png' \| url \}\}/);
  assert.doesNotMatch(converted.html, /style-hover|onClick=|data:image/);
  assert.match(converted.hoverCss, /\.scp0:hover\{color:#C6A35A !important\}/);
});

test("duplicate hover rules share one class", () => {
  const html = `<a style-hover="color:#fff">A</a><a style-hover="color:#fff">B</a>`;
  const converted = convertTemplate(html);
  assert.equal(converted.hoverCss.trim().split("\n").length, 1);
  assert.equal((converted.html.match(/class="scp0"/g) || []).length, 2);
});

test("font css points font faces at /assets/fonts and stays empty without rules", () => {
  assert.match(buildFontCss("body{margin:0}"), /No @font-face/);
  const uri = "data:font/woff2;base64,AAAA";
  const css = buildFontCss(`@font-face{font-family:Manrope;src:url(${uri})}`, new Map([[uri, "/assets/fonts/manrope.woff2"]]));
  assert.match(css, /url\(\/assets\/fonts\/manrope\.woff2\)/);
});

test("the homepage template converts without leftover design-tool syntax", () => {
  const bundle = unpack(fs.readFileSync(new URL("../index.html", import.meta.url), "utf8"));
  const converted = convertTemplate(bundle.template, { uriToSrc: bundle.uriToSrc });
  assert.match(converted.html, /\{% for l in navLinks %\}/);
  assert.match(converted.html, /\{% for g in galleryItems %\}/);
  assert.match(converted.html, /data-estimate-form/);
  assert.doesNotMatch(converted.html, /style-hover|style-focus|onClick=|<sc-if|<sc-for|data:image/);
  assert.match(converted.hoverCss, /:hover\{/);
  assert.match(converted.hoverCss, /!important/);
  assert.equal(converted.helmet.title.includes("Green Garden Lawn Care"), true);
});
