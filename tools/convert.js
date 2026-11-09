const ACTIONS = {
  toggleMenu: 'data-action="toggle-menu" aria-controls="mobile-menu"',
  closeMenu: 'data-action="close-menu"',
  "f.onClick": 'data-action="filter" data-filter="{{ f.id }}"',
  "g.open":
    'data-action="open-lightbox" data-index="{{ loop.index0 }}" data-src="{{ g.src | url }}" data-alt="{{ g.alt }}" data-label="{{ g.label }}" data-cat="{{ g.cat }}"',
  closeLightbox: 'data-action="close-lightbox"',
  lbPrev: 'data-action="lightbox-prev"',
  lbNext: 'data-action="lightbox-next"',
  stop: 'data-action="lightbox-stop"',
  reset: 'data-action="reset-form"',
};

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

function findTagEnd(html, from) {
  let quote = null;
  for (let i = from; i < html.length; i++) {
    const char = html[i];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ">") return i;
  }
  throw new Error("Unclosed tag in the design template");
}

function parseAttrs(tag) {
  const attrs = {};
  const re = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
  let match;
  while ((match = re.exec(tag))) attrs[match[1]] = match[2] ?? match[3] ?? "";
  return attrs;
}

function exprFromMustache(value) {
  const match = String(value || "").match(/^\s*\{\{\s*([\s\S]+?)\s*\}\}\s*$/);
  if (!match) throw new Error(`Expected a mustache expression, received ${value}`);
  const expr = match[1].trim();
  if (!/^[A-Za-z_][\w.]*$/.test(expr)) throw new Error(`Unsupported expression: ${expr}`);
  return expr;
}

function matchingClose(html, openStart, name) {
  const openEnd = findTagEnd(html, openStart);
  const openTag = html.slice(openStart, openEnd + 1);
  if (/\/>\s*$/.test(openTag)) {
    return { innerStart: openEnd + 1, innerEnd: openEnd + 1, end: openEnd + 1, empty: true };
  }
  let depth = 1;
  let i = openEnd + 1;
  const openRe = new RegExp(`<${name}\\b`, "gi");
  const closeRe = new RegExp(`</${name}\\s*>`, "gi");
  while (depth > 0) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const open = openRe.exec(html);
    const close = closeRe.exec(html);
    if (!close) throw new Error(`Unclosed <${name}>`);
    if (open && open.index < close.index) {
      depth += 1;
      i = findTagEnd(html, open.index) + 1;
    } else {
      depth -= 1;
      if (depth === 0) {
        return { innerStart: openEnd + 1, innerEnd: close.index, end: close.index + close[0].length };
      }
      i = close.index + close[0].length;
    }
  }
  throw new Error(`Unclosed <${name}>`);
}

export function importantify(css) {
  return css
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (/!\s*important$/i.test(part) ? part : `${part} !important`))
    .join(";");
}

function tagName(tag) {
  return /^<\/?\s*([A-Za-z0-9:-]+)/.exec(tag)?.[1]?.toLowerCase() || "";
}

function isVoid(tag) {
  return VOID_TAGS.has(tagName(tag)) || /\/>\s*$/.test(tag);
}

function addToStartTag(tag, { className, hidden, extra }) {
  const selfClosing = /\/>\s*$/.test(tag);
  const end = selfClosing ? tag.lastIndexOf("/>") : tag.lastIndexOf(">");
  let inner = tag.slice(0, end);
  const tail = tag.slice(end);
  if (className) {
    if (/\sclass\s*=\s*"/.test(inner)) inner = inner.replace(/\sclass\s*=\s*"/, ` class="${className} `);
    else inner += ` class="${className}"`;
  }
  if (hidden && !/\shidden(\s|=|>|$)/.test(`${inner}>`)) inner += " hidden";
  for (const attribute of extra) {
    const name = attribute.split("=")[0];
    if (!new RegExp(`\\s${name}\\s*=`).test(inner)) inner += ` ${attribute}`;
  }
  return inner + tail;
}

function annotateTopLevel(html, options) {
  if (!options.className && !options.hidden && options.extra.length === 0) return html;
  let out = "";
  let depth = 0;
  let i = 0;
  while (i < html.length) {
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i);
      const stop = end === -1 ? html.length : end + 3;
      out += html.slice(i, stop);
      i = stop;
      continue;
    }
    if (html[i] !== "<") {
      out += html[i];
      i += 1;
      continue;
    }
    const tagEnd = findTagEnd(html, i);
    let tag = html.slice(i, tagEnd + 1);
    const closing = html[i + 1] === "/";
    if (!closing && depth === 0 && /^<[A-Za-z]/.test(tag)) tag = addToStartTag(tag, options);
    if (closing) depth = Math.max(0, depth - 1);
    else if (!isVoid(tag)) depth += 1;
    out += tag;
    i = tagEnd + 1;
  }
  return out;
}

function annotateBranch(inner, expr) {
  let className = "";
  if (expr === "isDesktop") className = "when-desktop";
  if (expr === "isMobile") className = "when-mobile";
  if (expr === "showBottomBar") className = /position:\s*fixed/.test(inner) ? "when-bar" : "when-bar-spacer";
  const hidden = expr === "menuOpen" || expr === "lightboxOpen" || expr === "submitted";
  const extra = [];
  if (expr === "menuOpen") extra.push('id="mobile-menu"', 'data-panel="menu"');
  if (expr === "lightboxOpen") extra.push('data-panel="lightbox"', "data-lightbox");
  if (expr === "submitted") extra.push('data-panel="success"');
  if (expr === "notSubmitted") extra.push('data-panel="form"');
  return annotateTopLevel(inner, { className, hidden, extra });
}

function transformFlow(html) {
  let out = "";
  let i = 0;
  while (i < html.length) {
    const next = html.indexOf("<sc-", i);
    if (next === -1) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, next);
    const tagEnd = findTagEnd(html, next);
    const tag = html.slice(next, tagEnd + 1);
    const name = /^<(sc-if|sc-for)\b/i.exec(tag)?.[1]?.toLowerCase();
    if (!name) {
      out += tag;
      i = tagEnd + 1;
      continue;
    }
    const span = matchingClose(html, next, name);
    const inner = transformFlow(html.slice(span.innerStart, span.innerEnd));
    const attrs = parseAttrs(tag);
    if (name === "sc-for") {
      const list = exprFromMustache(attrs.list || "");
      const alias = attrs.as || "item";
      if (!/^[A-Za-z_]\w*$/.test(alias)) throw new Error(`Bad sc-for alias: ${alias}`);
      out += `{% for ${alias} in ${list} %}${inner}{% endfor %}`;
    } else {
      const expr = exprFromMustache(attrs.value || "");
      out += `{% if ${expr} %}${annotateBranch(inner, expr)}{% endif %}`;
    }
    i = span.end;
  }
  return out;
}

function rewriteTag(tag, state) {
  if (!tag.startsWith("<") || tag.startsWith("</")) return tag;
  let classNames = [];
  tag = tag.replace(/\sstyle-([a-z]+)\s*=\s*"([^"]*)"/gi, (full, pseudo, css) => {
    const key = `${pseudo}|${css}`;
    let cls = state.cache.get(key);
    if (!cls) {
      cls = `scp${state.count.toString(36)}`;
      state.count += 1;
      state.cache.set(key, cls);
      const element = pseudo === "before" || pseudo === "after";
      const selector = element ? `.${cls}::${pseudo}` : `.${cls}:${pseudo}`;
      state.rules.push(`${selector}{${element ? css : importantify(css)}}`);
    }
    classNames.push(cls);
    return "";
  });
  if (classNames.length) tag = addToStartTag(tag, { className: classNames.join(" "), hidden: false, extra: [] });
  tag = tag.replace(/\sonClick="\{\{\s*([^}]+?)\s*\}\}"/g, (full, expr) => {
    const action = ACTIONS[expr.trim()];
    if (!action) throw new Error(`Unmapped click handler: ${expr.trim()}`);
    return ` ${action}`;
  });
  tag = tag.replace(/\sonChange="\{\{[^}]+\}\}"/g, "");
  tag = tag.replace(
    /\sonSubmit="\{\{\s*submit\s*\}\}"/,
    ` action="{{ '/api/estimate.php' | url }}" method="post" data-estimate-form`,
  );
  tag = tag.replace(/aria-expanded="\{\{\s*menuOpen\s*\}\}"/g, 'aria-expanded="{{ menuExpanded | tf }}"');
  tag = tag.replace(/aria-pressed="\{\{\s*([^}]+)\s*\}\}"/g, 'aria-pressed="{{ $1 | tf }}"');
  tag = tag.replace(/src="\{\{\s*(heroImage|g\.src|lbSrc)\s*\}\}"/g, 'src="{{ $1 | url }}"');
  if (tag.includes("{{ headerInk }}")) tag = addToStartTag(tag, { className: "", hidden: false, extra: ["data-header-ink"] });
  if (tag.includes("{{ headerBg }}")) tag = addToStartTag(tag, { className: "", hidden: false, extra: ["data-header-bg"] });
  return tag;
}

function walkTags(html, state) {
  let out = "";
  let i = 0;
  while (i < html.length) {
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i);
      const stop = end === -1 ? html.length : end + 3;
      out += html.slice(i, stop);
      i = stop;
      continue;
    }
    if (html[i] !== "<") {
      const next = html.indexOf("<", i);
      if (next === -1) {
        out += html.slice(i);
        break;
      }
      out += html.slice(i, next);
      i = next;
      continue;
    }
    const tagEnd = findTagEnd(html, i);
    out += rewriteTag(html.slice(i, tagEnd + 1), state);
    i = tagEnd + 1;
  }
  return out;
}

function replaceDataUris(html, uriToSrc) {
  let out = html;
  const entries = [...uriToSrc.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [uri, src] of entries) {
    if (!out.includes(uri)) continue;
    out = out.replaceAll(uri, `{{ '${src}' | url }}`);
  }
  if (/data:(?:image|font)\//.test(out)) {
    throw new Error("Template still contains an unpacked asset");
  }
  return out;
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function extractHelmet(template) {
  const open = template.indexOf("<helmet>");
  const close = template.indexOf("</helmet>");
  if (open < 0 || close < 0) throw new Error("Design template is missing <helmet>");
  const inner = template.slice(open + "<helmet>".length, close);
  let body = template.slice(0, open) + template.slice(close + "</helmet>".length);
  body = body.replace(/^\s*<x-dc>\s*/, "").replace(/\s*<\/x-dc>\s*$/, "");
  const title = decodeEntities((inner.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "").trim();
  const description = decodeEntities(
    (inner.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [])[1] || "",
  ).trim();
  if (!title || !description) throw new Error("Helmet is missing a title or description");
  const links = [...inner.matchAll(/<link\b[^>]*>/g)].map((match) => match[0]);
  const style = (inner.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "";
  return { title, description, links, style, body };
}

export function fontLinkPartial(links) {
  const lines = [...links];
  const sheetIndex = lines.findIndex((link) => link.includes("fonts.googleapis.com/css"));
  const href = sheetIndex >= 0 ? lines[sheetIndex].match(/href="([^"]+)"/)?.[1] : "";
  if (href && !lines.some((link) => link.includes("fonts.gstatic.com"))) {
    lines.splice(sheetIndex, 0, '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
  }
  const sheetAt = lines.findIndex((link) => link.includes("fonts.googleapis.com/css"));
  if (href && !lines.some((link) => link.includes('rel="preload"'))) {
    lines.splice(sheetAt, 0, `<link rel="preload" as="style" href="${href}">`);
  }
  return `${lines.join("\n")}\n`;
}

function sliceElement(html, name) {
  const openAt = html.search(new RegExp(`<${name}\\b`, "i"));
  if (openAt < 0) return null;
  const span = matchingClose(html, openAt, name);
  return { html: html.slice(openAt, span.end), start: openAt, end: span.end };
}

export function splitChrome(html) {
  const header = sliceElement(html, "header");
  const footer = sliceElement(html, "footer");
  if (!header || !footer || footer.start < header.end) {
    throw new Error("Converted template is missing header or footer chrome");
  }
  const navAt = header.html.search(/<nav\b/i);
  if (navAt < 0) throw new Error("Converted header is missing navigation");
  const navSpan = matchingClose(header.html, navAt, "nav");
  const nav = header.html.slice(navAt, navSpan.end);
  const headerHtml =
    header.html.slice(0, navAt) + '{% include "components/nav.njk" %}' + header.html.slice(navSpan.end);
  return {
    header: headerHtml,
    nav,
    footer: footer.html,
    bottom: html.slice(footer.end).trim() ? html.slice(footer.end) : "",
    view: html.slice(header.end, footer.start),
  };
}

export function convertTemplate(template, { uriToSrc = new Map() } = {}) {
  const helmet = template.includes("<helmet>") ? extractHelmet(template) : null;
  let html = helmet ? helmet.body : template;
  html = replaceDataUris(html, uriToSrc);
  const state = { cache: new Map(), rules: [], count: 0 };
  html = walkTags(html, state);
  html = transformFlow(html);
  html = html.replaceAll(
    "<span>{{ phoneLabel }}</span>",
    '<span data-phone-label data-phone="{{ site.phone }}">{{ phoneLabel }}</span>',
  );
  if (html.includes("onClick=") || html.includes("style-hover") || html.includes("style-focus")) {
    throw new Error("Template still contains a design-tool handler or pseudo style");
  }
  return {
    html,
    hoverCss: state.rules.length ? `${state.rules.join("\n")}\n` : "",
    helmet,
  };
}
