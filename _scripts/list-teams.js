require("dotenv").config();
const { getTeams } = require("../lib/pandascore");

main();

async function main() {
    const options = {
        page: 1,
        per_page: 100,
    };

    const teams = (await getTeams(options)).map((l) => {
        return { id: l.id, name: l.name };
    });
    console.log(teams);
}
