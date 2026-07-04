/* ============================================================
   BRAZZAPHONE – netlify/functions/upload-product-images.js
   Upload images base64 (dataURL) -> Netlify Blobs files

   POST body:
     {
       productId: number|string,
       images: [dataUrl1, dataUrl2, ...]
     }

   Returns:
     { success: true, urls: [url1, url2, ...] }
   ============================================================ */

const { getStore } = require("@netlify/blobs");

const IMAGES_STORE = "product-images";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };
}

function isDataUrl(s) {
  return typeof s === "string" && s.startsWith("data:");
}

function blobFromDataUrl(dataUrl) {
  // data:<mime>;base64,<b64>
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const b64 = match[2];
  const buffer = Buffer.from(b64, "base64");
  return { mime, buffer };
}

function safeId(productId, idx) {
  return `${String(productId)}_${String(idx)}`;
}

async function storeImageAsUrl({ store, key, dataUrl }) {
  const parsed = blobFromDataUrl(dataUrl);
  if (!parsed) return null;

  // Store as binary
  await store.set(key, parsed.buffer, { contentType: parsed.mime });

  // Deterministic URL pattern used by your migration function
  return `/.netlify/blobs/${IMAGES_STORE}/${encodeURIComponent(key)}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
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
    const body = event.body ? JSON.parse(event.body) : {};
    const productId = body.productId;
    const images = Array.isArray(body.images) ? body.images : [];

    if (!productId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders()
        },
        body: JSON.stringify({ error: "Missing productId" })
      };
    }

    const store = getStore({
      name: IMAGES_STORE,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    const urls = [];
    const errors = [];

    for (let i = 0; i < images.length; i++) {
      const dataUrl = images[i];
      if (!isDataUrl(dataUrl)) {
        errors.push({ index: i, error: "Not a dataURL" });
        urls.push(null);
        continue;
      }

      const key = safeId(productId, i);
      const url = await storeImageAsUrl({ store, key, dataUrl });

      if (!url) {
        errors.push({ index: i, error: "Could not store image" });
        urls.push(null);
        continue;
      }

      urls.push(url);
    }

    const ok = errors.length === 0;

    return {
      statusCode: ok ? 200 : 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      },
      body: JSON.stringify({ success: ok, urls, errors })
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

