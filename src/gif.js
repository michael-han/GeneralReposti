/**
 * wrapper around giphy api
 */

const Giphy = require('@giphy/js-fetch-api');
const giphy = new Giphy.GiphyFetch(process.env.GIPHY);
const fetch = require('node-fetch');

if (!globalThis.fetch) {
    globalThis.fetch = fetch;
}

async function getGiphyUrl(searchTerm) {
    const { data: gifs } = await giphy.search(searchTerm, {
        type: "gifs",
        sort: "relevant",
        limit: 25
    });
    return gifs[Math.floor(Math.random() * 25)].images.downsized.url;
}

module.exports = {
    getGiphyUrl
};
