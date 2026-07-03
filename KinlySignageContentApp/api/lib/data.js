const { XMLParser } = require("fast-xml-parser");

const UK_TIME_ZONE = "Europe/London";
const CACHE_TTL_MS = 5 * 60 * 1000;
const NEWS_CACHE_TTL_MS = 10 * 60 * 1000;
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const BBC_RSS_URL = "https://feeds.bbci.co.uk/news/rss.xml";
const BBC_WEATHER_LOCATION_ID = "2636534";
const BBC_WEATHER_FORECAST_URL = `https://weather-broker-cdn.api.bbci.co.uk/en/forecast/rss/3day/${BBC_WEATHER_LOCATION_ID}`;
const BBC_WEATHER_OBSERVATION_URL = `https://weather-broker-cdn.api.bbci.co.uk/en/observation/rss/${BBC_WEATHER_LOCATION_ID}`;
const DEFAULT_SITE = "sunbury";
const STATUS_PRIORITY = {
  Grey: 0,
  Green: 1,
  Amber: 2,
  Red: 3,
};
const SITE_CONFIG = {
  sunbury: {
    siteName: "Kinly Sunbury",
    fallbackMessage: "Live traffic information is temporarily unavailable.",
    defaultItems: ["M3 Eastbound", "M3 Westbound", "Local Roads"],
  },
};

const summaryCache = new Map();
const newsCache = {
  cachedAt: 0,
  payload: null,
};
const weatherCache = {
  cachedAt: 0,
  payload: null,
};

const rssParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
});

function normaliseSite(site) {
  if (typeof site !== "string") {
    return "";
  }

  return site.trim().toLowerCase();
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function stripHtml(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/<[^>]*>/gu, "").replace(/\s+/gu, " ").trim();
}

function truncateText(text, maxLength) {
  if (typeof text !== "string" || text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function resolveNewsImageUrl(item) {
  const mediaThumbnail = asArray(item?.["media:thumbnail"])
    .map((entry) => entry?.["@_url"])
    .find((value) => typeof value === "string" && value.trim());

  if (mediaThumbnail) {
    return String(mediaThumbnail).trim();
  }

  const mediaContent = asArray(item?.["media:content"])
    .map((entry) => entry?.["@_url"])
    .find((value) => typeof value === "string" && value.trim());

  if (mediaContent) {
    return String(mediaContent).trim();
  }

  const enclosureImage = asArray(item?.enclosure)
    .find((entry) => typeof entry?.["@_type"] === "string" && entry["@_type"].startsWith("image/"))
    ?.["@_url"];

  if (typeof enclosureImage === "string" && enclosureImage.trim()) {
    return enclosureImage.trim();
  }

  return "";
}

function buildNewsFallbackPayload(limit = 3) {
  const fallbackItems = [
    {
      title: "BBC headlines are temporarily unavailable",
      summary: "Latest news headlines could not be loaded right now.",
      link: "https://www.bbc.co.uk/news",
      publishedAt: new Date().toISOString(),
      source: "BBC News",
    },
    {
      title: "Please check back shortly",
      summary: "The feed will refresh automatically when service is restored.",
      link: "https://www.bbc.co.uk/news",
      publishedAt: new Date().toISOString(),
      source: "BBC News",
    },
  ];

  return {
    source: "BBC News",
    feedUrl: BBC_RSS_URL,
    lastUpdated: getCurrentUkTimestamp(),
    items: fallbackItems.slice(0, limit),
  };
}

function buildWeatherFallbackPayload() {
  return {
    source: "BBC Weather",
    location: "Sunbury",
    condition: "Weather data unavailable",
    temperatureC: null,
    highC: null,
    lowC: null,
    lastUpdated: getCurrentUkTimestamp(),
    feedUrl: BBC_WEATHER_FORECAST_URL,
  };
}

function extractFirstCelsiusValue(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/(-?\d+)\s*°C/u);
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractLabelledCelsiusValue(value, label) {
  if (typeof value !== "string") {
    return null;
  }

  const pattern = new RegExp(`${label}:\\s*(-?\\d+)\\s*°C`, "iu");
  const match = value.match(pattern);
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractConditionFromForecastTitle(title) {
  if (typeof title !== "string") {
    return "Weather update";
  }

  const match = title.match(/^[^:]+:\s*([^,]+),/u);
  if (match?.[1]) {
    return match[1].trim();
  }

  return "Weather update";
}

function extractObservationDetails(title) {
  if (typeof title !== "string") {
    return {
      condition: "",
      temperatureC: null,
    };
  }

  const fullMatch = title.match(/:\s*([^,]+),\s*(-?\d+)\s*°C/u);
  if (!fullMatch) {
    return {
      condition: "",
      temperatureC: extractFirstCelsiusValue(title),
    };
  }

  const rawCondition = String(fullMatch[1]).trim();
  const temperatureC = Number.parseInt(fullMatch[2], 10);
  const condition = rawCondition.includes(":")
    ? rawCondition.slice(rawCondition.lastIndexOf(":") + 1).trim()
    : rawCondition;

  return {
    condition,
    temperatureC,
  };
}

async function getBbcWeather() {
  const now = Date.now();
  if (weatherCache.payload && now - weatherCache.cachedAt < WEATHER_CACHE_TTL_MS) {
    return weatherCache.payload;
  }

  try {
    const [forecastResponse, observationResponse] = await Promise.all([
      fetch(BBC_WEATHER_FORECAST_URL, {
        headers: {
          "user-agent": "KinlySignageContentApp/1.0",
          accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
        },
      }),
      fetch(BBC_WEATHER_OBSERVATION_URL, {
        headers: {
          "user-agent": "KinlySignageContentApp/1.0",
          accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
        },
      }),
    ]);

    if (!forecastResponse.ok) {
      throw new Error(`BBC weather forecast responded with status ${forecastResponse.status}`);
    }

    if (!observationResponse.ok) {
      throw new Error(`BBC weather observation responded with status ${observationResponse.status}`);
    }

    const forecastXml = await forecastResponse.text();
    const observationXml = await observationResponse.text();

    const forecastParsed = rssParser.parse(forecastXml);
    const observationParsed = rssParser.parse(observationXml);

    const forecastItems = asArray(forecastParsed?.rss?.channel?.item);
    const todayForecast = forecastItems[0] || {};

    const observationItem = asArray(observationParsed?.rss?.channel?.item)[0] || {};

    const forecastTitle = String(todayForecast?.title || "").trim();
    const forecastDescription = String(todayForecast?.description || "").trim();
    const observationTitle = String(observationItem?.title || "").trim();

    const { condition: observedCondition, temperatureC } = extractObservationDetails(observationTitle);
    const highC = extractLabelledCelsiusValue(forecastTitle, "Maximum Temperature")
      ?? extractLabelledCelsiusValue(forecastDescription, "Maximum Temperature");
    const lowC = extractLabelledCelsiusValue(forecastTitle, "Minimum Temperature")
      ?? extractLabelledCelsiusValue(forecastDescription, "Minimum Temperature");

    const locationTitle = String(forecastParsed?.rss?.channel?.title || "");
    const locationMatch = locationTitle.match(/Forecast for\s+(.+?),\s*GB/iu);
    const location = locationMatch?.[1]?.trim() || "Sunbury";

    const payload = {
      source: "BBC Weather",
      location,
      condition: observedCondition || extractConditionFromForecastTitle(forecastTitle),
      temperatureC,
      highC,
      lowC,
      lastUpdated: getCurrentUkTimestamp(),
      feedUrl: BBC_WEATHER_FORECAST_URL,
    };

    weatherCache.cachedAt = now;
    weatherCache.payload = payload;
    return payload;
  } catch (error) {
    console.error("Unable to fetch BBC weather feed:", error);
    const fallback = buildWeatherFallbackPayload();
    weatherCache.cachedAt = now;
    weatherCache.payload = fallback;
    return fallback;
  }
}

async function getBbcNews(limit = 3) {
  const now = Date.now();
  if (newsCache.payload && now - newsCache.cachedAt < NEWS_CACHE_TTL_MS) {
    return {
      ...newsCache.payload,
      items: newsCache.payload.items.slice(0, limit),
    };
  }

  try {
    const response = await fetch(BBC_RSS_URL, {
      headers: {
        "user-agent": "KinlySignageContentApp/1.0",
        accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`BBC RSS responded with status ${response.status}`);
    }

    const xml = await response.text();
    const parsed = rssParser.parse(xml);
    const rawItems = asArray(parsed?.rss?.channel?.item);

    const items = rawItems
      .map((item) => {
        const summarySource =
          stripHtml(item?.description) ||
          stripHtml(item?.summary) ||
          "Read the full story on BBC News.";

        return {
          title: String(item?.title || "BBC headline").trim(),
          summary: truncateText(summarySource, 160),
          link: String(item?.link || "https://www.bbc.co.uk/news").trim(),
          publishedAt: String(item?.pubDate || new Date().toISOString()).trim(),
          source: "BBC News",
          imageUrl: resolveNewsImageUrl(item),
        };
      })
      .filter((item) => item.title)
      .slice(0, 8);

    const payload = {
      source: "BBC News",
      feedUrl: BBC_RSS_URL,
      lastUpdated: getCurrentUkTimestamp(),
      items: items.length ? items : buildNewsFallbackPayload(limit).items,
    };

    newsCache.cachedAt = now;
    newsCache.payload = payload;

    return {
      ...payload,
      items: payload.items.slice(0, limit),
    };
  } catch (error) {
    console.error("Unable to fetch BBC RSS feed:", error);
    const fallback = buildNewsFallbackPayload(limit);
    newsCache.cachedAt = now;
    newsCache.payload = fallback;
    return fallback;
  }
}

function getCurrentUkTimestamp(date = new Date()) {
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = {};
  for (const part of dateParts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const zonePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}${formatOffset(zonePart)}`;
}

function formatOffset(zonePart) {
  if (!zonePart || zonePart === "GMT" || zonePart === "UTC") {
    return "+00:00";
  }

  const match = zonePart.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/u);
  if (!match) {
    return "+00:00";
  }

  const [, sign, hours, minutes = "00"] = match;
  return `${sign}${hours.padStart(2, "0")}:${minutes}`;
}

function calculateOverallStatus(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "Grey";
  }

  let highestPriority = -1;
  let highestStatus = "Grey";

  for (const item of items) {
    const status = normaliseStatus(item?.status);
    const priority = STATUS_PRIORITY[status];

    if (priority > highestPriority) {
      highestPriority = priority;
      highestStatus = status;
    }
  }

  return highestStatus;
}

function buildHeadline(overallStatus) {
  switch (normaliseStatus(overallStatus)) {
    case "Green":
      return "Routes near the office are currently clear";
    case "Amber":
      return "Minor delays reported near the office";
    case "Red":
      return "Severe disruption reported near the office";
    default:
      return "Live traffic information is temporarily unavailable";
  }
}

async function getTrafficSummary(site) {
  const normalisedSite = normaliseSite(site) || DEFAULT_SITE;
  const now = Date.now();
  const cachedEntry = summaryCache.get(normalisedSite);

  if (cachedEntry && now - cachedEntry.cachedAt < CACHE_TTL_MS) {
    return cachedEntry.payload;
  }

  try {
    const siteConfig = SITE_CONFIG[normalisedSite];

    if (!siteConfig) {
      throw new Error(`Unsupported site requested: ${normalisedSite}`);
    }

    const [nationalHighwaysItems, streetManagerItems] = await Promise.all([
      getNationalHighwaysItems(normalisedSite),
      getStreetManagerItems(normalisedSite),
    ]);

    const items = [...nationalHighwaysItems, ...streetManagerItems];
    const overallStatus = calculateOverallStatus(items);
    const payload = {
      siteName: siteConfig.siteName,
      headline: buildHeadline(overallStatus),
      overallStatus,
      lastUpdated: getCurrentUkTimestamp(),
      items,
      disclaimer:
        "Traffic information may change quickly. Please check your route before travelling.",
    };

    summaryCache.set(normalisedSite, {
      cachedAt: now,
      payload,
    });

    return payload;
  } catch (error) {
    console.error("Unable to build traffic summary:", error);

    const fallbackPayload = buildFallbackSummary(normalisedSite);
    summaryCache.set(normalisedSite, {
      cachedAt: now,
      payload: fallbackPayload,
    });

    return fallbackPayload;
  }
}

async function getNationalHighwaysItems(site) {
  if (site !== "sunbury") {
    return [];
  }

  return [
    {
      label: "M3 Eastbound",
      status: "Amber",
      summary:
        "Delays reported around Sunbury Cross on the approach towards London.",
      source: "National Highways",
    },
    {
      label: "M3 Westbound",
      status: "Green",
      summary:
        "No major incidents currently reported towards Staines and the M25 link roads.",
      source: "National Highways",
    },
  ];
}

async function getStreetManagerItems(site) {
  if (site !== "sunbury") {
    return [];
  }

  return [
    {
      label: "Local Roads",
      status: "Amber",
      summary:
        "Roadworks active near the office. Please check your route before leaving.",
      source: "DfT Street Manager",
    },
  ];
}

function buildFallbackSummary(site) {
  const siteConfig = SITE_CONFIG[site] || SITE_CONFIG[DEFAULT_SITE];
  const items = siteConfig.defaultItems.map((label) => ({
    label,
    status: "Grey",
    summary:
      "Live traffic information is temporarily unavailable. Please check your route before travelling.",
    source: label === "Local Roads" ? "DfT Street Manager" : "National Highways",
  }));

  return {
    siteName: siteConfig.siteName,
    headline: siteConfig.fallbackMessage,
    overallStatus: "Grey",
    lastUpdated: getCurrentUkTimestamp(),
    items,
    disclaimer:
      "Traffic information may change quickly. Please check your route before travelling.",
  };
}

function normaliseStatus(status) {
  if (typeof status !== "string") {
    return "Grey";
  }

  const trimmed = status.trim();
  if (trimmed in STATUS_PRIORITY) {
    return trimmed;
  }

  return "Grey";
}

module.exports = {
  getTrafficSummary,
  getBbcNews,
  getBbcWeather,
};
