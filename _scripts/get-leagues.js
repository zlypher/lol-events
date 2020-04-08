require("dotenv").config();
const { getLeagues } = require("../lib/pandascore");

main();

async function main() {
  const leagues = (await getLeagues()).map((l) => ({
    name: l.name,
    image_url: l.image_url,
    url: l.url,
  }));

  console.log(renderLeages(leagues));
}

function renderLeages(leagues) {
  return leagues.map(renderSingleLeague).join("\n");
}

function renderSingleLeague(league) {
  return `<a href="${league.url}" target="_blank"><img src="${league.image_url}" alt="${league.name} Logo" width="100" height="100" /></a>`;
}
