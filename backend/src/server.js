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

app.get("/api/scrape/cron", (req, res) => {
    const cronSecret = req.headers["x-cron-secret"];

    // Check secret
    if (cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    // Prevent overlapping scrape jobs
    if (scrapeJobRunning) {
        return res.status(409).json({
            success: false,
            message: "A scrape job is already running"
        });
    }

    scrapeJobRunning = true;

    console.log("\n==============================");
    console.log("CRON SCRAPE STARTED");
    console.log("==============================\n");

    // Start scraping in background
    scrapeAllTrackedProducts()
        .then((results) => {
            const successful = results.filter(
                (result) => result.success
            ).length;

            const failed = results.length - successful;

            console.log("\nCRON SCRAPE SUMMARY");
            console.log("Total:", results.length);
            console.log("Successful:", successful);
            console.log("Failed:", failed);
        })
        .catch((error) => {
            console.error("CRON SCRAPE ERROR:", error);
        })
        .finally(() => {
            scrapeJobRunning = false;

            console.log("\n==============================");
            console.log("CRON SCRAPE FINISHED");
            console.log("==============================\n");
        });

    // Respond immediately
    return res.status(202).json({
        success: true,
        message: "Scrape job started"
    });
});

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