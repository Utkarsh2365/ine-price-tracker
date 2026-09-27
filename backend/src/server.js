const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const supabase = require("./config/supabase");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

const {
    scrapeAllTrackedProducts,
    scrapeTrackedProduct
} = require("./scraper/scrapeRunner");


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());


// =====================================================
// ROOT ROUTE
// =====================================================

app.get("/", (req, res) => {

    res.json({
        message: "INE Price Tracker Backend is running"
    });

});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/health", (req, res) => {

    res.json({
        status: "ok",
        timestamp: new Date().toISOString()
    });

});


// =====================================================
// DATABASE TEST
// =====================================================

app.get("/db-test", async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("tracked_products")
            .select("*");

        if (error) {
            throw error;
        }

        return res.json({
            message: "Supabase connected successfully",
            trackedProducts: data
        });

    } catch (error) {

        console.error("Supabase error:", error);

        return res.status(500).json({
            message: "Supabase connection failed",
            error: error.message
        });

    }

});


// =====================================================
// API: GET ALL TRACKED PRODUCTS
// =====================================================

app.get("/api/products", async (req, res) => {

    try {

        const {
            data: products,
            error: productsError
        } = await supabase
            .from("tracked_products")
            .select("*");

        if (productsError) {
            throw productsError;
        }


        const {
            data: history,
            error: historyError
        } = await supabase
            .from("scrape_history")
            .select("*")
            .eq("outcome", "success")
            .order("attempted_at", {
                ascending: false
            });

        if (historyError) {
            throw historyError;
        }


        const latestScrapes = new Map();

        for (const scrape of history) {

            if (
                !latestScrapes.has(
                    scrape.tracked_product_id
                )
            ) {

                latestScrapes.set(
                    scrape.tracked_product_id,
                    scrape
                );

            }

        }


        const result = products.map((product) => {

            const latest =
                latestScrapes.get(product.id);

            return {

                id: product.id,

                storeProductId:
                    product.store_product_id,

                productName:
                    product.product_name,

                productUrl:
                    product.product_url,

                selectedOption:
                    product.selected_option,

                active:
                    product.active,

                latestPrice:
                    latest
                        ? latest.price
                        : null,

                latestStock:
                    latest
                        ? latest.stock
                        : null,

                lastScrapedAt:
                    latest
                        ? latest.attempted_at
                        : null
            };

        });


        return res.json({
            success: true,
            count: result.length,
            products: result
        });

    } catch (error) {

        console.error(
            "GET PRODUCTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to load tracked products",
            error: error.message
        });

    }

});


// =====================================================
// API: GET PRICE HISTORY
// =====================================================

app.get(
    "/api/products/:id/history",
    async (req, res) => {

        try {

            const productId =
                req.params.id;


            const {
                data: product,
                error: productError
            } = await supabase
                .from("tracked_products")
                .select("*")
                .eq("id", productId)
                .single();


            if (productError || !product) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tracked product not found"
                });

            }


            const {
                data: history,
                error: historyError
            } = await supabase
                .from("scrape_history")
                .select("*")
                .eq(
                    "tracked_product_id",
                    productId
                )
                .eq(
                    "outcome",
                    "success"
                )
                .order(
                    "attempted_at",
                    {
                        ascending: true
                    }
                );


            if (historyError) {
                throw historyError;
            }


            const formattedHistory =
                history.map((item) => ({

                    id: item.id,

                    price:
                        item.price,

                    stock:
                        item.stock,

                    attemptedAt:
                        item.attempted_at

                }));


            return res.json({

                success: true,

                product: {

                    id:
                        product.id,

                    storeProductId:
                        product.store_product_id,

                    productName:
                        product.product_name,

                    selectedOption:
                        product.selected_option,

                    active:
                        product.active

                },

                count:
                    formattedHistory.length,

                history:
                    formattedHistory

            });

        } catch (error) {

            console.error(
                "GET PRODUCT HISTORY ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load product history",
                error:
                    error.message
            });

        }

    }
);


// =====================================================
// API: TRACK NEW PRODUCT
// =====================================================

app.post("/api/products", async (req, res) => {

    try {

        const {
            storeProductId,
            productName,
            productUrl,
            selectedOption
        } = req.body;


        if (
            !storeProductId ||
            !productName ||
            !productUrl ||
            !selectedOption
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "storeProductId, productName, productUrl and selectedOption are required"
            });

        }


        // Check duplicate
        const {
            data: existing,
            error: existingError
        } = await supabase
            .from("tracked_products")
            .select("*")
            .eq(
                "store_product_id",
                storeProductId
            )
            .eq(
                "selected_option",
                selectedOption
            );


        if (existingError) {
            throw existingError;
        }


        if (
            existing &&
            existing.length > 0
        ) {

            return res.status(409).json({
                success: false,
                message:
                    "This product and option are already being tracked"
            });

        }


        // Insert into tracked_products
        const {
            data,
            error
        } = await supabase
            .from("tracked_products")
            .insert({

                store_product_id:
                    storeProductId,

                product_name:
                    productName,

                product_url:
                    productUrl,

                selected_option:
                    selectedOption,

                active: true

            })
            .select()
            .single();


        if (error) {
            throw error;
        }


        // =================================================
        // AUTOMATIC INITIAL SCRAPE
        // =================================================
        //
        // Do not await this.
        // API returns immediately while Playwright
        // scrapes the new product in background.
        // =================================================

        console.log(
            `\nINITIAL SCRAPE STARTED: ${data.product_name}`
        );


        scrapeTrackedProduct(data)

            .then((result) => {

                if (result.success) {

                    console.log(
                        `INITIAL SCRAPE SUCCESS: ${data.product_name}`
                    );

                    console.log(
                        `Price: ${result.data?.priceText}`
                    );

                    console.log(
                        `Stock: ${result.data?.stock}`
                    );

                } else {

                    console.error(
                        `INITIAL SCRAPE FAILED: ${data.product_name}`
                    );

                    console.error(
                        result.error
                    );

                }

            })

            .catch((scrapeError) => {

                console.error(
                    `INITIAL SCRAPE ERROR: ${data.product_name}`,
                    scrapeError
                );

            });


        return res.status(201).json({

            success: true,

            message:
                "Product added successfully. Initial price scrape started.",

            initialScrapeStarted:
                true,

            product:
                data

        });

    } catch (error) {

        console.error(
            "ADD PRODUCT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to add product",
            error:
                error.message
        });

    }

});


// =====================================================
// API: ACTIVATE / DEACTIVATE PRODUCT
// =====================================================

app.patch(
    "/api/products/:id",
    async (req, res) => {

        try {

            const productId =
                req.params.id;

            const {
                active
            } = req.body;


            if (
                typeof active !==
                "boolean"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "active must be true or false"
                });

            }


            const {
                data,
                error
            } = await supabase
                .from("tracked_products")
                .update({
                    active: active
                })
                .eq(
                    "id",
                    productId
                )
                .select()
                .single();


            if (error) {
                throw error;
            }


            return res.json({

                success: true,

                message: active
                    ? "Product tracking activated"
                    : "Product tracking deactivated",

                product:
                    data

            });

        } catch (error) {

            console.error(
                "UPDATE PRODUCT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update product",
                error:
                    error.message
            });

        }

    }
);


// =====================================================
// API: EXPORT PRODUCT HISTORY AS CSV
// =====================================================

app.get(
    "/api/products/:id/export",
    async (req, res) => {

        try {

            const productId =
                req.params.id;


            const {
                data: product,
                error: productError
            } = await supabase
                .from("tracked_products")
                .select("*")
                .eq(
                    "id",
                    productId
                )
                .single();


            if (
                productError ||
                !product
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tracked product not found"
                });

            }


            const {
                data: history,
                error: historyError
            } = await supabase
                .from("scrape_history")
                .select("*")
                .eq(
                    "tracked_product_id",
                    productId
                )
                .order(
                    "attempted_at",
                    {
                        ascending: true
                    }
                );


            if (historyError) {
                throw historyError;
            }


            const escapeCsv = (value) => {

                if (
                    value === null ||
                    value === undefined
                ) {

                    return "";

                }


                const text =
                    String(value)
                        .replace(
                            /"/g,
                            '""'
                        );


                return `"${text}"`;
            };


            const rows = [

                [
                    "Date",
                    "Product",
                    "Selected Option",
                    "Price",
                    "Stock",
                    "Outcome",
                    "Attempt"
                ]

            ];


            for (
                const item of history
            ) {

                rows.push([

                    item.attempted_at,

                    product.product_name,

                    product.selected_option,

                    item.price,

                    item.stock,

                    item.outcome,

                    item.attempt_number

                ]);

            }


            const csv =
                rows
                    .map(
                        (row) =>
                            row
                                .map(
                                    escapeCsv
                                )
                                .join(",")
                    )
                    .join("\n");


            const safeName =
                product.product_name
                    .replace(
                        /[^a-z0-9]/gi,
                        "_"
                    )
                    .toLowerCase();


            res.setHeader(
                "Content-Type",
                "text/csv; charset=utf-8"
            );


            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${safeName}_history.csv"`
            );


            return res.send(csv);

        } catch (error) {

            console.error(
                "CSV EXPORT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to export history",
                error:
                    error.message
            });

        }

    }
);


// =====================================================
// PREVENT MULTIPLE CRON JOBS
// =====================================================

let scrapeJobRunning = false;


// =====================================================
// CRON SCRAPE ENDPOINT
// =====================================================

app.get(
    "/api/scrape/cron",
    (req, res) => {

        const cronSecret =
            req.headers[
                "x-cron-secret"
            ];


        if (
            cronSecret !==
            process.env.CRON_SECRET
        ) {

            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Unauthorized"
                });

        }


        if (scrapeJobRunning) {

            return res
                .status(409)
                .json({
                    success: false,
                    message:
                        "A scrape job is already running"
                });

        }


        scrapeJobRunning = true;


        console.log(
            "\n=============================="
        );

        console.log(
            "CRON SCRAPE STARTED"
        );

        console.log(
            "==============================\n"
        );


        scrapeAllTrackedProducts()

            .then((results) => {

                const successful =
                    results.filter(
                        (result) =>
                            result.success
                    ).length;


                const failed =
                    results.length -
                    successful;


                console.log(
                    "\nCRON SCRAPE SUMMARY"
                );

                console.log(
                    "Total:",
                    results.length
                );

                console.log(
                    "Successful:",
                    successful
                );

                console.log(
                    "Failed:",
                    failed
                );

            })

            .catch((error) => {

                console.error(
                    "CRON SCRAPE ERROR:",
                    error
                );

            })

            .finally(() => {

                scrapeJobRunning =
                    false;


                console.log(
                    "\n=============================="
                );

                console.log(
                    "CRON SCRAPE FINISHED"
                );

                console.log(
                    "==============================\n"
                );

            });


        return res
            .status(202)
            .json({
                success: true,
                message:
                    "Scrape job started"
            });

    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);