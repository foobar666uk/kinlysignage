const { getBbcWeather } = require("../lib/data");

module.exports = async function (context) {
  const payload = await getBbcWeather();

  context.res = {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: payload,
  };
};
