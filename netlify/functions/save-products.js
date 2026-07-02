/* ============================================================
   BRAZZAPHONE – netlify/functions/save-products.js
   Stockage des produits via @netlify/blobs (getStore)
   - POST: sauvegarde la liste complète (tableau)
   - GET : retourne la liste complète
   ============================================================ */

const { getStore } = require("@netlify/blobs");

const PRODUCTS_KEY = "bp-products";

function normalizeProducts(value) {
  if (!Array.isArray(value)) return [];
  return value;
}

exports.handler = async (event) => {
  const store = getStore({
    name: "products",
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_AUTH_TOKEN
  });

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
      },
      body: ""
    };
  }

  try {
    if (event.httpMethod === "POST") {
      const body = event.body ? JSON.parse(event.body) : null;
      const products = normalizeProducts(body);

      await store.set(PRODUCTS_KEY, JSON.stringify(products));

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ success: true, count: products.length })
      };
    }

    if (event.httpMethod === "GET") {
      const raw = await store.get(PRODUCTS_KEY);
      const products = raw ? normalizeProducts(JSON.parse(raw)) : [];

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(products)
      };
    }

    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: e.message || String(e) })
    };
  }
};