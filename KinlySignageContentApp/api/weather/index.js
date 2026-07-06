module.exports = async function (context, req) {
  const location = req && req.query && req.query.location ? String(req.query.location) : "sunbury";
  const fallbackLocation = String(location).trim().toLowerCase() === "basingstoke"
    ? "Basingstoke"
    : "Sunbury";

  try {
    const api = require("../lib/data");
    const payload = await api.getBbcWeather(location);

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
    context.log.error("weather function failed, returning fallback payload", error);
  }

  context.res = {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: {
      source: "BBC Weather",
      location: fallbackLocation,
      condition: "Weather data unavailable",
      temperatureC: null,
      highC: null,
      lowC: null,
      lastUpdated: new Date().toISOString(),
    },
  };
};
