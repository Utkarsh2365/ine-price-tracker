const dotenv = require("dotenv");

dotenv.config();

const STORE_URL =
    process.env.STORE_URL ||
    "https://demo.inelabteamdev.com";

const PAGE_SIZE = 20;

const CACHE_DURATION =
    30 * 60 * 1000;

// Keep catalog traffic gentle.
// We only fetch 2 pages at a time.
const PAGE_BATCH_SIZE = 2;

// Pause between page batches.
const PAGE_BATCH_DELAY = 600;

// Number of retries for temporary
// INE Store failures.
const MAX_FETCH_ATTEMPTS = 5;


// =====================================================
// CACHE
// =====================================================

let catalogCache = [];

let catalogCacheUpdatedAt = 0;

const detailCache =
    new Map();


// =====================================================
// SLEEP
// =====================================================

function sleep(ms) {
    return new Promise(
        (resolve) =>
            setTimeout(
                resolve,
                ms
            )
    );
}


// =====================================================
// FETCH WITH RETRY
// =====================================================

async function fetchWithRetry(
    url,
    label
) {

    let lastError;


    for (
        let attempt = 1;
        attempt <= MAX_FETCH_ATTEMPTS;
        attempt++
    ) {

        try {

            const response =
                await fetch(
                    url,
                    {
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            // -----------------------------------------
            // SUCCESS
            // -----------------------------------------

            if (
                response.ok
            ) {

                return response;

            }


            // -----------------------------------------
            // RETRYABLE STORE ERRORS
            // -----------------------------------------

            const retryable =
                response.status === 429 ||
                response.status === 502 ||
                response.status === 503 ||
                response.status === 504;


            if (
                !retryable
            ) {

                throw new Error(
                    `${label} failed: HTTP ${response.status}`
                );

            }


            lastError =
                new Error(
                    `${label} temporary failure: HTTP ${response.status}`
                );


            if (
                attempt <
                MAX_FETCH_ATTEMPTS
            ) {

                const retryAfterHeader =
                    response.headers.get(
                        "retry-after"
                    );


                let waitMs;


                if (
                    retryAfterHeader &&
                    !Number.isNaN(
                        Number(
                            retryAfterHeader
                        )
                    )
                ) {

                    waitMs =
                        Number(
                            retryAfterHeader
                        ) *
                        1000;

                } else {

                    // 2s → 4s → 6s → 8s
                    waitMs =
                        attempt *
                        2000;

                }


                console.log(
                    `${label}: HTTP ${response.status}. Retry ${attempt}/${MAX_FETCH_ATTEMPTS} after ${waitMs} ms...`
                );


                await sleep(
                    waitMs
                );


                continue;

            }


        } catch (error) {

            lastError =
                error;


            if (
                attempt >=
                MAX_FETCH_ATTEMPTS
            ) {

                break;

            }


            const waitMs =
                attempt *
                2000;


            console.log(
                `${label}: ${error.message}. Retrying after ${waitMs} ms...`
            );


            await sleep(
                waitMs
            );

        }

    }


    throw (
        lastError ||
        new Error(
            `${label} failed`
        )
    );
}


// =====================================================
// FETCH ONE CATALOG PAGE
// =====================================================

async function fetchCatalogPage(
    pageNumber
) {

    const url =
        `${STORE_URL}/api/v2/listings?page=${pageNumber}&limit=${PAGE_SIZE}`;


    const response =
        await fetchWithRetry(
            url,
            `Catalog page ${pageNumber}`
        );


    const data =
        await response.json();


    if (
        !data ||
        !Array.isArray(
            data.results
        )
    ) {

        throw new Error(
            `Catalog page ${pageNumber} returned invalid data`
        );

    }


    return {

        page:
            Number(
                data.page
            ) ||
            pageNumber,

        perPage:
            Number(
                data.perPage
            ) ||
            PAGE_SIZE,

        totalPages:
            Number(
                data.totalPages
            ) ||
            1,

        count:
            Number(
                data.count
            ) ||
            0,

        results:
            data.results

    };
}


// =====================================================
// LOAD COMPLETE STORE CATALOG
// =====================================================

async function loadStoreCatalog() {

    const cacheAge =
        Date.now() -
        catalogCacheUpdatedAt;


    // -----------------------------------------
    // USE CACHE
    // -----------------------------------------

    if (
        Array.isArray(
            catalogCache
        ) &&
        catalogCache.length > 0 &&
        cacheAge <
            CACHE_DURATION
    ) {

        console.log(
            `Using cached INE catalog (${catalogCache.length} products)`
        );


        return catalogCache;

    }


    console.log(
        "\n======================================"
    );

    console.log(
        "LOADING INE STORE CATALOG"
    );

    console.log(
        "======================================\n"
    );


    // -----------------------------------------
    // FIRST PAGE
    // -----------------------------------------

    const firstPage =
        await fetchCatalogPage(
            1
        );


    const totalPages =
        firstPage.totalPages;


    console.log(
        `Store reports ${firstPage.count} products across ${totalPages} pages`
    );


    const allProducts = [
        ...firstPage.results
    ];


    // Give the store a moment before
    // starting further requests.
    await sleep(
        800
    );


    // =================================================
    // REMAINING PAGES
    //
    // Two at a time with a cooldown.
    // =================================================

    for (
        let startPage = 2;
        startPage <= totalPages;
        startPage += PAGE_BATCH_SIZE
    ) {

        const pageNumbers =
            [];


        for (
            let page = startPage;
            page <
                startPage +
                    PAGE_BATCH_SIZE &&
            page <= totalPages;
            page++
        ) {

            pageNumbers.push(
                page
            );

        }


        console.log(
            `Loading catalog pages ${pageNumbers.join(", ")}...`
        );


        const batchResults =
            await Promise.all(
                pageNumbers.map(
                    (page) =>
                        fetchCatalogPage(
                            page
                        )
                )
            );


        for (
            const pageData
            of batchResults
        ) {

            allProducts.push(
                ...pageData.results
            );

        }


        // Cooldown before next batch
        if (
            startPage +
                PAGE_BATCH_SIZE <=
            totalPages
        ) {

            await sleep(
                PAGE_BATCH_DELAY
            );

        }

    }


    // =================================================
    // REMOVE DUPLICATES
    // =================================================

    const uniqueProducts =
        new Map();


    for (
        const product
        of allProducts
    ) {

        if (
            !product ||
            product.id ===
                undefined ||
            !product.name
        ) {

            continue;

        }


        uniqueProducts.set(
            String(
                product.id
            ),
            product
        );

    }


    catalogCache =
        Array.from(
            uniqueProducts.values()
        );


    catalogCache.sort(
        (a, b) =>
            String(
                a.name
            ).localeCompare(
                String(
                    b.name
                )
            )
    );


    catalogCacheUpdatedAt =
        Date.now();


    console.log(
        "\n======================================"
    );

    console.log(
        `CATALOG READY: ${catalogCache.length} products`
    );

    console.log(
        "======================================\n"
    );


    return catalogCache;
}


// =====================================================
// GET FULL PRODUCT DETAILS
// =====================================================

async function loadProductDetails(
    listingProduct
) {

    const productId =
        String(
            listingProduct.id
        );


    // -----------------------------------------
    // DETAIL CACHE
    // -----------------------------------------

    if (
        detailCache.has(
            productId
        )
    ) {

        return detailCache.get(
            productId
        );

    }


    const url =
        `${STORE_URL}/api/v2/items/${productId}`;


    try {

        const response =
            await fetchWithRetry(
                url,
                `Product ${productId}`
            );


        const item =
            await response.json();


        const normalized = {

            storeProductId:
                String(
                    item.id
                ),

            productName:
                item.name ||
                listingProduct.name,

            productUrl:
                `${STORE_URL}/item/${item.id}`,

            brand:
                item.brand ||
                listingProduct.brand ||
                "",

            category:
                item.category ||
                listingProduct.category ||
                "",

            sku:
                item.sku ||
                listingProduct.sku ||
                "",

            description:
                item.description ||
                listingProduct.description ||
                "",

            options:
                Array.isArray(
                    item.options
                )
                    ? item.options
                        .filter(
                            (option) =>
                                option &&
                                option.label
                        )
                        .map(
                            (option) => ({

                                id:
                                    String(
                                        option.id ||
                                        ""
                                    ),

                                label:
                                    String(
                                        option.label
                                    )

                            })
                        )
                    : []

        };


        detailCache.set(
            productId,
            normalized
        );


        return normalized;


    } catch (error) {

        console.error(
            `Could not load full details for ${listingProduct.name}:`,
            error.message
        );


        // We can still show the product
        // in search results.
        return {

            storeProductId:
                productId,

            productName:
                listingProduct.name,

            productUrl:
                `${STORE_URL}/item/${productId}`,

            brand:
                listingProduct.brand ||
                "",

            category:
                listingProduct.category ||
                "",

            sku:
                listingProduct.sku ||
                "",

            description:
                listingProduct.description ||
                "",

            options: []

        };

    }
}


// =====================================================
// SEARCH STORE PRODUCTS
// =====================================================

async function searchStoreProducts(
    searchQuery
) {

    const query =
        String(
            searchQuery ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        query.length < 2
    ) {

        throw new Error(
            "Enter at least 2 characters to search"
        );

    }


    const catalog =
        await loadStoreCatalog();


    console.log(
        `Searching ${catalog.length} products for "${query}"...`
    );


    // =================================================
    // PARTIAL OR FULL PRODUCT-NAME SEARCH
    // =================================================

    let matches =
        catalog.filter(
            (product) => {

                const productName =
                    String(
                        product.name ||
                        ""
                    )
                        .trim()
                        .toLowerCase();


                return productName.includes(
                    query
                );

            }
        );


    const totalMatches =
        matches.length;


    // =================================================
    // SORT:
    // EXACT
    // STARTS WITH
    // CONTAINS
    // =================================================

    matches.sort(
        (a, b) => {

            const aName =
                String(
                    a.name
                )
                    .toLowerCase();

            const bName =
                String(
                    b.name
                )
                    .toLowerCase();


            const aExact =
                aName === query;

            const bExact =
                bName === query;


            if (
                aExact !==
                bExact
            ) {

                return aExact
                    ? -1
                    : 1;

            }


            const aStarts =
                aName.startsWith(
                    query
                );

            const bStarts =
                bName.startsWith(
                    query
                );


            if (
                aStarts !==
                bStarts
            ) {

                return aStarts
                    ? -1
                    : 1;

            }


            return aName.localeCompare(
                bName
            );

        }
    );


    // Prevent enormous search responses
    matches =
        matches.slice(
            0,
            25
        );


    console.log(
        `Found ${totalMatches} matching product(s)`
    );


    // Slightly space detail requests
    // instead of hammering the item API.

    const products =
        [];


    for (
        const match
        of matches
    ) {

        const details =
            await loadProductDetails(
                match
            );


        products.push(
            details
        );


        await sleep(
            250
        );

    }


    return {

        totalMatches,

        products

    };
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {
    searchStoreProducts
};