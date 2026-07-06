const https = require("https");
let XMLParser = null;

try {
  XMLParser = require("fast-xml-parser").XMLParser;
} catch (error) {
  console.error("fast-xml-parser is unavailable; RSS parsing will use fallback payloads", error);
}

const UK_TIME_ZONE = "Europe/London";
const CACHE_TTL_MS = 5 * 60 * 1000;
const NEWS_CACHE_TTL_MS = 10 * 60 * 1000;
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const BBC_RSS_URL = "https://feeds.bbci.co.uk/news/rss.xml";
const DEFAULT_SITE = "sunbury";
const LOCATION_WEATHER_ID = {
  sunbury: "2636534",
  basingstoke: "2656192",
};
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
  basingstoke: {
    siteName: "Kinly Basingstoke",
    fallbackMessage: "Live traffic information is temporarily unavailable.",
    defaultItems: ["M3 Eastbound", "M3 Westbound", "Local Roads"],
  },
};

const summaryCache = new Map();
const newsCache = { cachedAt: 0, payload: null };
const weatherCache = new Map();

const rssParser = XMLParser
  ? new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true,
  })
  : null;

function requestText(url) {
  return new Promise(function (resolve, reject) {
    const req = https.get(url, {
      headers: {
        "user-agent": "KinlySignageContentApp/1.0",
        accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
      },
    }, function (res) {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", function (chunk) { data += chunk; });
      res.on("end", function () {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error("Request failed with status " + res.statusCode + " for " + url));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(20000, function () {
      req.destroy(new Error("Request timeout for " + url));
    });
  });
}

function normaliseSite(site) {
  if (typeof site !== "string") {
    return "";
  }

  return site.trim().toLowerCase();
}

function normaliseLocation(site) {
  const normalised = normaliseSite(site);
  return LOCATION_WEATHER_ID[normalised] ? normalised : DEFAULT_SITE;
}

function getWeatherUrls(site) {
  const location = normaliseLocation(site);
  const weatherId = LOCATION_WEATHER_ID[location];

  return {
    location: location,
    forecastUrl: "https://weather-broker-cdn.api.bbci.co.uk/en/forecast/rss/3day/" + weatherId,
    observationUrl: "https://weather-broker-cdn.api.bbci.co.uk/en/observation/rss/" + weatherId,
  };
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

  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function truncateText(text, maxLength) {
  if (typeof text !== "string" || text.length <= maxLength) {
    return text;
  }

  return text.slice(0, Math.max(0, maxLength - 1)).trimEnd() + "...";
}

function resolveNewsImageUrl(item) {
  const thumbnails = asArray(item && item["media:thumbnail"]);
  for (let i = 0; i < thumbnails.length; i += 1) {
    const url = thumbnails[i] && thumbnails[i]["@_url"];
    if (typeof url === "string" && url.trim()) {
      return url.trim();
    }
  }

  const media = asArray(item && item["media:content"]);
  for (let j = 0; j < media.length; j += 1) {
    const mediaUrl = media[j] && media[j]["@_url"];
    if (typeof mediaUrl === "string" && mediaUrl.trim()) {
      return mediaUrl.trim();
    }
  }

  const enclosures = asArray(item && item.enclosure);
  for (let k = 0; k < enclosures.length; k += 1) {
    const entry = enclosures[k];
    const type = entry && entry["@_type"];
    const enclosureUrl = entry && entry["@_url"];
    if (typeof type === "string" && type.indexOf("image/") === 0 && typeof enclosureUrl === "string" && enclosureUrl.trim()) {
      return enclosureUrl.trim();
    }
  }

  return "";
}

function buildNewsFallbackPayload(limit) {
  const fallbackItems = [
    {
      title: "BBC headlines are temporarily unavailable",
      summary: "Latest news headlines could not be loaded right now.",
      link: "https://www.bbc.co.uk/news",
      publishedAt: new Date().toISOString(),
      source: "BBC News",
      imageUrl: "",
    },
    {
      title: "Please check back shortly",
      summary: "The feed will refresh automatically when service is restored.",
      link: "https://www.bbc.co.uk/news",
      publishedAt: new Date().toISOString(),
      source: "BBC News",
      imageUrl: "",
    },
  ];

  return {
    source: "BBC News",
    feedUrl: BBC_RSS_URL,
    lastUpdated: getCurrentUkTimestamp(),
    items: fallbackItems.slice(0, limit || 3),
  };
}

function buildWeatherFallbackPayload(site) {
  const urls = getWeatherUrls(site);
  const siteConfig = SITE_CONFIG[urls.location] || SITE_CONFIG[DEFAULT_SITE];

  return {
    source: "BBC Weather",
    location: siteConfig.siteName.replace(/^Kinly\s+/u, ""),
    condition: "Weather data unavailable",
    temperatureC: null,
    highC: null,
    lowC: null,
    lastUpdated: getCurrentUkTimestamp(),
    feedUrl: urls.forecastUrl,
  };
}

function extractFirstCelsiusValue(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/(-?\d+)\s*\u00B0C/u);
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractLabelledCelsiusValue(value, label) {
  if (typeof value !== "string") {
    return null;
  }

  const pattern = new RegExp(label + ":\\s*(-?\\d+)\\s*\\u00B0C", "iu");
  const match = value.match(pattern);
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractConditionFromForecastTitle(title) {
  if (typeof title !== "string") {
    return "Weather update";
  }

  const match = title.match(/^[^:]+:\s*([^,]+),/u);
  if (match && match[1]) {
    return match[1].trim();
  }

  return "Weather update";
}

function extractObservationDetails(title) {
  if (typeof title !== "string") {
    return { condition: "", temperatureC: null };
  }

  const fullMatch = title.match(/:\s*([^,]+),\s*(-?\d+)\s*\u00B0C/u);
  if (!fullMatch) {
    return {
      condition: "",
      temperatureC: extractFirstCelsiusValue(title),
    };
  }

  const rawCondition = String(fullMatch[1]).trim();
  const temperatureC = Number.parseInt(fullMatch[2], 10);
  const colonIndex = rawCondition.lastIndexOf(":");
  const condition = colonIndex >= 0 ? rawCondition.slice(colonIndex + 1).trim() : rawCondition;

  return {
    condition: condition,
    temperatureC: temperatureC,
  };
}

async function getBbcWeather(site) {
  const resolvedSite = normaliseLocation(site);
  const urls = getWeatherUrls(resolvedSite);
  const now = Date.now();
  const cachedEntry = weatherCache.get(resolvedSite);
  if (cachedEntry && now - cachedEntry.cachedAt < WEATHER_CACHE_TTL_MS) {
    return cachedEntry.payload;
  }

  if (!rssParser) {
    const fallbackNoParser = buildWeatherFallbackPayload(resolvedSite);
    weatherCache.set(resolvedSite, {
      cachedAt: now,
      payload: fallbackNoParser,
    });
    return fallbackNoParser;
  }

  try {
    const values = await Promise.all([
      requestText(urls.forecastUrl),
      requestText(urls.observationUrl),
    ]);

    const forecastXml = values[0];
    const observationXml = values[1];

    const forecastParsed = rssParser.parse(forecastXml);
    const observationParsed = rssParser.parse(observationXml);

    const forecastChannel = forecastParsed && forecastParsed.rss && forecastParsed.rss.channel;
    const observationChannel = observationParsed && observationParsed.rss && observationParsed.rss.channel;

    const forecastItems = asArray(forecastChannel && forecastChannel.item);
    const todayForecast = forecastItems[0] || {};

    const observationItem = asArray(observationChannel && observationChannel.item)[0] || {};

    const forecastTitle = String(todayForecast.title || "").trim();
    const forecastDescription = String(todayForecast.description || "").trim();
    const observationTitle = String(observationItem.title || "").trim();

    const details = extractObservationDetails(observationTitle);
    const highC = extractLabelledCelsiusValue(forecastTitle, "Maximum Temperature")
      || extractLabelledCelsiusValue(forecastDescription, "Maximum Temperature");
    const lowC = extractLabelledCelsiusValue(forecastTitle, "Minimum Temperature")
      || extractLabelledCelsiusValue(forecastDescription, "Minimum Temperature");

    const locationTitle = String((forecastChannel && forecastChannel.title) || "");
    const locationMatch = locationTitle.match(/Forecast for\s+(.+?),\s*GB/iu);
    const location = locationMatch && locationMatch[1] ? locationMatch[1].trim() : "Sunbury";

    const payload = {
      source: "BBC Weather",
      location: location,
      condition: details.condition || extractConditionFromForecastTitle(forecastTitle),
      temperatureC: details.temperatureC,
      highC: highC,
      lowC: lowC,
      lastUpdated: getCurrentUkTimestamp(),
      feedUrl: urls.forecastUrl,
    };

    weatherCache.set(resolvedSite, {
      cachedAt: now,
      payload: payload,
    });
    return payload;
  } catch (error) {
    console.error("Unable to fetch BBC weather feed:", error);
    const fallback = buildWeatherFallbackPayload(resolvedSite);
    weatherCache.set(resolvedSite, {
      cachedAt: now,
      payload: fallback,
    });
    return fallback;
  }
}

async function getBbcNews(limit) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 8) : 3;
  const now = Date.now();

  if (newsCache.payload && now - newsCache.cachedAt < NEWS_CACHE_TTL_MS) {
    return {
      source: newsCache.payload.source,
      feedUrl: newsCache.payload.feedUrl,
      lastUpdated: newsCache.payload.lastUpdated,
      items: newsCache.payload.items.slice(0, safeLimit),
    };
  }

  if (!rssParser) {
    const fallbackNoParser = buildNewsFallbackPayload(safeLimit);
    newsCache.cachedAt = now;
    newsCache.payload = fallbackNoParser;
    return fallbackNoParser;
  }

  try {
    const xml = await requestText(BBC_RSS_URL);
    const parsed = rssParser.parse(xml);
    const channel = parsed && parsed.rss && parsed.rss.channel;
    const rawItems = asArray(channel && channel.item);

    const items = rawItems
      .map(function (item) {
        const summarySource =
          stripHtml(item && item.description) ||
          stripHtml(item && item.summary) ||
          "Read the full story on BBC News.";

        return {
          title: String((item && item.title) || "BBC headline").trim(),
          summary: truncateText(summarySource, 160),
          link: String((item && item.link) || "https://www.bbc.co.uk/news").trim(),
          publishedAt: String((item && item.pubDate) || new Date().toISOString()).trim(),
          source: "BBC News",
          imageUrl: resolveNewsImageUrl(item),
        };
      })
      .filter(function (item) { return item.title; })
      .slice(0, 8);

    const payload = {
      source: "BBC News",
      feedUrl: BBC_RSS_URL,
      lastUpdated: getCurrentUkTimestamp(),
      items: items.length ? items : buildNewsFallbackPayload(safeLimit).items,
    };

    newsCache.cachedAt = now;
    newsCache.payload = payload;

    return {
      source: payload.source,
      feedUrl: payload.feedUrl,
      lastUpdated: payload.lastUpdated,
      items: payload.items.slice(0, safeLimit),
    };
  } catch (error) {
    console.error("Unable to fetch BBC RSS feed:", error);
    const fallback = buildNewsFallbackPayload(safeLimit);
    newsCache.cachedAt = now;
    newsCache.payload = fallback;
    return fallback;
  }
}

function getCurrentUkTimestamp(date) {
  const value = date || new Date();
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  const values = {};
  for (let i = 0; i < dateParts.length; i += 1) {
    const part = dateParts[i];
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const zoneParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    timeZoneName: "longOffset",
  }).formatToParts(value);

  let zonePart = "";
  for (let j = 0; j < zoneParts.length; j += 1) {
    if (zoneParts[j].type === "timeZoneName") {
      zonePart = zoneParts[j].value;
      break;
    }
  }

  return values.year + "-" + values.month + "-" + values.day + "T" + values.hour + ":" + values.minute + ":" + values.second + formatOffset(zonePart);
}

function formatOffset(zonePart) {
  if (!zonePart || zonePart === "GMT" || zonePart === "UTC") {
    return "+00:00";
  }

  const match = zonePart.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/u);
  if (!match) {
    return "+00:00";
  }

  const sign = match[1];
  const hours = match[2];
  const minutes = match[3] || "00";
  return sign + hours.padStart(2, "0") + ":" + minutes;
}

function calculateOverallStatus(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "Grey";
  }

  let highestPriority = -1;
  let highestStatus = "Grey";

  for (let i = 0; i < items.length; i += 1) {
    const status = normaliseStatus(items[i] && items[i].status);
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
      throw new Error("Unsupported site requested: " + normalisedSite);
    }

    const values = await Promise.all([
      getNationalHighwaysItems(normalisedSite),
      getStreetManagerItems(normalisedSite),
    ]);

    const items = values[0].concat(values[1]);
    const overallStatus = calculateOverallStatus(items);
    const payload = {
      siteName: siteConfig.siteName,
      headline: buildHeadline(overallStatus),
      overallStatus: overallStatus,
      lastUpdated: getCurrentUkTimestamp(),
      items: items,
      disclaimer: "Traffic information may change quickly. Please check your route before travelling.",
    };

    summaryCache.set(normalisedSite, {
      cachedAt: now,
      payload: payload,
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
  if (site === "sunbury") {
    return [
      {
        label: "M3 Eastbound",
        status: "Amber",
        summary: "Delays reported around Sunbury Cross on the approach towards London.",
        source: "National Highways",
      },
      {
        label: "M3 Westbound",
        status: "Green",
        summary: "No major incidents currently reported towards Staines and the M25 link roads.",
        source: "National Highways",
      },
    ];
  }

  if (site === "basingstoke") {
    return [
      {
        label: "M3 Eastbound",
        status: "Green",
        summary: "Traffic is currently flowing well eastbound towards Hook and Fleet.",
        source: "National Highways",
      },
      {
        label: "M3 Westbound",
        status: "Amber",
        summary: "Minor delays reported westbound around peak times near Junction 7.",
        source: "National Highways",
      },
    ];
  }

  return [];
}

async function getStreetManagerItems(site) {
  if (site === "sunbury") {
    return [
      {
        label: "Local Roads",
        status: "Amber",
        summary: "Roadworks active near the office. Please check your route before leaving.",
        source: "DfT Street Manager",
      },
    ];
  }

  if (site === "basingstoke") {
    return [
      {
        label: "Local Roads",
        status: "Amber",
        summary: "Planned works may cause short delays on local town routes.",
        source: "DfT Street Manager",
      },
    ];
  }

    return [];
  }

function buildFallbackSummary(site) {
  const siteConfig = SITE_CONFIG[site] || SITE_CONFIG[DEFAULT_SITE];
  const items = siteConfig.defaultItems.map(function (label) {
    return {
      label: label,
      status: "Grey",
      summary: "Live traffic information is temporarily unavailable. Please check your route before travelling.",
      source: label === "Local Roads" ? "DfT Street Manager" : "National Highways",
    };
  });

  return {
    siteName: siteConfig.siteName,
    headline: siteConfig.fallbackMessage,
    overallStatus: "Grey",
    lastUpdated: getCurrentUkTimestamp(),
    items: items,
    disclaimer: "Traffic information may change quickly. Please check your route before travelling.",
  };
}

function normaliseStatus(status) {
  if (typeof status !== "string") {
    return "Grey";
  }

  const trimmed = status.trim();
  if (Object.prototype.hasOwnProperty.call(STATUS_PRIORITY, trimmed)) {
    return trimmed;
  }

  return "Grey";
}

module.exports = {
  getTrafficSummary: getTrafficSummary,
  getBbcNews: getBbcNews,
  getBbcWeather: getBbcWeather,
};