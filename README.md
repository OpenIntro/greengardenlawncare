# Green Garden Lawn Care

Static homepage for Green Garden Lawn Care. The approved design is `index.html` at the repository root. Leave that file in place. `build/` is generated from it and can be deleted.

The design file is a Claude Design page (`<x-dc>` plus a `text/x-dc` script), not a `__bundler` package. The extractor accepts both. A `__bundler` package needs `manifest`, `template`, and `page_order` scripts. An unmapped image type, or a missing or invalid payload, stops the extract. Images are written with readable names from their descriptions. This design has no font files; faces load from the Google stylesheet in the design.

## Season

The page is one route, `/`. Holiday lighting is the hero by default. After the holidays, open `src/_data/site.js` and change `configuredSeason` from `"holiday"` to `"standard"`, then rebuild. That swaps the hero photo, headline eyebrow, supporting line, second button, and booking note. The rest of the page stays the same.

For one build without editing the file, set `SEASON=standard` or `SEASON=holiday`. A value other than those two leaves the file setting in place.

## Scripts

```bash
npm install
npm run extract   # unpack index.html into build/ and src/assets
npm run build     # extract, then Eleventy
npm run serve     # extract, then Eleventy at http://127.0.0.1:8080
npm test          # extractor, converter, data, and URL tests
npm run audit     # broken links and missing assets in _site
npm run test:e2e  # screenshot fidelity, axe, keyboard, and mobile
npm run verify    # build, test, audit, and e2e
npm run deploy    # build and upload changed files over SFTP
```

Re-run extract after any change to `index.html`. Edit `src/` by hand. Do not edit `build/`.

## Fidelity

Playwright screenshots the original design and the built homepage at 1440×900, full page, and compares them with pixelmatch. `MAX_DIFF_RATIO` is `0.001`. A named view can have its own cap in `VIEW_DIFF_CAPS` only when a pending-content treatment is approved. Do not raise the default cap to hide a mismatch. On failure the test writes `e2e/screenshots/home-original.png`, `home-built.png`, and `home-diff.png`.

## Deploy

Copy `.env.example` to `.env`. Deploy reads the host, user, credential, and remote document root from there. It uploads files whose contents changed. `--dry-run` prints the plan, `--skip-build` uploads the current `_site`, and `--delete` removes remote files that are not in the build.

`--delete` runs only when the remote directory is this site's document root and `site-identity.txt` there reads `Green Garden Lawn Care`. The first deploy has to be without `--delete` so that identity file exists. `.well-known` and `cgi-bin` are never deleted. `.env` and the deploy manifest stay out of git.

The estimate form posts to `src/api/estimate.php`. With JavaScript, the page sends that same request and shows the success panel only after the script accepts it. The script sends two branded messages, with the logo and the site colors: a thank-you recap to the visitor, and the request to `ESTIMATE_TO`. Mail is sent from `chris@greengardenlawncare.com`. The build writes `ESTIMATE_TO` into the copy under `_site`. Deploy refuses to upload a handler that still has the placeholder.
