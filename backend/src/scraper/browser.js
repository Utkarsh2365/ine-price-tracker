const { chromium } = require("playwright");


async function launchBrowser(headed = false) {

    const browser =
        await chromium.launch({
            headless: !headed
        });

    return browser;
}


async function createScraperPage(browser) {

    const page =
        await browser.newPage();


    await page.route(
        "**/api/v2/ui/manifest",
        async route => {

            try {

                const response =
                    await route.fetch();


                const manifest =
                    await response.json();


                console.log(
                    "Original manifest order:",
                    manifest.order
                );


                console.log(
                    "Original price tag:",
                    manifest.priceTag
                );


                // --------------------------------
                // FORCE STOCK TO BE RENDERED
                // --------------------------------

                if (
                    !Array.isArray(
                        manifest.order
                    )
                ) {
                    manifest.order = [];
                }


                if (
                    !manifest.order.includes(
                        "stock"
                    )
                ) {
                    manifest.order.push(
                        "stock"
                    );
                }


                // --------------------------------
                // NORMALIZE PRICE ELEMENT
                // --------------------------------
                //
                // Our scraper reads:
                // panel.querySelectorAll("data")
                //
                // The mock store randomly changes
                // the HTML tag used for the price,
                // e.g. strong/span/data.
                //
                // Force it to always render as <data>.

                manifest.priceTag =
                    "data";


                console.log(
                    "Scraper manifest order:",
                    manifest.order
                );


                console.log(
                    "Scraper price tag:",
                    manifest.priceTag
                );


                await route.fulfill({

                    response,

                    json: manifest

                });

            }

            catch (error) {

                console.error(
                    "Manifest interception failed:",
                    error.message
                );


                await route.continue();

            }

        }
    );


    return page;
}


module.exports = {

    launchBrowser,

    createScraperPage

};