module.exports = async function (context) {
  try {
    const api = require("../lib/data");
    const payload = await api.getBbcWeather();

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
      location: "Sunbury",
      condition: "Weather data unavailable",
      temperatureC: null,
      highC: null,
      lowC: null,
      lastUpdated: new Date().toISOString(),
    },
  };
};
