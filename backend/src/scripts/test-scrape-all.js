const {
    scrapeAllTrackedProducts
} = require("../scraper/scrapeRunner");


async function test() {

    try {

        console.log(
            "Starting all-product scrape..."
        );

        const results =
            await scrapeAllTrackedProducts();

        console.log(
            "\nALL PRODUCT SCRAPES COMPLETE:"
        );

        console.log(
            JSON.stringify(
                results,
                null,
                2
            )
        );

    }

    catch (error) {

        console.error(
            "\nSCRAPE ALL FAILED:"
        );

        console.error(error);

    }

}


test();