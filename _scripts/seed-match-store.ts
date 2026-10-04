import {
    DEFAULT_MATCH_STORE_PATH,
    saveMatchStore,
    seedMatchStoreFromCalendars,
} from "../lib/match-store";

function main(): void {
    const calDir = "./docs/cal";
    console.log(`Seeding match store from ${calDir}...`);
    const store = seedMatchStoreFromCalendars(calDir);
    const count = Object.keys(store.matches).length;
    saveMatchStore(store, DEFAULT_MATCH_STORE_PATH);
    console.log(
        `Seeded ${count} matches into ${DEFAULT_MATCH_STORE_PATH} successfully.`,
    );
}

main();
