// backend/src/scraper/productScraper.js

const selectors = require("./selectors");


function extractProductId(url) {
    const parsedUrl = new URL(url);

    const parts = parsedUrl.pathname
        .split("/")
        .filter(Boolean);

    return parts[parts.length - 1];
}


function parsePrice(priceText) {
    if (!priceText) {
        throw new Error("PRICE_TEXT_EMPTY");
    }

    const cleaned = priceText
        .replace(/,/g, "")
        .replace(/[^\d.]/g, "");

    const price = Number.parseFloat(cleaned);

    if (!Number.isFinite(price)) {
        throw new Error(
            `INVALID_PRICE: ${priceText}`
        );
    }

    return price;
}

async function performPriceInteraction(
    page,
    offerPanel
) {
    const box =
        await offerPanel.boundingBox();

    if (!box) {
        throw new Error(
            "OFFER_PANEL_BOUNDING_BOX_NOT_FOUND"
        );
    }


    // Start outside the panel
    await page.mouse.move(
        Math.max(1, box.x - 80),
        box.y + box.height / 2
    );


    // Perform more than the required 8 moves.
    // These are real Playwright mouse events,
    // not JavaScript dispatchEvent events.
    const movements = 12;


    for (
        let i = 1;
        i <= movements;
        i++
    ) {
        const progress =
            i / movements;

        const x =
            box.x +
            20 +
            (
                box.width - 40
            ) * progress;

        const y =
            box.y +
            box.height / 2 +
            Math.sin(i) * 12;


        await page.mouse.move(
            x,
            y
        );


        await page.waitForTimeout(
            80
        );
    }


    // Store requires at least ~600ms dwell.
    // Give it more than that.
    await page.waitForTimeout(
        900
    );


    console.log(
        "Human-like mouse interaction completed."
    );
}

async function performPriceInteraction(
    page,
    offerPanel
) {

    const box =
        await offerPanel.boundingBox();


    if (!box) {

        throw new Error(
            "OFFER_PANEL_BOUNDING_BOX_NOT_FOUND"
        );

    }


    await page.mouse.move(
        Math.max(1, box.x - 80),
        box.y + box.height / 2
    );


    const movements = 12;


    for (
        let i = 1;
        i <= movements;
        i++
    ) {

        const progress =
            i / movements;


        const x =
            box.x +
            20 +
            (box.width - 40) *
                progress;


        const y =
            box.y +
            box.height / 2 +
            Math.sin(i) * 12;


        await page.mouse.move(
            x,
            y
        );


        await page.waitForTimeout(
            80
        );

    }


    await page.waitForTimeout(
        900
    );


    console.log(
        "Human-like mouse interaction completed."
    );

}

async function waitForStableOffer(
    page,
    offerPanel
) {
    console.log(
        "Waiting for price section to become stable..."
    );

    const checkPriceButton =
        page.getByRole(
            "button",
            {
                name: /check.*price/i
            }
        ).first();

    const startTime = Date.now();

    const MAX_WAIT = 45000;

    let lastStatus = "";
    let hoverAttempts = 0;


    while (
        Date.now() - startTime < MAX_WAIT
    ) {
        if (page.isClosed()) {
            throw new Error(
                "PAGE_CLOSED_DURING_PRICE_LOAD"
            );
        }


        const panelText =
            await offerPanel
                .innerText()
                .catch(() => "");


        const lowerText =
            panelText.toLowerCase();


        if (panelText !== lastStatus) {
            console.log(
                "Current offer status:",
                panelText
                    .replace(/\n/g, " | ")
                    .slice(0, 300)
            );

            lastStatus = panelText;
        }


        const state =
            await offerPanel.evaluate(
                panel => {
                    function isVisible(
                        element
                    ) {
                        if (!element) {
                            return false;
                        }

                        const style =
                            window.getComputedStyle(
                                element
                            );

                        const rect =
                            element
                                .getBoundingClientRect();

                        return (
                            style.display !== "none" &&
                            style.visibility !== "hidden" &&
                            rect.width > 0 &&
                            rect.height > 0
                        );
                    }


                    const priceElement =
                        Array.from(
                            panel.querySelectorAll(
                                "data"
                            )
                        ).find(
                            element =>
                                isVisible(element) &&
                                element.textContent
                                    .includes("₹")
                        );


                    const stockElement =
                        Array.from(
                            panel.querySelectorAll(
                                ".avail-pill"
                            )
                        ).find(
                            element =>
                                isVisible(element)
                        );


                    return {
                        hasPrice:
                            Boolean(
                                priceElement
                            ),

                        hasStock:
                            Boolean(
                                stockElement
                            )
                    };
                }
            );


        const loading =
            lowerText.includes(
                "price locked"
            ) ||
            lowerText.includes(
                "loading current price"
            ) ||
            lowerText.includes(
                "refreshing prices"
            ) ||
            lowerText.includes(
                "retrying"
            );


        if (
            state.hasPrice &&
            state.hasStock &&
            !loading
        ) {
            console.log(
                "Price and stock are stable."
            );

            return;
        }


        if (
            lowerText.includes(
                "price locked"
            )
        ) {
            hoverAttempts++;

            console.log(
                `Triggering price hover (${hoverAttempts})...`
            );


            await offerPanel
                .hover({
                    force: true
                })
                .catch(() => {});


            const buttonVisible =
                await checkPriceButton
                    .isVisible()
                    .catch(
                        () => false
                    );


            const buttonEnabled =
                buttonVisible
                    ? await checkPriceButton
                        .isEnabled()
                        .catch(
                            () => false
                        )
                    : false;


            if (
                buttonVisible &&
                buttonEnabled
            ) {
                console.log(
                    "Price button enabled. Clicking..."
                );

                await checkPriceButton
                    .click({
                        timeout: 5000
                    })
                    .catch(() => {});
            }

            else if (
                buttonVisible &&
                !buttonEnabled
            ) {
                console.log(
                    "Price button visible but disabled — waiting."
                );
            }
        }


        await page.waitForTimeout(
            600
        );
    }


    throw new Error(
        "PRICE_AND_STOCK_TIMEOUT"
    );
}


async function scrapeProductPage(
    page,
    productUrl,
    selectedOption
) {
    console.log(
        `Opening product: ${productUrl}`
    );


    await page.goto(
        productUrl,
        {
            waitUntil:
                "domcontentloaded",

            timeout: 30000
        }
    );


    const productId =
        extractProductId(
            page.url()
        );


    const titleLocator =
        page.locator(
            selectors.productTitle
        );


    await titleLocator.waitFor({
        state: "visible",
        timeout: 30000
    });


    const productName =
        (
            await titleLocator.innerText()
        ).trim();


    console.log(
        "Product name:",
        productName
    );


    const optionGroup =
        page.locator(
            selectors.optionGroup
        );


    await optionGroup.waitFor({
        state: "visible",
        timeout: 30000
    });


    const optionName =
        await optionGroup
            .getAttribute(
                "aria-label"
            );


    const optionButtons =
        page.locator(
            selectors.optionButtons
        );


    const options =
        await optionButtons
            .allTextContents();


    const cleanedOptions =
        options
            .map(
                option =>
                    option.trim()
            )
            .filter(Boolean);


    console.log(
        "Option type:",
        optionName
    );


    console.log(
        "Available options:",
        cleanedOptions
    );


    if (selectedOption) {
        if (
            !cleanedOptions.includes(
                selectedOption
            )
        ) {
            throw new Error(
                `OPTION_NOT_FOUND: ${selectedOption}`
            );
        }


        console.log(
            "Selecting option:",
            selectedOption
        );


        const optionButton =
            page.getByRole(
                "button",
                {
                    name:
                        selectedOption,

                    exact: true
                }
            );


        await optionButton.waitFor({
            state: "visible",
            timeout: 10000
        });


        await optionButton.click();


        console.log(
            "Option selected."
        );


        await page.waitForTimeout(
            300
        );
    }


    const offerPanel =
        page.locator(
            selectors.offerPanel
        );


    await offerPanel.waitFor({
        state: "visible",
        timeout: 30000
    });


    console.log(
        "Offer panel found."
    );

    await performPriceInteraction(
        page,
        offerPanel
    );


    await waitForStableOffer(
        page,
        offerPanel
    );


    await waitForStableOffer(
        page,
        offerPanel
    );


    const offerData =
        await offerPanel.evaluate(
            panel => {
                function isVisible(
                    element
                ) {
                    if (!element) {
                        return false;
                    }

                    const style =
                        window.getComputedStyle(
                            element
                        );

                    const rect =
                        element
                            .getBoundingClientRect();

                    return (
                        style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        rect.width > 0 &&
                        rect.height > 0
                    );
                }


                const priceElement =
                    Array.from(
                        panel.querySelectorAll(
                            "data"
                        )
                    ).find(
                        element =>
                            isVisible(element) &&
                            element.textContent
                                .includes("₹")
                    );


                const stockElement =
                    Array.from(
                        panel.querySelectorAll(
                            ".avail-pill"
                        )
                    ).find(
                        element =>
                            isVisible(element)
                    );


                return {
                    priceText:
                        priceElement
                            ?.textContent
                            ?.trim()
                        || null,

                    stock:
                        stockElement
                            ?.textContent
                            ?.trim()
                        || null
                };
            }
        );


    console.log(
        "Price text found:",
        offerData.priceText
    );


    console.log(
        "Stock found:",
        offerData.stock
    );


    if (!productName) {
        throw new Error(
            "PRODUCT_NAME_EMPTY"
        );
    }


    if (!offerData.priceText) {
        throw new Error(
            "VISIBLE_PRICE_NOT_FOUND"
        );
    }


    if (!offerData.stock) {
        throw new Error(
            "VISIBLE_STOCK_NOT_FOUND"
        );
    }


    const price =
        parsePrice(
            offerData.priceText
        );


    return {
        productId,

        productName,

        optionType:
            optionName,

        selectedOption:
            selectedOption || null,

        availableOptions:
            cleanedOptions,

        price,

        priceText:
            offerData.priceText,

        stock:
            offerData.stock
    };
}


module.exports = {
    scrapeProductPage,
    extractProductId,
    parsePrice
};