const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const supabase = require("./config/supabase");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

const {
    scrapeAllTrackedProducts
} = require("./scraper/scrapeRunner");


// Middleware
app.use(cors());

app.use(express.json());


// Test route
app.get("/", (req, res) => {

    res.json({
        message: "INE Price Tracker Backend is running"
    });

});


// Health check route
app.get("/health", (req, res) => {

    res.json({
        status: "ok",
        timestamp: new Date().toISOString()
    });

});

app.get("/db-test", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("tracked_products")
            .select("*");

        if (error) {
            throw error;
        }

        res.json({
            message: "Supabase connected successfully",
            trackedProducts: data
        });

    } catch (error) {
        console.error("Supabase error:", error);

        res.status(500).json({
            message: "Supabase connection failed",
            error: error.message
        });
    }
});

// Prevent two cron scraping jobs
// from running at the same time.
let scrapeJobRunning = false;


// ---------------------------------------------
// CRON SCRAPE ENDPOINT
// ---------------------------------------------

app.get(
    "/api/scrape/cron",
    async (req, res) => {

        // -----------------------------
        // SECURITY CHECK
        // -----------------------------

        const cronSecret =
            req.headers[
                "x-cron-secret"
            ];


        if (
            !cronSecret ||
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


        // -----------------------------
        // PREVENT OVERLAPPING JOBS
        // -----------------------------

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


        try {

            console.log(
                "\nCRON SCRAPE STARTED"
            );


            const results =
                await scrapeAllTrackedProducts();


            const successful =
                results.filter(
                    result =>
                        result.success
                ).length;


            const failed =
                results.length -
                successful;


            console.log(
                "\nCRON SCRAPE FINISHED"
            );


            return res.json({

                success: true,

                total:
                    results.length,

                successful,

                failed,

                results

            });

        }

        catch (error) {

            console.error(
                "Cron scrape failed:",
                error
            );


            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Cron scrape failed",

                    error:
                        error.message

                });

        }

        finally {

            scrapeJobRunning = false;

        }

    }
);

// Start server
app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `Server running on port ${PORT}`
        );
    }
);