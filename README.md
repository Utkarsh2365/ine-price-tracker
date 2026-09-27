# INE Price Tracker

A full-stack product price and stock monitoring application built for the **INE Software Engineer Intern Assignment – Product Price Tracker (Web Scraping)**.

The application allows users to search the INE mock store, select a product and option, automatically track its price and stock, view historical data, inspect scrape attempts, and export scrape history.

---

## Live Links

- **Live Website:** https://ine-price-tracker-sable.vercel.app
- **Backend API:** https://ine-price-tracker-9rss.onrender.com
- **GitHub Repository:** https://github.com/Utkarsh2365/ine-price-tracker
- **INE Mock Store:** https://demo.inelabteamdev.com

---

## Features

- Search products using partial or complete product names
- Select product options before tracking
- Persist tracked products using Supabase
- Automatic initial scrape for newly tracked products
- Scheduled scraping every 2 hours
- Price and stock tracking
- Price-history visualization
- Per-product scrape logs
- Retry handling for failed or slow responses
- Records successful, retried, and failed attempts
- CSV export of scrape history
- Enable or disable individual tracked products
- Headed Playwright mode for observable scraper runs

---

## Tech Stack

### Frontend

- React
- Vite
- Recharts
- CSS
- Vercel

### Backend

- Node.js
- Express.js
- Playwright
- Render

### Database

- Supabase PostgreSQL

### Scheduling

- cron-job.org

---

## Project Structure

```text
ine-price-tracker/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js
│   │   │
│   │   ├── scraper/
│   │   │   ├── browser.js
│   │   │   ├── productScraper.js
│   │   │   ├── scrapeRunner.js
│   │   │   └── selectors.js
│   │   │
│   │   ├── store/
│   │   │   └── storeSearch.js
│   │   │
│   │   ├── scripts/
│   │   │   └── headed-demo.js
│   │   │
│   │   └── server.js
│   │
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── App.css
│   │
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

---

# Setup Instructions

## Prerequisites

Install the following before running the project locally:

- Node.js 18+
- npm
- Git
- Playwright Chromium
- A Supabase project

Node.js 18+ is recommended because the backend uses the built-in `fetch` API.

---

## 1. Clone the Repository

```bash
git clone https://github.com/Utkarsh2365/ine-price-tracker.git
cd ine-price-tracker
```

---

## 2. Backend Setup

Move to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Install Playwright Chromium:

```bash
npx playwright install chromium
```

### Windows PowerShell

If PowerShell blocks `npm.ps1` or `npx.ps1`, use:

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

---

## 3. Backend Environment Variables

Create a `.env` file inside:

```text
backend/.env
```

Add:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SECRET_KEY=your_supabase_server_key

STORE_URL=https://demo.inelabteamdev.com

CRON_SECRET=your_private_cron_secret

MAX_SCRAPE_ATTEMPTS=3
NAVIGATION_TIMEOUT=30000

FRONTEND_URL=http://localhost:5173
```

Do not commit the `.env` file or expose any secret values publicly.

---

## 4. Start the Backend

Run:

```bash
npm start
```

On Windows PowerShell:

```powershell
npm.cmd start
```

The backend runs locally at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/health
```

---

## 5. Frontend Setup

Open a second terminal and move to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

On Windows PowerShell:

```powershell
npm.cmd install
```

---

## 6. Frontend Environment Variable

The frontend can use:

```env
VITE_API_URL=http://localhost:5000
```

For production:

```env
VITE_API_URL=https://ine-price-tracker-9rss.onrender.com
```

---

## 7. Start the Frontend

Run:

```bash
npm run dev
```

On Windows PowerShell:

```powershell
npm.cmd run dev
```

The frontend runs at:

```text
http://localhost:5173
```

Keep the frontend and backend running in separate terminals.

---

# Environment Variables

## Backend Environment Variables

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Server-side Supabase key |
| `STORE_URL` | Base URL of the INE mock store |
| `CRON_SECRET` | Secret used to protect the scheduled scrape endpoint |
| `MAX_SCRAPE_ATTEMPTS` | Maximum number of scrape attempts |
| `NAVIGATION_TIMEOUT` | Browser navigation timeout in milliseconds |
| `FRONTEND_URL` | Frontend URL used by the backend |
| `PLAYWRIGHT_BROWSERS_PATH` | Playwright browser path configuration used during Render deployment |
| `PORT` | Backend server port; Render provides this automatically |

## Frontend Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | URL of the Express backend |

---

# Scraping Schedule

Tracked products are automatically scraped:

```text
Every 2 hours
```

The application uses **cron-job.org** as the external scheduler.

An external scheduling service is used because free-tier Render instances may sleep after periods of inactivity.

The scheduler calls:

```text
GET https://ine-price-tracker-9rss.onrender.com/api/scrape/cron
```

with the following request header:

```text
x-cron-secret: <CRON_SECRET>
```

The backend validates this secret before starting the scraping job.

The cron endpoint returns:

```text
202 Accepted
```

when the scrape job has been successfully accepted.

The actual scraping continues asynchronously on the backend after the response is returned.

Only products marked as active are included in scheduled scraping.

---

# Scraper Reliability

The INE mock store intentionally includes:

- delayed dynamic content
- slow responses
- temporary server errors
- changing prices
- asynchronous loading
- occasional request failures

To make the scraper more reliable, the application uses:

- Playwright Chromium
- configurable navigation timeout
- multiple scraping attempts
- retry handling
- progressive retry delays
- sequential product processing
- price and stock validation
- honest failure logging

Every scrape attempt is recorded.

Successful attempts store:

```text
price = extracted price
stock = extracted stock
outcome = success
```

Failed or retried attempts store:

```text
price = NULL
stock = NULL
outcome = retried / failed
```

This prevents incorrect or incomplete values from being stored as successful data.

The dashboard displays the latest successful price and stock while unsuccessful attempts remain visible in the Scrape Log.

---

# Product Search

Users can search the INE mock store using partial or complete product names.

Example search:

```text
spin
```

The backend searches INE's paginated catalogue and returns matching products along with their available options.

Search endpoint:

```text
GET /api/store/search?q=<product-name>
```

Example:

```text
GET /api/store/search?q=spin
```

The search implementation includes:

- catalogue pagination
- retry handling
- request batching
- request delays
- temporary caching

These mechanisms help reduce failures when the mock store returns temporary errors such as `503`.

---

# Product Tracking

After selecting a product, the user selects one of its available options.

Example tracked product:

```text
Product: Brightwell Pull-up Bar One
Option: Regular
```

The product is then saved in Supabase.

When a product is added, an initial scrape starts automatically.

The frontend periodically refreshes while waiting for the first successful price and stock result.

---

# Price History

For every tracked product, successful scrape records are displayed as historical price data.

The dashboard includes:

- latest successful price
- lowest recorded price
- highest recorded price
- total successful price records
- historical price chart

Recharts is used for price visualization.

Only successful scrape records are included in price-history analytics.

---

# Scrape Log

Every tracked product has a dedicated **Scrape Log**.

The log displays:

- date and time
- attempt number
- outcome
- price
- stock
- error information

Possible outcomes include:

```text
Success
Retried
Failed
```

Failures are intentionally preserved rather than hidden.

Example:

```text
Attempt 1 → Retried → PRICE_AND_STOCK_TIMEOUT
Attempt 2 → Retried → PRICE_AND_STOCK_TIMEOUT
Attempt 3 → Failed  → PRICE_AND_STOCK_TIMEOUT
```

This ensures that unattended failures can be inspected later.

---

# CSV Export

Each tracked product provides an **Export CSV** option.

The CSV contains scrape history including successful and unsuccessful attempts.

Failed attempts contain empty price and stock values instead of incorrect data.

---

# Enable / Disable Tracking

Each tracked product can be enabled or disabled from the dashboard.

Disabled products:

- remain stored in Supabase
- retain their previous scrape history
- are not included in future scheduled scraping

This allows products to be temporarily removed from active tracking without losing historical data.

---

# Running the Scraper in Headed Mode

A headed-mode script is included so that the Playwright browser can be observed during scraping.

Move to the backend directory:

```bash
cd backend
```

Run:

```bash
node src/scripts/headed-demo.js
```

This launches Chromium visibly.

The headed demo can show:

- product page navigation
- product option selection
- dynamic price loading
- stock extraction
- temporary server errors
- timeout handling
- retry attempts
- successful recovery

Example output:

```text
Attempt 1/3

Current offer status:
Store responded with upstream 503

Attempt 1 failed
Reason: PRICE_AND_STOCK_TIMEOUT

Retrying...

Attempt 2/3

Price text found: ₹18,568
Stock found: 200 units available

SCRAPE SUCCESSFUL
```

---

# API Endpoints

## Backend Status

```text
GET /
```

Returns a basic backend-running message.

```text
GET /health
```

Returns backend health information.

---

## Search Store

```text
GET /api/store/search?q=<query>
```

Searches the INE store catalogue by partial or full product name.

---

## Get Tracked Products

```text
GET /api/products
```

Returns all tracked products together with their latest successful price and stock data.

---

## Track New Product

```text
POST /api/products
```

Adds a product to tracking and starts an initial scrape.

---

## Enable / Disable Product

```text
PATCH /api/products/:id
```

Updates whether a product is actively tracked.

---

## Price History

```text
GET /api/products/:id/history
```

Returns successful historical price and stock records.

---

## Scrape Log

```text
GET /api/products/:id/logs
```

Returns all stored scrape attempts for the selected product.

---

## CSV Export

```text
GET /api/products/:id/export
```

Downloads the scrape history as a CSV file.

---

## Scheduled Scrape

```text
GET /api/scrape/cron
```

Requires:

```text
x-cron-secret
```

Possible responses:

```text
202 Accepted
401 Unauthorized
409 Conflict
```

---

# Database

The application uses two primary Supabase tables.

## tracked_products

Stores products selected for tracking.

Important fields include:

```text
id
store_product_id
product_name
product_url
selected_option
active
created_at
```

---

## scrape_history

Stores individual scrape attempts.

Important fields include:

```text
id
tracked_product_id
store_product_id
product_name
selected_option
price
stock
outcome
attempt_number
attempted_at
error / error_message
```

Failed scrape attempts use empty price and stock values.

---

# Deployment

## Frontend – Vercel

Live frontend:

```text
https://ine-price-tracker-sable.vercel.app
```

Configuration:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

Production backend variable:

```env
VITE_API_URL=https://ine-price-tracker-9rss.onrender.com
```

---

## Backend – Render

Live backend:

```text
https://ine-price-tracker-9rss.onrender.com
```

Configuration:

```text
Root Directory: backend
Start Command: npm start
```

Playwright Chromium is installed during deployment.

Production uses:

```env
PLAYWRIGHT_BROWSERS_PATH=0
```

The required backend environment variables are configured in Render.

---

## Database – Supabase

Supabase PostgreSQL stores:

```text
tracked_products
scrape_history
```

Supabase provides persistent storage for tracked products and scrape history.

---

# Scheduler – cron-job.org

The production cron job is configured to call:

```text
https://ine-price-tracker-9rss.onrender.com/api/scrape/cron
```

Method:

```text
GET
```

Schedule:

```text
Every 2 hours
```

Required header:

```text
x-cron-secret: <CRON_SECRET>
```

The scheduler receives a `202 Accepted` response when the backend successfully accepts the scraping job.

Because scraping runs asynchronously, individual products may still succeed, retry, or fail after the cron request has been accepted.

---

# Security

- `.env` is excluded from Git
- Supabase server credentials are never exposed in frontend code
- `CRON_SECRET` protects the scheduled scraper endpoint
- Production secrets are stored using deployment environment variables
- Failed scrape attempts never store guessed price or stock values
- Secret values are not included in the public README

---

# Design Decisions

## Playwright

Playwright was used because the INE product page includes dynamic JavaScript behaviour and asynchronously loaded price and stock information.

Although Playwright consumes more resources than lightweight HTTP parsing, it provides more reliable interaction with the dynamic page.

---

## External Scheduler

cron-job.org was selected instead of an internal Node.js timer because Render free-tier instances may sleep when inactive.

This ensures scheduled requests can still be triggered externally every two hours.

---

## Sequential Scraping

Tracked products are processed sequentially.

This reduces simultaneous load on the mock store and makes retry behaviour easier to manage.

The trade-off is that a complete scrape cycle can take longer than fully parallel scraping.

---

## Latest Successful Value

The dashboard displays the latest successful price and stock.

If a later scrape fails, the previous valid value is preserved.

The failure is still shown in the Scrape Log.

This avoids replacing valid data with empty or incorrect information.

---

# AI Usage

AI tools were used to assist with:

- debugging
- code implementation guidance
- error analysis
- frontend development
- deployment troubleshooting
- scraper reliability improvements
- documentation

Generated suggestions were tested against the actual INE mock store and corrected where necessary.

### Initial Issue

An early AI-assisted approach assumed that products could be discovered directly from rendered homepage links.

This approach failed because the catalogue is loaded dynamically.

### Correction

The mock store's actual network requests were inspected.

This revealed the real paginated catalogue endpoint:

```text
/api/v2/listings?page=<page>&limit=20
```

The search implementation was redesigned around this endpoint.

Another issue occurred when too many catalogue pages were requested aggressively, producing temporary `503` responses.

The implementation was improved using:

- smaller request batches
- delays
- retries
- backoff
- catalogue caching

This made product search more reliable.

---

# Known Behaviour

- Newly tracked products may temporarily display `Awaiting price data`
- The first catalogue search may take longer than later searches
- The INE mock store can return temporary `429`, `503`, or slow responses
- A cron job returning `202 Accepted` means the job was accepted, not that every product necessarily succeeded
- Individual products can succeed, retry, or fail within the same scheduled run
- Failed attempts do not overwrite the latest valid price
- Failed and retried attempts remain visible in the Scrape Log
- Render may take additional time to respond after sleeping

---

# Author

**Utkarsh Bhardwaj**

GitHub:

https://github.com/Utkarsh2365
