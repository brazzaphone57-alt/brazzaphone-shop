/* ============================================================
   BRAZZAPHONE – netlify/functions/list-blobs.js

   Debug temporaire : liste toutes les clés présentes dans un store Netlify Blobs.

   GET /.netlify/functions/list-blobs?name=product-images

   Rappel : stocke par défaut "product-images" si name absent.
   ============================================================ */

const { getStore } = require("@netlify/blobs");

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,OPTIONS"
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ""
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const qs = event.queryStringParameters || {};
    const storeName = qs.name || "product-images";

    const store = getStore({
      name: storeName,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    // @netlify/blobs: list API peut varier selon version.
    // On essaye store.list() en supposant qu'elle renvoie une liste de clés.
    const listing = await store.list();

    // Normalize: supporte { keys: [...] } / [...] / { items: [...] }
    let keys = [];
    if (Array.isArray(listing)) {
      keys = listing;
    } else if (listing && Array.isArray(listing.keys)) {
      keys = listing.keys;
    } else if (listing && Array.isArray(listing.items)) {
      keys = listing.items.map((it) => (typeof it === "string" ? it : it.key)).filter(Boolean);
    } else if (listing && listing.data && Array.isArray(listing.data)) {
      keys = listing.data.map((it) => (typeof it === "string" ? it : it.key)).filter(Boolean);
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      },
      body: JSON.stringify({ store: storeName, count: keys.length, keys, rawType: typeof listing })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      },
      body: JSON.stringify({
        error: e.message || String(e)
      })
    };
  }
};

