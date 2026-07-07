const NEWS_API_URL = "/api/news?limit=8";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const NEWS_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const WEATHER_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const NEWS_SLIDE_INTERVAL_MS = 10 * 1000;
const CONTENT_PAGE_FLIP_INTERVAL_MS = 30 * 1000;
const PAGE_RELOAD_INTERVAL_MS = 60 * 60 * 1000;
const CLOCK_REFRESH_INTERVAL_MS = 15 * 1000;
const UK_TIME_ZONE = "Europe/London";
const DEFAULT_LOCATION = "sunbury";
const LOCATION_CONFIG = {
  sunbury: {
    displayName: "Sunbury",
    trafficLabels: ["M3 Eastbound", "M3 Westbound", "Local Roads"],
  },
  basingstoke: {
    displayName: "Basingstoke",
    trafficLabels: ["M3 Eastbound", "M3 Westbound", "Local Roads"],
  },
};

function normaliseLocation(value) {
  if (typeof value !== "string") {
    return DEFAULT_LOCATION;
  }

  const trimmed = value.trim().toLowerCase();
  return LOCATION_CONFIG[trimmed] ? trimmed : DEFAULT_LOCATION;
}

function resolveSelectedLocation() {
  const params = new URLSearchParams(window.location.search);
  return normaliseLocation(params.get("location"));
}

const selectedLocation = resolveSelectedLocation();
const API_URL = `/api/traffic-summary?site=${encodeURIComponent(selectedLocation)}`;
const WEATHER_API_URL = `/api/weather?location=${encodeURIComponent(selectedLocation)}`;

const elements = {
  localDate: document.getElementById("local-date"),
  localTime: document.getElementById("local-time"),
  weatherIcon: document.getElementById("weather-icon"),
  weatherTemp: document.getElementById("weather-temp"),
  weatherDesc: document.getElementById("weather-desc"),
  weatherRange: document.getElementById("weather-range"),
  trafficDetails: document.getElementById("traffic-details"),
  newsSlide: document.getElementById("news-slide"),
  newsPrev: document.getElementById("news-prev"),
  newsNext: document.getElementById("news-next"),
  logoImage: document.getElementById("kinly-logo-image"),
  logoFallbackMark: document.getElementById("kinly-logo-fallback-mark"),
  welcomeCity: document.getElementById("welcome-city"),
  contentPages: Array.from(document.querySelectorAll(".content-page")),
};

const newsState = {
  items: [],
  index: 0,
  timerId: null,
};

const contentPageState = {
  index: 0,
  timerId: null,
};

const LOGO_CANDIDATES = [
  "./media/Kinly-Logo-Negative-Transparent-RBG.png",
];

function tryLoadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function loadBrandLogo() {
  if (!elements.logoImage || !elements.logoFallbackMark) {
    return;
  }

  for (const candidate of LOGO_CANDIDATES) {
    const resolved = await tryLoadImage(candidate);
    if (resolved) {
      elements.logoImage.src = resolved;
      elements.logoImage.classList.add("is-visible");
      elements.logoFallbackMark.hidden = true;
      return;
    }
  }

  elements.logoImage.removeAttribute("src");
  elements.logoImage.classList.remove("is-visible");
  elements.logoFallbackMark.hidden = false;
}

function buildBrowserFallback() {
  const labels = LOCATION_CONFIG[selectedLocation].trafficLabels;

  return {
    overallStatus: "Grey",
    items: [
      {
        label: labels[0],
        status: "Grey",
        summary: "Live traffic data is currently unavailable.",
      },
      {
        label: labels[1],
        status: "Grey",
        summary: "Live traffic data is currently unavailable.",
      },
      {
        label: labels[2],
        status: "Grey",
        summary: "Live traffic data is currently unavailable.",
      },
    ],
  };
}

function buildNewsFallback() {
  return {
    source: "BBC News",
    lastUpdated: new Date().toISOString(),
    items: [
      {
        title: "BBC headlines are temporarily unavailable",
        summary: "Latest headlines could not be loaded right now.",
        imageUrl: "",
      },
      {
        title: "Please check back shortly",
        summary: "The news card will refresh automatically.",
        imageUrl: "",
      },
    ],
  };
}

function buildWeatherFallback() {
  return {
    source: "BBC Weather",
    location: LOCATION_CONFIG[selectedLocation].displayName,
    condition: "Weather data unavailable",
    temperatureC: null,
    highC: null,
    lowC: null,
  };
}

function applyLocationBranding() {
  if (elements.welcomeCity) {
    elements.welcomeCity.textContent = LOCATION_CONFIG[selectedLocation].displayName;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function updateClock() {
  const now = new Date();

  if (elements.localDate) {
    elements.localDate.textContent = new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: UK_TIME_ZONE,
    }).format(now);
  }

  if (elements.localTime) {
    elements.localTime.textContent = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: UK_TIME_ZONE,
    }).format(now);
  }
}

function renderTrafficDetails(items) {
  if (!elements.trafficDetails) {
    return;
  }

  const safeItems = Array.isArray(items) && items.length ? items : buildBrowserFallback().items;

  elements.trafficDetails.innerHTML = safeItems
    .slice(0, 3)
    .map((item) => {
      const status = (item?.status || "Grey").toLowerCase();
      const route = escapeHtml(item?.label || "Route update");
      const summary = escapeHtml(item?.summary || "Traffic details unavailable.");
      const statusLabel = escapeHtml(item?.status || "Grey");

      return `
        <article class="traffic-detail-card">
          <div class="traffic-detail-header">
            <span class="traffic-detail-indicator status-${status}" aria-label="${statusLabel} status"></span>
            <p class="traffic-detail-route">${route}</p>
          </div>
          <p class="traffic-detail-summary">${summary}</p>
        </article>
      `;
    })
    .join("");
}

function renderSummary(summary) {
  const safeSummary = summary || buildBrowserFallback();
  renderTrafficDetails(safeSummary.items || []);
}

function getWeatherIconSvg(conditionText) {
  const condition = String(conditionText || "").toLowerCase();

  if (condition.includes("thunder") || condition.includes("storm")) {
    return '<svg class="hero-weather-icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 40c0-7.7 6.3-14 14-14 5.1 0 9.6 2.7 12 6.8 5.6.5 10 5.2 10 10.9 0 6.1-4.9 11-11 11H22c-6.6 0-12-5.4-12-12 0-5.9 4.2-10.8 9.8-11.8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M31 33l-5 11h7l-4 12 13-16h-7l4-7z" fill="#C1ECF9"/></svg>';
  }

  if (condition.includes("snow") || condition.includes("sleet") || condition.includes("hail")) {
    return '<svg class="hero-weather-icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 42c-6.1 0-11-4.9-11-11s4.9-11 11-11c1.8 0 3.4.4 5 1.2A13 13 0 0 1 51 30c0 7.2-5.8 13-13 13H21z" stroke="currentColor" stroke-width="3"/><path d="M24 47v10M19 52h10M40 47v10M35 52h10" stroke="#C1ECF9" stroke-width="2.5" stroke-linecap="round"/></svg>';
  }

  if (condition.includes("rain") || condition.includes("shower") || condition.includes("drizzle")) {
    return '<svg class="hero-weather-icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 41c-6.1 0-11-4.9-11-11s4.9-11 11-11c1.8 0 3.4.4 5 1.2A13 13 0 0 1 51 29c0 7.2-5.8 13-13 13H21z" stroke="currentColor" stroke-width="3"/><path d="M24 45l-2 8M34 45l-2 8M44 45l-2 8" stroke="#C1ECF9" stroke-width="3" stroke-linecap="round"/></svg>';
  }

  if (condition.includes("mist") || condition.includes("fog")) {
    return '<svg class="hero-weather-icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 24h36M10 32h44M16 40h32M12 48h40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="46" cy="16" r="6" fill="#FF835F"/></svg>';
  }

  if (condition.includes("cloud") || condition.includes("overcast")) {
    return '<svg class="hero-weather-icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="21" cy="24" r="7" fill="#FF835F"/><path d="M21 44c-6.1 0-11-4.9-11-11s4.9-11 11-11c1.8 0 3.4.4 5 1.2A13 13 0 0 1 51 32c0 7.2-5.8 13-13 13H21z" stroke="currentColor" stroke-width="3"/></svg>';
  }

  return '<svg class="hero-weather-icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="11" fill="#FF835F"/><path d="M32 8v7M32 49v7M8 32h7M49 32h7M15.6 15.6l5 5M43.4 43.4l5 5M48.4 15.6l-5 5M20.6 43.4l-5 5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
}

function renderWeather(weatherPayload) {
  if (!elements.weatherTemp || !elements.weatherDesc || !elements.weatherRange) {
    return;
  }

  const safeWeather = weatherPayload || buildWeatherFallback();
  const temp = Number.isFinite(safeWeather.temperatureC) ? `${safeWeather.temperatureC}\u00B0C` : "--\u00B0C";
  const high = Number.isFinite(safeWeather.highC) ? `${safeWeather.highC}\u00B0C` : "--\u00B0C";
  const low = Number.isFinite(safeWeather.lowC) ? `${safeWeather.lowC}\u00B0C` : "--\u00B0C";

  elements.weatherTemp.textContent = temp;
  elements.weatherDesc.textContent = safeWeather.condition || "Weather update";
  elements.weatherRange.textContent = `High ${high} / Low ${low}`;

  if (elements.weatherIcon) {
    elements.weatherIcon.innerHTML = getWeatherIconSvg(safeWeather.condition);
  }
}

function renderNewsSlide(item) {
  if (!elements.newsSlide) {
    return;
  }

  const safeItem = item || {
    title: "BBC headline",
    summary: "Read more on BBC News.",
    imageUrl: "",
  };

  const title = escapeHtml(safeItem.title || "BBC headline");
  const summary = escapeHtml(safeItem.summary || "Read more on BBC News.");
  const imageUrl = String(safeItem.imageUrl || "").trim();

  const imageMarkup = imageUrl
    ? `<img class="news-thumb" src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`
    : '<div class="news-thumb-fallback" aria-hidden="true"></div>';

  elements.newsSlide.innerHTML = `
    ${imageMarkup}
    <div class="news-content">
      <p class="news-item-title">${title}</p>
      <p class="news-item-summary">${summary}</p>
    </div>
  `;
}

function showNewsIndex(index) {
  if (!newsState.items.length) {
    return;
  }

  newsState.index = (index + newsState.items.length) % newsState.items.length;
  renderNewsSlide(newsState.items[newsState.index]);
}

function advanceNewsSlide(step = 1) {
  if (!elements.newsSlide || newsState.items.length < 2) {
    return;
  }

  elements.newsSlide.classList.add("is-transitioning");
  window.setTimeout(() => {
    showNewsIndex(newsState.index + step);
    elements.newsSlide.classList.remove("is-transitioning");
  }, 230);
}

function startNewsRotation() {
  if (newsState.timerId) {
    window.clearInterval(newsState.timerId);
    newsState.timerId = null;
  }

  if (newsState.items.length < 2) {
    return;
  }

  newsState.timerId = window.setInterval(() => advanceNewsSlide(1), NEWS_SLIDE_INTERVAL_MS);
}

function renderNews(newsPayload) {
  if (!elements.newsSlide) {
    return;
  }

  const safeNews = newsPayload || buildNewsFallback();
  const items = Array.isArray(safeNews.items) && safeNews.items.length
    ? safeNews.items
    : buildNewsFallback().items;

  newsState.items = items.slice(0, 8);
  showNewsIndex(0);
  startNewsRotation();
}

function bindNewsControls() {
  elements.newsPrev?.addEventListener("click", () => {
    advanceNewsSlide(-1);
    startNewsRotation();
  });

  elements.newsNext?.addEventListener("click", () => {
    advanceNewsSlide(1);
    startNewsRotation();
  });
}

function showContentPage(index) {
  if (!elements.contentPages.length) {
    return;
  }

  contentPageState.index = (index + elements.contentPages.length) % elements.contentPages.length;

  elements.contentPages.forEach((panel, panelIndex) => {
    panel.classList.toggle("is-active", panelIndex === contentPageState.index);
  });
}

function startContentPageRotation() {
  if (contentPageState.timerId) {
    window.clearInterval(contentPageState.timerId);
    contentPageState.timerId = null;
  }

  if (elements.contentPages.length < 2) {
    return;
  }

  showContentPage(contentPageState.index);
  contentPageState.timerId = window.setInterval(() => {
    showContentPage(contentPageState.index + 1);
  }, CONTENT_PAGE_FLIP_INTERVAL_MS);
}

async function refreshTrafficSummary() {
  try {
    const response = await fetch(API_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Traffic API returned ${response.status}`);
    }

    const summary = await response.json();
    renderSummary(summary);
  } catch (error) {
    console.error("Unable to load traffic summary in browser:", error);
    renderSummary(buildBrowserFallback());
  }
}

async function refreshNews() {
  try {
    const response = await fetch(NEWS_API_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`News API returned ${response.status}`);
    }

    const news = await response.json();
    renderNews(news);
  } catch (error) {
    console.error("Unable to load BBC headlines:", error);
    renderNews(buildNewsFallback());
  }
}

async function refreshWeather() {
  try {
    const response = await fetch(WEATHER_API_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }

    const weather = await response.json();
    renderWeather(weather);
  } catch (error) {
    console.error("Unable to load BBC weather:", error);
    renderWeather(buildWeatherFallback());
  }
}

applyLocationBranding();
updateClock();
renderSummary(buildBrowserFallback());
renderNews(buildNewsFallback());
renderWeather(buildWeatherFallback());
refreshTrafficSummary();
refreshNews();
refreshWeather();
bindNewsControls();
startContentPageRotation();
void loadBrandLogo();
window.setInterval(updateClock, CLOCK_REFRESH_INTERVAL_MS);
window.setInterval(refreshTrafficSummary, REFRESH_INTERVAL_MS);
window.setInterval(refreshNews, NEWS_REFRESH_INTERVAL_MS);
window.setInterval(refreshWeather, WEATHER_REFRESH_INTERVAL_MS);
window.setTimeout(() => window.location.reload(), PAGE_RELOAD_INTERVAL_MS);
