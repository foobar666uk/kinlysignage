import { PAGES } from "../content/pages-data.js";

const pages = PAGES;

const styles = `
:root {
  --bg-1: #09111f;
  --bg-2: #122846;
  --panel: rgba(7, 16, 28, 0.72);
  --panel-border: rgba(255, 255, 255, 0.14);
  --text: #f5f7fb;
  --muted: rgba(245, 247, 251, 0.72);
  --accent: #3dd6c6;
  --accent-soft: rgba(61, 214, 198, 0.18);
  --warning: #ffb84d;
  --shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
  --heading-font: "Bahnschrift", "Segoe UI Variable Display", "Segoe UI", sans-serif;
  --body-font: "Aptos", "Segoe UI Variable Text", "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body {
  background:
    radial-gradient(circle at top, rgba(61, 214, 198, 0.22), transparent 30%),
    linear-gradient(180deg, var(--bg-2) 0%, var(--bg-1) 100%);
  color: var(--text);
  font-family: var(--body-font);
}
.viewport {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
}
.signage-shell {
  width: min(calc(100vw - 48px), calc((100vh - 48px) * 9 / 16));
  aspect-ratio: 9 / 16;
}
.signage-card {
  position: relative;
  isolation: isolate;
  height: 100%;
  padding: 64px 56px;
  overflow: hidden;
  border-radius: 36px;
  background:
    linear-gradient(180deg, rgba(10, 22, 38, 0.92), rgba(7, 14, 24, 0.96)),
    linear-gradient(145deg, rgba(61, 214, 198, 0.1), transparent 40%);
  border: 1px solid var(--panel-border);
  box-shadow: var(--shadow);
}
.signage-card::before,
.signage-card::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  filter: blur(12px);
  z-index: -1;
}
.signage-card::before {
  top: 88px;
  right: -56px;
  width: 220px;
  height: 220px;
  background: rgba(61, 214, 198, 0.22);
}
.signage-card::after {
  bottom: 120px;
  left: -36px;
  width: 180px;
  height: 180px;
  background: rgba(255, 184, 77, 0.18);
}
.page {
  height: 100%;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 40px;
}
.page-header,
.page-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.brand-lockup {
  display: flex;
  align-items: center;
  gap: 16px;
}
.brand-mark {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: linear-gradient(145deg, var(--accent), #3a89ff);
  color: #06101e;
  font: 800 18px/1 var(--heading-font);
}
.brand-name {
  display: grid;
  gap: 4px;
}
.brand-name strong {
  font: 700 28px/1 var(--heading-font);
  letter-spacing: -0.04em;
}
.brand-name span,
.meta-pill,
.page-footer {
  color: var(--muted);
}
.meta-pill {
  padding: 12px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 15px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.hero {
  display: grid;
  gap: 20px;
}
.eyebrow {
  color: var(--accent);
  font: 700 18px/1.2 var(--heading-font);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.hero h1 {
  margin: 0;
  font: 800 76px/0.96 var(--heading-font);
  letter-spacing: -0.06em;
}
.hero p {
  margin: 0;
  max-width: 760px;
  color: var(--muted);
  font-size: 28px;
  line-height: 1.35;
}
.content-grid {
  display: grid;
  grid-template-columns: 1.35fr 0.9fr;
  gap: 28px;
  align-content: start;
}
.panel {
  padding: 28px;
  border-radius: 28px;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  backdrop-filter: blur(12px);
}
.panel-title {
  margin: 0 0 20px;
  color: var(--muted);
  font: 600 16px/1 var(--heading-font);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.highlight-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 18px;
}
.highlight-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: start;
}
.highlight-item::before {
  content: "";
  width: 12px;
  height: 12px;
  margin-top: 11px;
  border-radius: 999px;
  background: linear-gradient(145deg, var(--accent), #ffffff);
  box-shadow: 0 0 0 8px var(--accent-soft);
}
.highlight-item strong {
  display: block;
  margin-bottom: 6px;
  font: 600 28px/1.2 var(--body-font);
}
.highlight-item span {
  color: var(--muted);
  font-size: 22px;
  line-height: 1.35;
}
.stats {
  display: grid;
  gap: 18px;
}
.stat {
  padding: 22px 22px 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.stat-label {
  margin-bottom: 12px;
  color: var(--muted);
  font-size: 16px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.stat-value {
  font: 700 38px/1 var(--heading-font);
  letter-spacing: -0.04em;
}
.kicker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(255, 184, 77, 0.12);
  color: #ffd799;
  font-size: 20px;
}
.kicker::before {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--warning);
}
.page-footer {
  font-size: 20px;
}
.page-count {
  font-family: var(--heading-font);
}
@media (max-width: 900px) {
  .viewport { padding: 0; }
  .signage-shell { width: 100vw; }
  .signage-card { border-radius: 0; }
}
`;

const pageJson = JSON.stringify(pages).replace(/</g, "\\u003c");
const script = `
const pages = ${pageJson};
const app = document.getElementById("app");
const search = new URLSearchParams(window.location.search);
const cycleMode = search.get("cycle") === "true";
const pageId = search.get("page");
const requestedDuration = Number.parseInt(search.get("duration") || "", 10);
const duration = Number.isFinite(requestedDuration) ? Math.max(requestedDuration, 3000) : 10000;

function resolvePages() {
  if (!pages.length) {
    return [];
  }

  if (!pageId || cycleMode) {
    return pages;
  }

  const match = pages.find((page) => page.id === pageId);
  return match ? [match] : [pages[0]];
}

function renderPage(page, index, total) {
  const highlights = page.highlights
    .map(
      (item) => \
        '<li class="highlight-item"><div><strong>' + item.title + '</strong><span>' + item.text + '</span></div></li>'
    )
    .join("");

  const stats = page.stats
    .map(
      (item) => \
        '<article class="stat"><div class="stat-label">' + item.label + '</div><div class="stat-value">' + item.value + '</div></article>'
    )
    .join("");

  app.innerHTML =
    '<section class="page">' +
      '<header class="page-header">' +
        '<div class="brand-lockup">' +
          '<div class="brand-mark">K</div>' +
          '<div class="brand-name">' +
            '<strong>Kinly</strong>' +
            '<span>Signage Content App</span>' +
          '</div>' +
        '</div>' +
        '<div class="meta-pill">' + page.id + '</div>' +
      '</header>' +
      '<section class="hero">' +
        '<div class="eyebrow">' + page.eyebrow + '</div>' +
        '<h1>' + page.title + '</h1>' +
        '<p>' + page.summary + '</p>' +
        '<div class="kicker">' + page.kicker + '</div>' +
      '</section>' +
      '<section class="content-grid">' +
        '<article class="panel">' +
          '<h2 class="panel-title">Highlights</h2>' +
          '<ul class="highlight-list">' + highlights + '</ul>' +
        '</article>' +
        '<aside class="stats">' + stats + '</aside>' +
      '</section>' +
      '<footer class="page-footer">' +
        '<span>' + page.footer + '</span>' +
        '<span class="page-count">' + (index + 1) + ' / ' + total + '</span>' +
      '</footer>' +
    '</section>';
}

function start() {
  const selectedPages = resolvePages();

  if (!selectedPages.length) {
    app.innerHTML = "<p>No signage pages found.</p>";
    return;
  }

  let index = 0;
  renderPage(selectedPages[index], index, selectedPages.length);

  if (!cycleMode || selectedPages.length < 2) {
    return;
  }

  window.setInterval(() => {
    index = (index + 1) % selectedPages.length;
    renderPage(selectedPages[index], index, selectedPages.length);
  }, duration);
}

start();
`;

function renderDocument() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Kinly Signage Content</title>
    <style>${styles}</style>
  </head>
  <body>
    <main class="viewport">
      <section class="signage-shell">
        <div id="app" class="signage-card" aria-live="polite"></div>
      </section>
    </main>
    <script>${script}</script>
  </body>
</html>`;
}

export default {
  async fetch(request, env, ctx) {
    void env;
    void ctx;

    const { pathname } = new URL(request.url);

    if (pathname !== "/" && pathname !== "/index.html") {
      return new Response("Not found", { status: 404 });
    }

    return new Response(renderDocument(), {
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    });
  }
};
