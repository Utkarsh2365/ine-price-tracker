const supabase =
    require("../config/supabase");

const {
    launchBrowser,
    createScraperPage
} = require("./browser");

const {
    scrapeProductPage
} = require("./productScraper");


function sleep(ms) {

    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );

}


// --------------------------------------------------
// SAVE ONE SCRAPE ATTEMPT TO SUPABASE
// --------------------------------------------------

async function saveScrapeAttempt(
    product,
    {
        outcome,
        attemptNumber,
        price = null,
        stock = null,
        errorMessage = null,
        durationMs = null
    }
) {

    const {
        data,
        error
    } = await supabase
        .from("scrape_history")
        .insert({

            tracked_product_id:
                product.id,

            store_product_id:
                product.store_product_id,

            product_name:
                product.product_name,

            selected_option:
                product.selected_option,

            price,

            stock,

            outcome,

            attempt_number:
                attemptNumber,

            error_message:
                errorMessage,

            duration_ms:
                durationMs

        })
        .select()
        .single();


    if (error) {
        throw error;
    }


    return data;
}


// --------------------------------------------------
// SCRAPE ONE TRACKED PRODUCT WITH RETRIES
// --------------------------------------------------

async function scrapeTrackedProduct(
    product
) {

    const maxAttempts =
        Number(
            process.env.MAX_SCRAPE_ATTEMPTS
            || 3
        );


    console.log(
        "\n======================================"
    );

    console.log(
        "Scraping:",
        product.product_name
    );

    console.log(
        "Option:",
        product.selected_option
    );

    console.log(
        "======================================"
    );


    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        console.log(
            `\nApplication attempt ${attempt}/${maxAttempts}`
        );


        const startedAt =
            Date.now();


        let browser;


        try {

            // New headless browser
            // for every attempt.
            browser =
                await launchBrowser(false);


            // IMPORTANT:
            // Use createScraperPage()
            // instead of browser.newPage()
            //
            // This installs the manifest
            // interception before navigation.
            const page =
                await createScraperPage(
                    browser
                );


            const result =
                await scrapeProductPage(

                    page,

                    product.product_url,

                    product.selected_option

                );


            const durationMs =
                Date.now() -
                startedAt;


            // --------------------------------
            // SUCCESS
            // --------------------------------

            await saveScrapeAttempt(
                product,
                {

                    outcome:
                        "success",

                    attemptNumber:
                        attempt,

                    price:
                        result.price,

                    stock:
                        result.stock,

                    durationMs

                }
            );


            console.log(
                "\nSCRAPE SUCCESSFUL"
            );


            console.log(
                "Price:",
                result.priceText
            );


            console.log(
                "Stock:",
                result.stock
            );


            return {

                success: true,

                attempt,

                data: result

            };

        }

        catch (error) {

            const durationMs =
                Date.now() -
                startedAt;


            const isFinalAttempt =
                attempt ===
                maxAttempts;


            const outcome =
                isFinalAttempt
                    ? "failed"
                    : "retried";


            console.error(
                `Attempt ${attempt} failed:`,
                error.message
            );


            // Failed/retried attempts
            // must not contain fake price/stock.
            await saveScrapeAttempt(
                product,
                {

                    outcome,

                    attemptNumber:
                        attempt,

                    price: null,

                    stock: null,

                    errorMessage:
                        error.message,

                    durationMs

                }
            );


            if (isFinalAttempt) {

                console.error(
                    "\nAll attempts failed."
                );


                return {

                    success: false,

                    attempt,

                    error:
                        error.message

                };

            }


            // --------------------------------
            // RETRY BACKOFF
            // --------------------------------

            const delayMs =
                attempt * 2000;


            console.log(
                `Retrying after ${delayMs} ms...`
            );


            await sleep(
                delayMs
            );

        }

        finally {

            if (browser) {

                await browser
                    .close()
                    .catch(() => {});

            }

        }

    }

}

async function scrapeAllTrackedProducts() {

    console.log(
        "\nLoading active tracked products..."
    );

    const {
        data: products,
        error
    } = await supabase
        .from("tracked_products")
        .select("*")
        .eq("active", true);

    if (error) {
        throw error;
    }

    console.log(
        `Found ${products.length} active product(s).`
    );

    const results = [];

    for (const product of products) {

        console.log(
            "\n--------------------------------------"
        );

        console.log(
            "Starting:",
            product.product_name
        );

        console.log(
            "Option:",
            product.selected_option
        );

        console.log(
            "--------------------------------------"
        );

        const result =
            await scrapeTrackedProduct(
                product
            );

        results.push({
            trackedProductId:
                product.id,

            productName:
                product.product_name,

            selectedOption:
                product.selected_option,

            ...result
        });
    }

    return results;
}




module.exports = {

    scrapeTrackedProduct,

    scrapeAllTrackedProducts,

};