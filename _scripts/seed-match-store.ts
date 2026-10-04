import {
    saveMatchStore,
    seedMatchStoreFromCalendars,
} from "../lib/match-store";

function main(): void {
    const calDir = "./docs/cal";
    const leaguesPath = "./docs/leagues.json";
    console.log(`Seeding match store from ${calDir}...`);
    const store = seedMatchStoreFromCalendars(calDir, leaguesPath);
    const count = Object.keys(store.matches).length;
    saveMatchStore(store);
    console.log(`Seeded ${count} matches into match store successfully.`);
}

main();
