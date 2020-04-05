const fetch = require("node-fetch");
const baseUrl = "https://api.pandascore.co";
const accessToken = process.env.AccessToken;

const getUpcomingMatches = async (idOrSlug) => {
    try {
        const response = await fetch(`${baseUrl}/leagues/${idOrSlug}/matches/upcoming`, {
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });
        const json = await response.json();
        return json;
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    getUpcomingMatches
}