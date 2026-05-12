require('dotenv').config();
const https = require('https');

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

function serperRequest(path, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const req = https.request(
            {
                hostname: 'google.serper.dev',
                path,
                method: 'POST',
                headers: {
                    'X-API-KEY': process.env.SERPER_API_KEY,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                },
            },
            (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);

                        if (res.statusCode < 200 || res.statusCode >= 300) {
                            reject(new Error(parsed.message || `Serper request failed with status ${res.statusCode}`));
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
        req.write(body);
        req.end();
    });
}

function normalizeImageResult(result) {
    return {
        title: result.title || result.source || 'Image result',
        imageUrl: result.imageUrl,
        sourceLink: result.link,
        displayDomain: result.domain || result.source || result.link,
    };
}

async function search(query) {
    if (!process.env.SERPER_API_KEY) {
        throw new Error('Missing SERPER_API_KEY');
    }

    const res = await serperRequest('/images', {
        q: query,
        num: 10,
        gl: 'us',
        hl: 'en',
    });

    const images = (res.images || [])
        .filter((result) => result.imageUrl && result.link)
        .map(normalizeImageResult);

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
