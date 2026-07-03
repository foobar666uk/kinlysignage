const { getTrafficSummary } = require("../lib/data");

module.exports = async function (context, req) {
  const site = String(req?.query?.site || "sunbury");
  const payload = await getTrafficSummary(site);

  context.res = {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: payload,
  };
};
