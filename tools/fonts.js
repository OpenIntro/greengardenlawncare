/** Rewrite @font-face rules so font files are served from /assets/fonts/. */
export function buildFontCss(styleText, uriToPath = new Map()) {
  const css = String(styleText || "");
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];
  if (!blocks.length) {
    return "/* No @font-face rules in the design bundle. Faces load from the design's font stylesheet. */\n";
  }
  return (
    blocks
      .map((block) => {
        return block.replace(/url\((['"]?)(data:[^)'"]+)\1\)/g, (full, quote, uri) => {
          const mapped = uriToPath.get(uri);
          if (!mapped) throw new Error("Font face payload is missing from the asset map");
          return `url(${quote || ""}${mapped}${quote || ""})`;
        });
      })
      .join("\n") + "\n"
  );
}
