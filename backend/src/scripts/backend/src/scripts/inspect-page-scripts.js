const fs = require("fs");

const { chromium } = require("playwright");


async function inspectScripts() {

    const browser =
        await chromium.launch({
            headless: false
        });


    const page =
        await browser.newPage();


    const scriptUrls = [];


    page.on(
        "response",
        async response => {

            const request =
                response.request();


            if (
                request.resourceType()
                !== "script"
            ) {
                return;
            }


            const url =
                response.url();


            scriptUrls.push(url);


            console.log(
                "SCRIPT:",
                url
            );


            try {

                const body =
                    await response.text();


                const interesting = [

                    "Price locked",

                    "CHECK TODAY",

                    "upstream 503",

                    "refreshing prices",

                    "Loading current price",

                    "avail-pill",

                    "offer-panel"

                ];


                for (
                    const keyword
                    of interesting
                ) {

                    if (
                        body
                            .toLowerCase()
                            .includes(
                                keyword
                                    .toLowerCase()
                            )
                    ) {

                        console.log(
                            `FOUND "${keyword}" in:`,
                            url
                        );


                        fs.appendFileSync(
                            "interesting-scripts.txt",

                            `\n\n============================\n` +
                            `URL: ${url}\n` +
                            `MATCH: ${keyword}\n` +
                            `============================\n` +
                            body
                        );

                    }

                }

            }

            catch {
                // Ignore unreadable scripts
            }

        }
    );


    await page.goto(
        "https://demo.inelabteamdev.com/item/2910",
        {
            waitUntil:
                "networkidle",

            timeout: 30000
        }
    );


    console.log(
        "\nPage loaded."
    );


    console.log(
        "\nScripts discovered:",
        scriptUrls.length
    );


    console.log(
        "\nSearching scripts for price-loading logic..."
    );


    await page.waitForTimeout(
        3000
    );


    await browser.close();


    console.log(
        "\nFinished."
    );


    console.log(
        "If matches were found, check:"
    );


    console.log(
        "backend/interesting-scripts.txt"
    );

}


inspectScripts()
    .catch(error => {

        console.error(error);

        process.exit(1);

    });