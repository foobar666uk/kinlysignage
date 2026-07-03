const { getBbcNews } = require("../lib/data");

module.exports = async function (context, req) {
  const requestedLimit = Number.parseInt(String(req?.query?.limit || "3"), 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 8)
    : 3;

  const payload = await getBbcNews(limit);

  context.res = {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: payload,
  };
};
