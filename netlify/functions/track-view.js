/* ============================================================
   BRAZZAPHONE – netlify/functions/track-view.js
   Compteur de vues par produit via @netlify/blobs
   - POST { id }   : incrémente le compteur du produit "id"
   - GET           : retourne { "1": 12, "2": 5, ... }
   ============================================================ */

const { getStore } = require("@netlify/blobs");

const VIEWS_KEY = "bp-views";

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  };

  const store = getStore({
    name: "product-views",
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_AUTH_TOKEN
  });

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  try {
    if (event.httpMethod === "POST") {
      const body = event.body ? JSON.parse(event.body) : null;
      const id = body && body.id;

      if (id === undefined || id === null) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
          body: JSON.stringify({ error: "id manquant" })
        };
      }

      const raw = await store.get(VIEWS_KEY);
      const views = raw ? JSON.parse(raw) : {};

      views[id] = (views[id] || 0) + 1;

      await store.set(VIEWS_KEY, JSON.stringify(views));

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
        body: JSON.stringify({ success: true, id, count: views[id] })
      };
    }

    if (event.httpMethod === "GET") {
      const raw = await store.get(VIEWS_KEY);
      const views = raw ? JSON.parse(raw) : {};

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          "Cache-Control": "no-store"
        },
        body: JSON.stringify(views)
      };
    }

    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({ error: e.message || String(e) })
    };
  }
};
