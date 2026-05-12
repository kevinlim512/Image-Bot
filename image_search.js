require('dotenv').config();
const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');

const args = process.argv.slice(2);
const queryArg = args[0];

'use strict';

class SearchResult {
    constructor(resultArray) {
        this.resultArray = resultArray;
        this.currentResult = 0;
    }

    currentSearch() {
        return this.resultArray[this.currentResult];
    }

    nextSearch() {
        this.currentResult = (this.currentResult + 1) % this.resultArray.length;
        return this.currentSearch();
    }

    prevSearch() {
        this.currentResult = (this.currentResult - 1 + this.resultArray.length) % this.resultArray.length;
        return this.currentSearch();
    }
}

function braveRequest(path, params) {
    return new Promise((resolve, reject) => {
        const url = new URL(`https://api.search.brave.com${path}`);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });

        const req = https.request(
            {
                hostname: url.hostname,
                path: `${url.pathname}${url.search}`,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip',
                    'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY,
                },
            },
            (res) => {
                const chunks = [];

                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const encoding = res.headers['content-encoding'];

                    try {
                        let data;

                        if (encoding === 'gzip') {
                            data = zlib.gunzipSync(buffer).toString('utf8');
                        } else if (encoding === 'br') {
                            data = zlib.brotliDecompressSync(buffer).toString('utf8');
                        } else if (encoding === 'deflate') {
                            data = zlib.inflateSync(buffer).toString('utf8');
                        } else {
                            data = buffer.toString('utf8');
                        }

                        const parsed = data ? JSON.parse(data) : {};

                        if (res.statusCode < 200 || res.statusCode >= 300) {
                            const apiError = parsed.error && (parsed.error.detail || parsed.error.msg || parsed.error.message);
                            reject(new Error(apiError || `Brave request failed with status ${res.statusCode}`));
                            return;
                        }

                        resolve(parsed);
                    } catch (error) {
                        reject(error);
                    }
                });
            }
        );

        req.on('error', reject);
        req.end();
    });
}

function deriveDisplayDomain(sourceLink) {
    if (!sourceLink) {
        return 'Unknown source';
    }

    try {
        return new URL(sourceLink).hostname;
    } catch (error) {
        return sourceLink;
    }
}

function normalizeImageResult(result) {
    const sourceLink = result.url || result.page_url;
    const publisher = result.meta_url;
    const displayDomain = publisher && (publisher.hostname || publisher.netloc || publisher.display_url);
    const thumbnailUrl = typeof result.thumbnail === 'string' ? result.thumbnail : result.thumbnail && result.thumbnail.src;
    const originalImageUrl = result.properties && result.properties.url;

    return {
        title: result.title || result.source || result.description || 'Image result',
        imageUrl: thumbnailUrl || originalImageUrl,
        sourceLink,
        displayDomain: displayDomain || deriveDisplayDomain(sourceLink),
    };
}

async function search(query) {
    if (!process.env.BRAVE_SEARCH_API_KEY) {
        throw new Error('Missing BRAVE_SEARCH_API_KEY');
    }

    const res = await braveRequest('/res/v1/images/search', {
        q: query,
        count: 10,
        country: 'US',
        search_lang: 'en',
        spellcheck: true,
        safesearch: 'off',
    });

    const images = (res.results || [])
        .map(normalizeImageResult)
        .filter((result) => result.imageUrl && result.sourceLink);

    if (images.length === 0) {
        throw new Error(`No image results found for "${query}"`);
    }

    return new SearchResult(images);
}

if (module === require.main) {
    search(queryArg)
        .then((result) => console.log(result.currentSearch()))
        .catch(console.error);
}

module.exports = {
    search,
};
