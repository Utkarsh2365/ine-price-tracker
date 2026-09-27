const selectors = {

    // Product name
    productTitle:
        ".pdp-summary h1",

    // Container holding product options
    optionGroup:
        '.opt-picker[role="group"]',

    // Individual option buttons
    optionButtons:
        '.opt-picker[role="group"] button',

    // Main offer/price/stock section
    offerPanel:
        ".offer-panel",

    // Actual current price is inside the <data> element
    currentPrice:
        ".offer-panel data",

    // Stock status
    stock:
        ".offer-panel .avail-pill"

};

module.exports = selectors;