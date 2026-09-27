const dotenv = require("dotenv");

dotenv.config();

const STORE_URL =
    process.env.STORE_URL ||
    "https://demo.inelabteamdev.com";

const LISTING_LIMIT = 20;

const CACHE_DURATION =
    30 * 60 * 1000;

const PAGE_CONCURRENCY = 6;

const MAX_SEARCH_RESULTS = 30;


// =====================================================
// CACHE
// =====================================================

let catalogCache = [];

let catalogCacheUpdatedAt = 0;

const productDetailCache =
    new Map();


// =====================================================
// FETCH LISTING PAGE
// =====================================================

async function fetchListingPage(page) {

    const url =
        `${STORE_URL}/api/v2/listings?page=${page}&limit=${LISTING_LIMIT}`;

    const response =
        await fetch(url);

    if (!response.ok) {

        throw new Error(
            `Store listings request failed: HTTP ${response.status}`
        );

    }

    const data =
        await response.json();


    if (
        !data ||
        !Array.isArray(
            data.results
        )
    ) {

        throw new Error(
            "Invalid listings response from INE Store"
        );

    }


    return data;
}


// =====================================================
// LOAD COMPLETE STORE CATALOG
// =====================================================

async function loadStoreCatalog() {

    const now =
        Date.now();


    if (
        catalogCache.length > 0 &&
        now - catalogCacheUpdatedAt <
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


    // First page tells us totalPages
    const firstPage =
        await fetchListingPage(1);


    const totalPages =
        Number(
            firstPage.totalPages
        ) || 1;


    console.log(
        `INE Store catalog pages: ${totalPages}`
    );


    const allProducts = [
        ...firstPage.results
    ];


    // Fetch remaining pages in small batches
    // instead of opening 47+ requests at once.
    for (
        let startPage = 2;
        startPage <= totalPages;
        startPage += PAGE_CONCURRENCY
    ) {

        const pageNumbers = [];


        for (
            let page = startPage;
            page <
                startPage +
                    PAGE_CONCURRENCY &&
            page <= totalPages;
            page++
        ) {

            pageNumbers.push(
                page
            );

        }


        const responses =
            await Promise.all(
                pageNumbers.map(
                    (page) =>
                        fetchListingPage(
                            page
                        )
                )
            );


        for (
            const response
            of responses
        ) {

            allProducts.push(
                ...response.results
            );

        }

    }


    // Remove duplicates by store ID
    const uniqueProducts =
        new Map();


    for (
        const product
        of allProducts
    ) {

        if (
            product &&
            product.id &&
            product.name
        ) {

            uniqueProducts.set(
                String(
                    product.id
                ),
                product
            );

        }

    }


    catalogCache =
        Array.from(
            uniqueProducts.values()
        );


    catalogCache.sort(
        (a, b) =>
            a.name.localeCompare(
                b.name
            )
    );


    catalogCacheUpdatedAt =
        Date.now();


    console.log(
        `INE Store catalog loaded: ${catalogCache.length} products`
    );


    return catalogCache;
}


// =====================================================
// LOAD FULL PRODUCT DETAILS
// =====================================================

async function getProductDetails(
    product
) {

    const id =
        String(
            product.id
        );


    if (
        productDetailCache.has(
            id
        )
    ) {

        return productDetailCache.get(
            id
        );

    }


    try {

        const response =
            await fetch(
                `${STORE_URL}/api/v2/items/${id}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const item =
            await response.json();


        const normalized = {

            storeProductId:
                String(
                    item.id
                ),

            productName:
                item.name,

            productUrl:
                `${STORE_URL}/item/${item.id}`,

            brand:
                item.brand || "",

            category:
                item.category || "",

            sku:
                item.sku || "",

            description:
                item.description || "",

            options:
                Array.isArray(
                    item.options
                )
                    ? item.options.map(
                        (option) => ({

                            id:
                                option.id,

                            label:
                                option.label

                        })
                    )
                    : []

        };


        productDetailCache.set(
            id,
            normalized
        );


        return normalized;


    } catch (error) {

        console.error(
            `Unable to load details for product ${id}:`,
            error.message
        );


        // Return listing information even if
        // detail request temporarily fails.
        return {

            storeProductId:
                id,

            productName:
                product.name,

            productUrl:
                `${STORE_URL}/item/${id}`,

            brand:
                product.brand || "",

            category:
                product.category || "",

            sku:
                product.sku || "",

            description:
                product.description || "",

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
            searchQuery || ""
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


    // Requirement:
    // partial OR complete product-name search.
    const matches =
        catalog.filter(
            (product) =>
                String(
                    product.name || ""
                )
                    .toLowerCase()
                    .includes(
                        query
                    )
        );


    // Better ordering:
    // exact matches -> starts-with -> contains
    matches.sort(
        (a, b) => {

            const aName =
                a.name
                    .toLowerCase();

            const bName =
                b.name
                    .toLowerCase();


            const aExact =
                aName === query;

            const bExact =
                bName === query;


            if (
                aExact !== bExact
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
                aStarts !== bStarts
            ) {

                return aStarts
                    ? -1
                    : 1;

            }


            return a.name.localeCompare(
                b.name
            );

        }
    );


    const limitedMatches =
        matches.slice(
            0,
            MAX_SEARCH_RESULTS
        );


    // Only load expensive detail/option data
    // for actual matching products.
    const detailedProducts =
        await Promise.all(
            limitedMatches.map(
                (product) =>
                    getProductDetails(
                        product
                    )
            )
        );


    console.log(
        `Search "${searchQuery}" → ${matches.length} match(es)`
    );


    return {

        totalMatches:
            matches.length,

        products:
            detailedProducts

    };
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {
    searchStoreProducts
};