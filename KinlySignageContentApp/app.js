const pages = window.KINLY_SIGNAGE_PAGES || [];
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
      (item) => `
        <li class="highlight-item">
          <div>
            <strong>${item.title}</strong>
            <span>${item.text}</span>
          </div>
        </li>
      `
    )
    .join("");

  const stats = page.stats
    .map(
      (item) => `
        <article class="stat">
          <div class="stat-label">${item.label}</div>
          <div class="stat-value">${item.value}</div>
        </article>
      `
    )
    .join("");

  app.innerHTML = `
    <section class="page">
      <header class="page-header">
        <div class="brand-lockup">
          <div class="brand-mark">K</div>
          <div class="brand-name">
            <strong>Kinly</strong>
            <span>Signage Content App</span>
          </div>
        </div>
        <div class="meta-pill">${page.id}</div>
      </header>

      <section class="hero">
        <div class="eyebrow">${page.eyebrow}</div>
        <h1>${page.title}</h1>
        <p>${page.summary}</p>
        <div class="kicker">${page.kicker}</div>
      </section>

      <section class="content-grid">
        <article class="panel">
          <h2 class="panel-title">Highlights</h2>
          <ul class="highlight-list">${highlights}</ul>
        </article>
        <aside class="stats">${stats}</aside>
      </section>

      <footer class="page-footer">
        <span>${page.footer}</span>
        <span class="page-count">${index + 1} / ${total}</span>
      </footer>
    </section>
  `;
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
