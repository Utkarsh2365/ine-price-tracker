const {
    launchBrowser,
    createScraperPage
} = require("../scraper/browser");

const {
    scrapeProductPage
} = require("../scraper/productScraper");

const PRODUCT_URL =
    "https://demo.inelabteamdev.com/item/2032";

const SELECTED_OPTION =
    "Regular";

const MAX_ATTEMPTS = 3;


function sleep(ms) {
    return new Promise((resolve) =>
        setTimeout(resolve, ms)
    );
}


async function runHeadedDemo() {

    console.log(
        "\n=========================================="
    );

    console.log(
        "INE PRICE TRACKER - HEADED SCRAPER DEMO"
    );

    console.log(
        "=========================================="
    );

    console.log(
        "Product: Brightwell Pull-up Bar One"
    );

    console.log(
        "Option:",
        SELECTED_OPTION
    );


    for (
        let attempt = 1;
        attempt <= MAX_ATTEMPTS;
        attempt++
    ) {

        let browser = null;

        try {

            console.log(
                `\nAttempt ${attempt}/${MAX_ATTEMPTS}`
            );


            // true = headed mode
            browser =
                await launchBrowser(true);


            const page =
                await createScraperPage(
                    browser
                );


            console.log(
                "Opening product page..."
            );


            const result =
                await scrapeProductPage(
                    page,
                    PRODUCT_URL,
                    SELECTED_OPTION
                );


            console.log(
                "\nSCRAPE SUCCESSFUL"
            );

            console.log(
                "Product:",
                result.productName
            );

            console.log(
                "Option:",
                result.selectedOption
            );

            console.log(
                "Price:",
                result.priceText
            );

            console.log(
                "Stock:",
                result.stock
            );


            console.log(
                "\nKeeping browser open for 8 seconds..."
            );


            await sleep(8000);

            return;

        } catch (error) {

            console.log(
                `\nAttempt ${attempt} failed`
            );

            console.log(
                "Reason:",
                error.message
            );


            if (
                attempt < MAX_ATTEMPTS
            ) {

                console.log(
                    "Retrying..."
                );

                await sleep(
                    attempt * 3000
                );

            } else {

                console.log(
                    "\nFINAL RESULT: FAILED"
                );

                console.log(
                    "No incorrect price or stock was accepted."
                );

            }

        } finally {

            if (browser) {

                await browser
                    .close()
                    .catch(() => {});

            }

        }

    }

}


runHeadedDemo();