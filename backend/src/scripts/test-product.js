const {
    launchBrowser
} = require("../scraper/browser");

const {
    scrapeProductPage
} = require("../scraper/productScraper");


async function test() {

    let browser;

    try {

        browser = await launchBrowser(true);

        const page = await browser.newPage();


        // Debugging: tell us if the page/browser unexpectedly closes
        page.on("close", () => {
            console.log("DEBUG: Page was closed.");
        });

        page.on("crash", () => {
            console.log("DEBUG: Page crashed.");
        });


        const result =
            await scrapeProductPage(
                page,
                "https://demo.inelabteamdev.com/item/2910",
                "Regular"
            );


        console.log("\nSCRAPE RESULT:");

        console.log(
            JSON.stringify(
                result,
                null,
                2
            )
        );


        console.log(
            "\nScrape successful."
        );


        // Keep browser open for 5 seconds
        await new Promise(resolve =>
            setTimeout(resolve, 5000)
        );

    }

    catch (error) {

        console.error(
            "\nSCRAPE FAILED:"
        );

        console.error(
            error
        );

    }

    finally {

        if (browser) {

            console.log(
                "\nClosing browser..."
            );

            await browser.close()
                .catch(() => {});

        }

    }

}


test();