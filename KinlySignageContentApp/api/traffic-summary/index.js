module.exports = async function (context, req) {
  const site = req && req.query && req.query.site ? String(req.query.site) : "sunbury";

  try {
    const api = require("../lib/data");
    const payload = await api.getTrafficSummary(site);

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
    context.log.error("traffic-summary function failed, returning fallback payload", error);
  }

  context.res = {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: {
      siteName: "Kinly Sunbury",
      headline: "Live traffic information is temporarily unavailable",
      overallStatus: "Grey",
      lastUpdated: new Date().toISOString(),
      items: [
        {
          label: "M3 Eastbound",
          status: "Grey",
          summary: "Live traffic data is currently unavailable.",
        },
        {
          label: "M3 Westbound",
          status: "Grey",
          summary: "Live traffic data is currently unavailable.",
        },
        {
          label: "Local Roads",
          status: "Grey",
          summary: "Live traffic data is currently unavailable.",
        },
      ],
      disclaimer: "Traffic information may change quickly. Please check your route before travelling.",
    },
  };
};
