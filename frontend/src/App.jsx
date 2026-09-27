import { useEffect, useState } from "react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://ine-price-tracker-9rss.onrender.com");

function App() {
  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =====================================================
  // SEARCH / ADD
  // =====================================================

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResults, setSearchResults] =
    useState([]);

  const [searching, setSearching] =
    useState(false);

  const [
    searchPerformed,
    setSearchPerformed,
  ] = useState(false);

  const [
    selectedStoreProduct,
    setSelectedStoreProduct,
  ] = useState(null);

  const [
    selectedOption,
    setSelectedOption,
  ] = useState("");

  const [
    addingProduct,
    setAddingProduct,
  ] = useState(false);

  const [
    addMessage,
    setAddMessage,
  ] = useState("");

  // =====================================================
  // HISTORY
  // =====================================================

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);

  const [history, setHistory] =
    useState([]);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  // =====================================================
  // SCRAPE LOG
  // =====================================================

  const [
    selectedLogProduct,
    setSelectedLogProduct,
  ] = useState(null);

  const [
    scrapeLogs,
    setScrapeLogs,
  ] = useState([]);

  const [
    logLoading,
    setLogLoading,
  ] = useState(false);

  // =====================================================
  // FETCH PRODUCTS
  // =====================================================

  const fetchProducts = async (
    showLoader = false
  ) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const response = await fetch(
        `${API_URL}/api/products`
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message ||
            "Unable to load products"
        );
      }

      setProducts(data.products || []);

      setError("");

      return data.products || [];
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load tracked products."
      );

      return [];
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProducts(true);
  }, []);

  // =====================================================
  // SEARCH STORE
  // =====================================================

  const searchStore = async (event) => {
    event.preventDefault();

    const query =
      searchQuery.trim();

    if (query.length < 2) {
      setAddMessage(
        "Enter at least 2 characters to search."
      );

      return;
    }

    try {
      setSearching(true);

      setSearchPerformed(true);

      setSearchResults([]);

      setSelectedStoreProduct(null);

      setSelectedOption("");

      setAddMessage("");

      const response = await fetch(
        `${API_URL}/api/store/search?q=${encodeURIComponent(
          query
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to search the INE Store"
        );
      }

      setSearchResults(
        data.products || []
      );

      if (
        !data.products ||
        data.products.length === 0
      ) {
        setAddMessage(
          `No products found for "${query}".`
        );
      }
    } catch (err) {
      console.error(err);

      setAddMessage(err.message);
    } finally {
      setSearching(false);
    }
  };

  // =====================================================
  // SELECT SEARCH RESULT
  // =====================================================

  const selectStoreProduct =
    (product) => {
      setSelectedStoreProduct(
        product
      );

      setAddMessage("");

      if (
        Array.isArray(
          product.options
        ) &&
        product.options.length > 0
      ) {
        setSelectedOption(
          product.options[0].label
        );
      } else {
        setSelectedOption("");
      }
    };

  // =====================================================
  // ADD PRODUCT
  // =====================================================

  const addProduct = async () => {
    if (!selectedStoreProduct) {
      setAddMessage(
        "Select a product first."
      );

      return;
    }

    if (!selectedOption) {
      setAddMessage(
        "Select a product option."
      );

      return;
    }

    try {
      setAddingProduct(true);

      setAddMessage(
        "Adding product..."
      );

      const response = await fetch(
        `${API_URL}/api/products`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            storeProductId:
              selectedStoreProduct
                .storeProductId,

            productName:
              selectedStoreProduct
                .productName,

            productUrl:
              selectedStoreProduct
                .productUrl,

            selectedOption,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to track product"
        );
      }

      setAddMessage(
        "Product added. Initial scrape started."
      );

      await fetchProducts();

      if (data.product?.id) {
        waitForInitialScrape(
          data.product.id
        );
      }

      setSearchQuery("");

      setSearchResults([]);

      setSearchPerformed(false);

      setSelectedStoreProduct(null);

      setSelectedOption("");

      setTimeout(() => {
        setShowAddForm(false);

        setAddMessage("");
      }, 1800);
    } catch (err) {
      console.error(err);

      setAddMessage(err.message);
    } finally {
      setAddingProduct(false);
    }
  };

  // =====================================================
  // INITIAL SCRAPE POLLING
  // =====================================================

  const waitForInitialScrape = async (
    productId
  ) => {
    const maxChecks = 30;

    for (
      let check = 1;
      check <= maxChecks;
      check++
    ) {
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            10000
          )
      );

      const latestProducts =
        await fetchProducts();

      const trackedProduct =
        latestProducts.find(
          (product) =>
            product.id === productId
        );

      if (
        trackedProduct &&
        trackedProduct.latestPrice !==
          null &&
        trackedProduct.latestPrice !==
          undefined
      ) {
        return;
      }
    }
  };

  // =====================================================
  // VIEW PRICE HISTORY
  // =====================================================

  const viewHistory = async (
    product
  ) => {
    try {
      setSelectedLogProduct(null);

      setSelectedProduct(product);

      setHistoryLoading(true);

      const response = await fetch(
        `${API_URL}/api/products/${product.id}/history`
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message
        );
      }

      const formattedHistory = (
        data.history || []
      )
        .filter(
          (item) =>
            item.price !== null &&
            item.price !== undefined
        )
        .map((item) => ({
          price:
            Number(item.price),

          stock:
            item.stock,

          attemptedAt:
            item.attemptedAt,

          shortDate:
            new Date(
              item.attemptedAt
            ).toLocaleDateString(
              "en-IN",
              {
                day: "numeric",
                month: "short",
              }
            ),

          fullDate:
            new Date(
              item.attemptedAt
            ).toLocaleString(
              "en-IN"
            ),
        }))
        .filter((item) =>
          Number.isFinite(
            item.price
          )
        )
        .sort(
          (a, b) =>
            new Date(
              a.attemptedAt
            ) -
            new Date(
              b.attemptedAt
            )
        );

      setHistory(
        formattedHistory
      );
    } catch (err) {
      console.error(err);

      alert(
        "Unable to load price history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // =====================================================
  // VIEW SCRAPE LOG
  // =====================================================

  const viewScrapeLog = async (
    product
  ) => {
    try {
      setSelectedProduct(null);

      setSelectedLogProduct(
        product
      );

      setLogLoading(true);

      setScrapeLogs([]);

      const response = await fetch(
        `${API_URL}/api/products/${product.id}/logs`
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message
        );
      }

      setScrapeLogs(
        data.logs || []
      );
    } catch (err) {
      console.error(err);

      alert(
        "Unable to load scrape log."
      );
    } finally {
      setLogLoading(false);
    }
  };

  // =====================================================
  // ENABLE / DISABLE
  // =====================================================

  const toggleTracking = async (
    product
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/api/products/${product.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            active:
              !product.active,
          }),
        }
      );

      const data =
        await response.json();

      if (!data.success) {
        throw new Error(
          data.message
        );
      }

      await fetchProducts();
    } catch (err) {
      console.error(err);

      alert(
        "Unable to update tracking."
      );
    }
  };

  // =====================================================
  // CSV
  // =====================================================

  const downloadCsv = (
    productId
  ) => {
    window.open(
      `${API_URL}/api/products/${productId}/export`,
      "_blank"
    );
  };

  // =====================================================
  // PRICE FORMAT
  // =====================================================

  const formatPrice = (price) => {
    if (
      price === null ||
      price === undefined
    ) {
      return "—";
    }

    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",

        currency: "INR",

        maximumFractionDigits: 0,
      }
    ).format(price);
  };

  // =====================================================
  // OUTCOME TEXT
  // =====================================================

  const normalizeOutcome = (
    outcome
  ) =>
    String(outcome || "unknown")
      .trim()
      .toLowerCase();

  // =====================================================
  // HISTORY STATS
  // =====================================================

  const historyStats =
    history.length > 0
      ? {
          latest:
            history[
              history.length - 1
            ].price,

          lowest:
            Math.min(
              ...history.map(
                (item) =>
                  item.price
              )
            ),

          highest:
            Math.max(
              ...history.map(
                (item) =>
                  item.price
              )
            ),

          records:
            history.length,
        }
      : null;

  // =====================================================
  // PAGE LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="status-screen">
        <div className="loader" />

        <p>
          Loading tracked
          products...
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* HEADER */}

      <header className="header">
        <div>
          <span className="header-label">
            PRODUCT MONITORING
          </span>

          <h1>
            INE Price Tracker
          </h1>

          <p>
            Automated product price
            and stock monitoring
          </p>
        </div>

        <div className="header-actions">
          <button
            className="add-product-button"
            onClick={() => {
              setShowAddForm(
                !showAddForm
              );

              setAddMessage("");
            }}
          >
            + Track Product
          </button>

          <button
            className="refresh-button"
            onClick={() =>
              fetchProducts()
            }
          >
            Refresh Data
          </button>
        </div>
      </header>

      {/* SEARCH / TRACK */}

      {showAddForm && (
        <section className="add-product-section">
          <div className="add-product-header">
            <div>
              <span className="section-label">
                INE STORE SEARCH
              </span>

              <h2>
                Find & Track Product
              </h2>

              <p>
                Search by partial or
                full product name,
                select the product,
                and choose the option
                you want to track.
              </p>

              <a
                className="store-link"
                href="https://demo.inelabteamdev.com"
                target="_blank"
                rel="noreferrer"
              >
                Open INE Mock Store ↗
              </a>
            </div>

            <button
              className="form-close-button"
              type="button"
              onClick={() =>
                setShowAddForm(
                  false
                )
              }
            >
              ×
            </button>
          </div>

          <form
            className="store-search-form"
            onSubmit={searchStore}
          >
            <div className="search-input-wrap">
              <label>
                Search product name
              </label>

              <input
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Example: spin, camera, console..."
              />
            </div>

            <button
              className="search-button"
              disabled={searching}
            >
              {searching
                ? "Searching..."
                : "Search Store"}
            </button>
          </form>

          {searching && (
            <div className="search-loading">
              <div className="mini-loader" />

              <span>
                Searching INE Store...
              </span>
            </div>
          )}

          {!searching &&
            searchPerformed &&
            searchResults.length > 0 && (
              <div className="search-results">
                <div className="results-header">
                  <strong>
                    Search Results
                  </strong>

                  <span>
                    {
                      searchResults.length
                    }{" "}
                    found
                  </span>
                </div>

                <div className="results-list">
                  {searchResults.map(
                    (product) => (
                      <button
                        key={
                          product.storeProductId
                        }
                        type="button"
                        className={
                          selectedStoreProduct
                            ?.storeProductId ===
                          product.storeProductId
                            ? "search-result selected"
                            : "search-result"
                        }
                        onClick={() =>
                          selectStoreProduct(
                            product
                          )
                        }
                      >
                        <div className="result-info">
                          <strong>
                            {
                              product.productName
                            }
                          </strong>

                          <span>
                            {
                              product.brand
                            }

                            {product.category
                              ? ` • ${product.category}`
                              : ""}
                          </span>

                          {product.sku && (
                            <small>
                              SKU:{" "}
                              {
                                product.sku
                              }
                            </small>
                          )}
                        </div>

                        <span className="select-result-text">
                          {selectedStoreProduct
                            ?.storeProductId ===
                          product.storeProductId
                            ? "Selected ✓"
                            : "Select"}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

          {selectedStoreProduct && (
            <div className="selected-store-product">
              <div className="selected-product-info">
                <span className="selected-label">
                  SELECTED PRODUCT
                </span>

                <h3>
                  {
                    selectedStoreProduct.productName
                  }
                </h3>

                <p>
                  {
                    selectedStoreProduct.brand
                  }

                  {selectedStoreProduct.category
                    ? ` • ${selectedStoreProduct.category}`
                    : ""}
                </p>
              </div>

              <div className="option-select-group">
                <label>
                  Select Option
                </label>

                {selectedStoreProduct
                  .options?.length >
                0 ? (
                  <select
                    value={
                      selectedOption
                    }
                    onChange={(event) =>
                      setSelectedOption(
                        event.target.value
                      )
                    }
                  >
                    {selectedStoreProduct.options.map(
                      (option) => (
                        <option
                          key={
                            option.id
                          }
                          value={
                            option.label
                          }
                        >
                          {
                            option.label
                          }
                        </option>
                      )
                    )}
                  </select>
                ) : (
                  <span className="no-options">
                    No options
                    available.
                  </span>
                )}
              </div>

              <button
                className="start-tracking-button"
                type="button"
                disabled={
                  addingProduct ||
                  !selectedOption
                }
                onClick={addProduct}
              >
                {addingProduct
                  ? "Starting..."
                  : "Start Tracking"}
              </button>
            </div>
          )}

          {addMessage && (
            <div className="add-message">
              {addMessage}
            </div>
          )}
        </section>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <section className="summary">
        <div className="summary-card">
          <span>
            Tracked Products
          </span>

          <strong>
            {products.length}
          </strong>
        </div>

        <div className="summary-card">
          <span>
            Active Tracking
          </span>

          <strong>
            {
              products.filter(
                (product) =>
                  product.active
              ).length
            }
          </strong>
        </div>

        <div className="summary-card">
          <span>
            Inactive
          </span>

          <strong>
            {
              products.filter(
                (product) =>
                  !product.active
              ).length
            }
          </strong>
        </div>
      </section>

      {/* PRODUCT CARDS */}

      <section className="product-grid">
        {products.map((product) => (
          <article
            className="product-card"
            key={product.id}
          >
            <div className="product-top">
              <div>
                <h2>
                  {product.productName}
                </h2>

                <span className="option">
                  Option:{" "}
                  {product.selectedOption}
                </span>
              </div>

              <span
                className={
                  product.active
                    ? "badge active"
                    : "badge inactive"
                }
              >
                {product.active
                  ? "Active"
                  : "Inactive"}
              </span>
            </div>

            <div className="product-details">
              {product.latestPrice ===
              null ? (
                <div className="initial-scrape-state">
                  <div className="mini-loader" />

                  <strong>
                    Awaiting price
                    data...
                  </strong>

                  <span>
                    The product will be
                    retried automatically.
                  </span>
                </div>
              ) : (
                <>
                  <div className="price">
                    {formatPrice(
                      product.latestPrice
                    )}
                  </div>

                  <div className="stock">
                    {product.latestStock ||
                      "Stock unavailable"}
                  </div>
                </>
              )}
            </div>

            <div className="updated">
              Last updated:{" "}

              {product.lastScrapedAt
                ? new Date(
                    product.lastScrapedAt
                  ).toLocaleString(
                    "en-IN"
                  )
                : "Awaiting first successful scrape"}
            </div>

            <div className="actions">
              <button
                className="primary-action"
                disabled={
                  product.latestPrice ===
                  null
                }
                onClick={() =>
                  viewHistory(
                    product
                  )
                }
              >
                View History
              </button>

              <button
                className="log-action"
                onClick={() =>
                  viewScrapeLog(
                    product
                  )
                }
              >
                Scrape Log
              </button>

              <button
                disabled={
                  !product.lastScrapedAt
                }
                onClick={() =>
                  downloadCsv(
                    product.id
                  )
                }
              >
                Export CSV
              </button>

              <button
                onClick={() =>
                  toggleTracking(
                    product
                  )
                }
              >
                {product.active
                  ? "Disable"
                  : "Enable"}
              </button>

              <a
                href={product.productUrl}
                target="_blank"
                rel="noreferrer"
              >
                View Product
              </a>
            </div>
          </article>
        ))}
      </section>

      {/* ==============================================
          SCRAPE LOG
      ============================================== */}

      {selectedLogProduct && (
        <section className="log-section">
          <div className="log-top">
            <div>
              <span className="section-label">
                SCRAPE ACTIVITY
              </span>

              <h2>
                Scrape Log
              </h2>

              <p>
                {
                  selectedLogProduct.productName
                }{" "}
                —{" "}
                {
                  selectedLogProduct.selectedOption
                }
              </p>
            </div>

            <button
              className="close-history-btn"
              onClick={() => {
                setSelectedLogProduct(
                  null
                );

                setScrapeLogs([]);
              }}
            >
              Close
            </button>
          </div>

          {logLoading ? (
            <div className="log-empty">
              Loading scrape
              activity...
            </div>
          ) : scrapeLogs.length ===
            0 ? (
            <div className="log-empty">
              No scrape attempts
              recorded yet.
            </div>
          ) : (
            <>
              <div className="log-summary">
                <div>
                  <span>
                    Total Attempts
                  </span>

                  <strong>
                    {
                      scrapeLogs.length
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Successful
                  </span>

                  <strong>
                    {
                      scrapeLogs.filter(
                        (log) =>
                          normalizeOutcome(
                            log.outcome
                          ) ===
                          "success"
                      ).length
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Failed / Retried
                  </span>

                  <strong>
                    {
                      scrapeLogs.filter(
                        (log) =>
                          normalizeOutcome(
                            log.outcome
                          ) !==
                          "success"
                      ).length
                    }
                  </strong>
                </div>
              </div>

              <div className="log-table-wrap">
                <table className="log-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>

                      <th>
                        Attempt
                      </th>

                      <th>
                        Outcome
                      </th>

                      <th>
                        Price
                      </th>

                      <th>
                        Stock
                      </th>

                      <th>
                        Error
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {scrapeLogs.map(
                      (log) => {
                        const outcome =
                          normalizeOutcome(
                            log.outcome
                          );

                        return (
                          <tr
                            key={log.id}
                          >
                            <td>
                              {log.attemptedAt
                                ? new Date(
                                    log.attemptedAt
                                  ).toLocaleString(
                                    "en-IN"
                                  )
                                : "—"}
                            </td>

                            <td>
                              {log.attempt ??
                                "—"}
                            </td>

                            <td>
                              <span
                                className={`outcome-badge ${outcome}`}
                              >
                                {log.outcome ||
                                  "Unknown"}
                              </span>
                            </td>

                            <td>
                              {formatPrice(
                                log.price
                              )}
                            </td>

                            <td>
                              {log.stock ||
                                "—"}
                            </td>

                            <td className="error-cell">
                              {log.error ||
                                "—"}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* PRICE HISTORY */}

      {selectedProduct && (
        <section className="history-section">
          <div className="history-top">
            <div>
              <span className="section-label">
                PRICE ANALYTICS
              </span>

              <h2>
                Price History
              </h2>

              <p className="history-subtitle">
                {
                  selectedProduct.productName
                }{" "}
                —{" "}
                {
                  selectedProduct.selectedOption
                }
              </p>
            </div>

            <button
              className="close-history-btn"
              onClick={() => {
                setSelectedProduct(
                  null
                );

                setHistory([]);
              }}
            >
              Close
            </button>
          </div>

          {historyLoading ? (
            <div className="history-loading">
              Loading price
              history...
            </div>
          ) : history.length === 0 ? (
            <div className="history-empty">
              No price history
              available.
            </div>
          ) : (
            <>
              <div className="history-stats">
                <div className="history-stat-card">
                  <span>
                    Latest Price
                  </span>

                  <strong>
                    {formatPrice(
                      historyStats.latest
                    )}
                  </strong>
                </div>

                <div className="history-stat-card">
                  <span>
                    Lowest Price
                  </span>

                  <strong>
                    {formatPrice(
                      historyStats.lowest
                    )}
                  </strong>
                </div>

                <div className="history-stat-card">
                  <span>
                    Highest Price
                  </span>

                  <strong>
                    {formatPrice(
                      historyStats.highest
                    )}
                  </strong>
                </div>

                <div className="history-stat-card">
                  <span>
                    Price Records
                  </span>

                  <strong>
                    {
                      historyStats.records
                    }
                  </strong>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-heading">
                  <div>
                    <h3>
                      Price Movement
                    </h3>

                    <p>
                      Historical successful
                      scrape prices in INR
                    </p>
                  </div>

                  <span className="chart-record-count">
                    {history.length}{" "}
                    records
                  </span>
                </div>

                <div className="chart-container">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <AreaChart
                      data={history}
                      margin={{
                        top: 15,
                        right: 20,
                        left: 10,
                        bottom: 10,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="priceFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#2563eb"
                            stopOpacity={
                              0.22
                            }
                          />

                          <stop
                            offset="95%"
                            stopColor="#2563eb"
                            stopOpacity={
                              0.01
                            }
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#e2e8f0"
                      />

                      <XAxis
                        dataKey="shortDate"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        minTickGap={25}
                      />

                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={70}
                        tickFormatter={(
                          value
                        ) =>
                          `₹${Math.round(
                            value /
                              1000
                          )}k`
                        }
                      />

                      <Tooltip
                        formatter={(
                          value
                        ) => [
                          formatPrice(
                            value
                          ),
                          "Price",
                        ]}
                        labelFormatter={(
                          _,
                          payload
                        ) =>
                          payload?.[0]
                            ?.payload
                            ?.fullDate ||
                          ""
                        }
                      />

                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#2563eb"
                        strokeWidth={3}
                        fill="url(#priceFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default App;