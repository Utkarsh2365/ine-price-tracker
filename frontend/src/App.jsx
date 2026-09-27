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
  "https://ine-price-tracker-9rss.onrender.com";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [history, setHistory] =
    useState([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [newProduct, setNewProduct] =
    useState({
      productUrl: "",
      productName: "",
      selectedOption: "",
    });

  const [addingProduct, setAddingProduct] =
    useState(false);

  const [addMessage, setAddMessage] =
    useState("");

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  const fetchProducts = async (
    showLoader = false
  ) => {

    try {

      if (showLoader) {
        setLoading(true);
      }

      const response =
        await fetch(
          `${API_URL}/api/products`
        );

      const data =
        await response.json();


      if (!data.success) {

        throw new Error(
          data.message ||
            "Failed to load products"
        );

      }


      setProducts(
        data.products
      );

      setError("");


      return data.products;

    } catch (err) {

      console.error(err);

      setError(
        "Failed to load tracked products."
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
  // WAIT FOR INITIAL SCRAPE
  // =====================================================

  const waitForInitialScrape =
    async (productId) => {

      const maxChecks = 9;

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
              product.id ===
              productId
          );


        if (
          trackedProduct &&
          trackedProduct.latestPrice !==
            null
        ) {

          setAddMessage(
            "Initial price loaded successfully."
          );

          return;
        }


        setAddMessage(
          `Fetching initial price... (${check}/${maxChecks})`
        );

      }


      setAddMessage(
        "Product is being tracked. Price will appear after the next successful scrape."
      );

    };


  // =====================================================
  // ADD PRODUCT
  // =====================================================

  const addProduct =
    async (event) => {

      event.preventDefault();


      try {

        setAddingProduct(true);

        setAddMessage(
          "Adding product..."
        );


        const url =
          newProduct.productUrl.trim();


        const match =
          url.match(
            /\/item\/(\d+)/
          );


        if (!match) {

          throw new Error(
            "Please enter a valid INE product URL."
          );

        }


        const storeProductId =
          match[1];


        const response =
          await fetch(
            `${API_URL}/api/products`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({

                  storeProductId,

                  productName:
                    newProduct.productName.trim(),

                  productUrl:
                    url,

                  selectedOption:
                    newProduct.selectedOption.trim(),

                }),
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
              "Failed to add product"
          );

        }


        setAddMessage(
          "Product added. Fetching initial price..."
        );


        const addedProductId =
          data.product.id;


        setNewProduct({
          productUrl: "",
          productName: "",
          selectedOption: "",
        });


        await fetchProducts();


        // Start polling without blocking UI
        waitForInitialScrape(
          addedProductId
        );


        // Keep form visible briefly
        setTimeout(() => {

          setShowAddForm(
            false
          );

        }, 2000);


      } catch (err) {

        console.error(err);

        setAddMessage(
          err.message
        );

      } finally {

        setAddingProduct(
          false
        );

      }

    };


  // =====================================================
  // LOAD HISTORY
  // =====================================================

  const viewHistory =
    async (product) => {

      try {

        setSelectedProduct(
          product
        );

        setHistoryLoading(
          true
        );


        const response =
          await fetch(
            `${API_URL}/api/products/${product.id}/history`
          );


        const data =
          await response.json();


        if (!data.success) {

          throw new Error(
            data.message
          );

        }


        const formattedHistory =
          data.history

            .map((item) => ({

              price:
                Number(
                  item.price
                ),

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
                    day:
                      "numeric",

                    month:
                      "short",
                  }
                ),

              fullDate:
                new Date(
                  item.attemptedAt
                ).toLocaleString(
                  "en-IN"
                ),

            }))

            .filter(
              (item) =>
                !Number.isNaN(
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

        setHistoryLoading(
          false
        );

      }

    };


  // =====================================================
  // ENABLE / DISABLE
  // =====================================================

  const toggleTracking =
    async (product) => {

      try {

        const response =
          await fetch(
            `${API_URL}/api/products/${product.id}`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
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

  const downloadCsv =
    (productId) => {

      window.open(
        `${API_URL}/api/products/${productId}/export`,
        "_blank"
      );

    };


  // =====================================================
  // FORMAT PRICE
  // =====================================================

  const formatPrice =
    (price) => {

      if (
        price === null ||
        price === undefined
      ) {

        return "No price available";

      }


      return new Intl.NumberFormat(
        "en-IN",
        {
          style: "currency",

          currency: "INR",

          maximumFractionDigits:
            0,
        }
      ).format(price);

    };


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


  if (loading) {

    return (

      <div className="status-screen">

        <div className="loader"></div>

        <p>
          Loading tracked products...
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


      {/* ADD PRODUCT */}

      {showAddForm && (

        <section className="add-product-section">

          <div className="add-product-header">

            <div>

              <span className="section-label">
                PRODUCT TRACKING
              </span>

              <h2>
                Track New Product
              </h2>

              <p>
                Add an INE Store
                product and variant
                to monitor.
              </p>


              <a
                className="store-link"
                href="https://demo.inelabteamdev.com"
                target="_blank"
                rel="noreferrer"
              >
                Browse INE Store products ↗
              </a>

            </div>


            <button
              type="button"
              className="form-close-button"
              onClick={() => {

                setShowAddForm(
                  false
                );

                setAddMessage("");

              }}
            >
              ×
            </button>

          </div>


          <form
            className="add-product-form"
            onSubmit={
              addProduct
            }
          >

            <div className="form-group">

              <label>
                Product URL
              </label>

              <input
                type="url"
                placeholder="https://demo.inelabteamdev.com/item/2032"
                value={
                  newProduct.productUrl
                }
                onChange={(
                  event
                ) =>
                  setNewProduct({
                    ...newProduct,

                    productUrl:
                      event.target.value,
                  })
                }
                required
              />

            </div>


            <div className="form-group">

              <label>
                Product Name
              </label>

              <input
                type="text"
                placeholder="Product name"
                value={
                  newProduct.productName
                }
                onChange={(
                  event
                ) =>
                  setNewProduct({
                    ...newProduct,

                    productName:
                      event.target.value,
                  })
                }
                required
              />

            </div>


            <div className="form-group">

              <label>
                Selected Option
              </label>

              <input
                type="text"
                placeholder="Regular"
                value={
                  newProduct.selectedOption
                }
                onChange={(
                  event
                ) =>
                  setNewProduct({
                    ...newProduct,

                    selectedOption:
                      event.target.value,
                  })
                }
                required
              />

            </div>


            <div className="form-footer">

              {addMessage && (

                <span className="add-message">
                  {addMessage}
                </span>

              )}


              <button
                type="submit"
                className="submit-product-button"
                disabled={
                  addingProduct
                }
              >

                {addingProduct
                  ? "Adding..."
                  : "Start Tracking"}

              </button>

            </div>

          </form>

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


      {/* PRODUCTS */}

      <section className="product-grid">

        {products.map(
          (product) => (

            <article
              className="product-card"
              key={
                product.id
              }
            >

              <div className="product-top">

                <div>

                  <h2>
                    {
                      product.productName
                    }
                  </h2>

                  <span className="option">

                    Option:{" "}

                    {
                      product.selectedOption
                    }

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

                    <div className="mini-loader"></div>

                    <strong>
                      Fetching initial price...
                    </strong>

                    <span>
                      The scraper is processing this product.
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
                  : "Awaiting first scrape"}

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
                  disabled={
                    product.lastScrapedAt ===
                    null
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
                  href={
                    product.productUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  View Product
                </a>

              </div>

            </article>

          )
        )}

      </section>


      {/* HISTORY */}

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
                }

                {" — "}

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
              Loading price history...
            </div>

          ) : history.length === 0 ? (

            <div className="history-empty">
              No price history available.
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
                      Historical scraped price in INR
                    </p>

                  </div>


                  <span className="chart-record-count">

                    {
                      history.length
                    }{" "}
                    records

                  </span>

                </div>


                <div className="chart-container">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <AreaChart
                      data={
                        history
                      }
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
                        vertical={
                          false
                        }
                        stroke="#e2e8f0"
                      />


                      <XAxis
                        dataKey="shortDate"
                        tickLine={
                          false
                        }
                        axisLine={
                          false
                        }
                      />


                      <YAxis
                        tickLine={
                          false
                        }
                        axisLine={
                          false
                        }
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
                        strokeWidth={
                          3
                        }
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