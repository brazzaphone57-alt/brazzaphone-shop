/* ============================================================
   BRAZZAPHONE – netlify/functions/migrate-products-images.js
   Migration (one-shot) : images base64 dans JSON → images blobs fichiers binaire
   
   But : réduire drastiquement la taille du payload du catalogue.
   ============================================================ */

const { getStore } = require("@netlify/blobs");

const PRODUCTS_STORE = "products";
const PRODUCTS_KEY = "bp-products";

// Blob bucket (files)
const IMAGES_STORE = "product-images";

function normalizeProducts(value) {
  if (!Array.isArray(value)) return [];
  return value;
}

function blobFromDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const b64 = match[2];
  const binStr = Buffer.from(b64, "base64");
  return { mime, buffer: binStr };
}

function isProbablyUrl(s) {
  return typeof s === "string" && !s.startsWith("data:");
}

function safeId(productId, idx) {
  return String(productId) + "_" + String(idx);
}

// NOTE: @netlify/blobs file API can vary by version.
// This function assumes getStore supports storing binary via store.set(key, Buffer, { contentType }).
// If store.set signature differs, adjust.
async function storeImageAsUrl({ store, key, dataUrl }) {
  const parsed = blobFromDataUrl(dataUrl);
  if (!parsed) return dataUrl;

  // Store as binary
  await store.set(
    key,
    parsed.buffer,
    { contentType: parsed.mime }
  );

  // Public-ish URL pattern for Blobs is usually /.netlify/blobs/<storeName>/<key>
  // This works when blobs are exposed by Netlify.
  // We keep it as simple deterministic path.
  return `/.netlify/blobs/${IMAGES_STORE}/${encodeURIComponent(key)}`;
}

exports.handler = async (event) => {
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

  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const productsStore = getStore({
      name: PRODUCTS_STORE,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    const imagesStore = getStore({
      name: IMAGES_STORE,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    const raw = await productsStore.get(PRODUCTS_KEY);
    const products = raw ? normalizeProducts(JSON.parse(raw)) : [];

    let migrated = 0;
    let skippedAlreadyUrls = 0;

    for (const product of products) {
      if (!product || !product.id) continue;

      const imageFields = [];
      if (Array.isArray(product.images)) imageFields.push({ type: "images", arr: product.images });
      if (product.image) imageFields.push({ type: "image", arr: [product.image] });

      // Migrate product.images
      if (Array.isArray(product.images) && product.images.length) {
        for (let i = 0; i < product.images.length; i++) {
          const src = product.images[i];
          if (!src || typeof src !== "string") continue;
          if (isProbablyUrl(src)) {
            skippedAlreadyUrls++;
            continue;
          }

          const key = `p${safeId(product.id, i)}`;
          const url = await storeImageAsUrl({ store: imagesStore, key, dataUrl: src });
          product.images[i] = url;
          migrated++;
        }
      }

      // Migrate product.image (single)
      if (product.image && typeof product.image === "string") {
        if (!isProbablyUrl(product.image)) {
          // map to images[0] key if possible
          const key = `p${safeId(product.id, 0)}`;
          const url = await storeImageAsUrl({ store: imagesStore, key, dataUrl: product.image });
          product.image = url;
          migrated++;
        }
      }

      // Ensure fallback consistency
      if ((!product.image || typeof product.image !== "string") && Array.isArray(product.images) && product.images[0]) {
        product.image = product.images[0];
      }
    }

    await productsStore.set(PRODUCTS_KEY, JSON.stringify(products));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ success: true, migrated, skippedAlreadyUrls, products: products.length })
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

