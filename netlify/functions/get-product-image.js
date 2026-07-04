/* ============================================================
   BRAZZAPHONE – netlify/functions/get-product-image.js

   Serve images stored in Netlify Blobs (product-images store).

   Usage:
     GET /.netlify/functions/get-product-image?key=<blobKey>

   Where key is the deterministic value used by upload-product-images.js:
     `${productId}_${index}`

   Returns binary with correct Content-Type.
   ============================================================ */

const { getStore } = require("@netlify/blobs");

const IMAGES_STORE = "product-images";

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
    const key = qs.key;

    if (!key) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders()
        },
        body: JSON.stringify({ error: "Missing key" })
      };
    }

    const store = getStore({
      name: IMAGES_STORE,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    console.log("[get-product-image] store ready", {
      name: IMAGES_STORE,
      key,
      siteID: process.env.NETLIFY_SITE_ID,
      tokenSet: Boolean(process.env.NETLIFY_AUTH_TOKEN)
    });


    // @netlify/blobs getStore.get(key) can return raw Buffer or { data, contentType } depending on version.
    const blob = await store.get(key);

    if (!blob) {
      return {
        statusCode: 404,
        headers: {
          ...corsHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Not found" })
      };
    }

    // Normalize different possible return shapes.
    let buffer;
    let contentType = "application/octet-stream";

    if (Buffer.isBuffer(blob)) {
      buffer = blob;
    } else if (blob && typeof blob === "object") {
      if (Buffer.isBuffer(blob.data)) {
        buffer = blob.data;
      } else if (Buffer.isBuffer(blob.buffer)) {
        buffer = blob.buffer;
      }

      contentType = blob.contentType || blob.mimeType || contentType;
    }

    if (!buffer) {
      // If blobs SDK returns string/base64, try to recover.
      if (typeof blob === "string") {
        // Not expected; treat as 404
        return {
          statusCode: 404,
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ error: "Unexpected blob payload" })
        };
      }

      return {
        statusCode: 500,
        headers: {
          ...corsHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Could not read blob" })
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      },
      body: JSON.stringify({ error: e.message || String(e) })
    };
  }
};

