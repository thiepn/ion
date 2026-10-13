import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  throw new Error("Usage: node scripts/brand.mjs dist/index.html");
}

let html = readFileSync(file, "utf8");

const assertReplace = (pattern, replacement, label) => {
  if (!pattern.test(html)) {
    throw new Error("HexGL upstream markup changed: cannot find " + label);
  }
  html = html.replace(pattern, replacement);
};

assertReplace(/<title>[^<]*<\/title>/i, "<title>ION — Anti-Gravity Racing</title>", "page title");
assertReplace(
  /<meta name="description"[^>]*>/i,
  '<meta name="description" content="ION is an anti-gravity browser racing game, based on the open-source HexGL by Thibaut Despoulain.">',
  "description"
);
html = html
  .replace(/<meta property="og:title"[^>]*>/i, '<meta property="og:title" content="ION — Anti-Gravity Racing">')
  .replace(/<meta property="og:url"[^>]*>/i, '<meta property="og:url" content="https://ion.thiepn.dev/">')
  .replace(/<meta property="og:image"[^>]*>\s*/i, "")
  .replace(/<meta property="og:site_name"[^>]*>/i, '<meta property="og:site_name" content="ION">')
  .replace(/<meta property="fb:admins"[^>]*>\s*/i, "")
  .replace(/<link rel="icon"[^>]*>\s*/i, "")
  .replace(/<link rel="shortcut icon"[^>]*>\s*/i, "");

// Do not report activity to the original developer's Google Analytics property.
html = html.replace(/<script type="text\/javascript">\s*\/\/analytics[\s\S]*?<\/script>\s*/i, "");

assertReplace(
  /<div id="title">\s*<\/div>/i,
  '<div id="title"><span class="ion-wordmark">ION</span><span class="ion-subtitle">ANTI-GRAVITY RACING</span></div>',
  "original title area"
);

assertReplace(
  /<div id="credits" style="display: none">/i,
  '<div id="credits" style="display: none"><h2>ION</h2><p>Built from HexGL by Thibaut Despoulain (BKcore). Original credits follow. <a href="ion/credits.html" target="_blank" rel="noopener noreferrer">Licensing and full acknowledgements</a></p>',
  "original credits container"
);

assertReplace(
  /<\/head>/i,
  '<meta name="theme-color" content="#091320">\n<link rel="icon" href="ion/favicon.svg" type="image/svg+xml">\n<link rel="stylesheet" href="ion/ion.css">\n</head>',
  "head closing"
);

assertReplace(
  /<\/div>\s*<\/div>\s*<\/div>\s*<div id="step-2"/i,
  '</div></div><div class="ion-meta"><span>ION / SINGLE PLAYER</span><a href="ion/credits.html" target="_blank" rel="noopener noreferrer">CREDITS &amp; LICENSES</a></div></div><div id="step-2"',
  "menu closing"
);

writeFileSync(file, html, "utf8");
console.log("Applied ION branding to", file);
