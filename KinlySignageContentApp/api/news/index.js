module.exports = async function (context, req) {
  const requestedLimit = Number.parseInt(String(req && req.query && req.query.limit ? req.query.limit : "3"), 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 8)
    : 3;

  try {
    const api = require("../lib/data");
    const payload = await api.getBbcNews(limit);

    context.res = {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
      body: payload,
    };
    return;
  } catch (error) {
    context.log.error("news function failed, returning fallback payload", error);
  }

  context.res = {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: {
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
      ].slice(0, limit),
    },
  };
};
