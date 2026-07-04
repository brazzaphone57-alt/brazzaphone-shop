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
  if (!parsed) {
    console.log("[upload-product-images] blobFromDataUrl returned null", { key });
    return null;
  }

  try {
    console.log("[upload-product-images] before store.set", {
      key,
      contentType: parsed?.mime,
      bytes: parsed?.buffer?.length
    });

    // Store as binary
    await store.set(key, parsed.buffer, { contentType: parsed.mime });

    console.log("[upload-product-images] after store.set success", { key });
  } catch (e) {
    console.error("[upload-product-images] store.set failed", {
      key,
      mime: parsed?.mime,
      error: e?.message || String(e)
    });
    throw e;
  }

  // URL de lecture via fonction serverless (pas via route statique blobs)
  const url = `/.netlify/functions/get-product-image?key=${encodeURIComponent(key)}`;
  console.log("[upload-product-images] built image URL", { key, url });
  return url;

}




exports.handler = async (event) => {
  console.log("[upload-product-images] handler start", {
    httpMethod: event?.httpMethod,
    hasBody: Boolean(event?.body),
    IMAGES_STORE
  });

  if (event.httpMethod === "OPTIONS") {
    console.log("[upload-product-images] OPTIONS request");
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    console.log("[upload-product-images] non-POST request", { httpMethod: event?.httpMethod });
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
    console.log("[upload-product-images] parsing body...");
    const body = event.body ? JSON.parse(event.body) : {};
    const productId = body.productId;
    const images = Array.isArray(body.images) ? body.images : [];

    console.log("[upload-product-images] input", {
      productId,
      imagesCount: images.length,
      IMAGES_STORE
    });

    if (!productId) {
      console.log("[upload-product-images] missing productId");
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders()
        },
        body: JSON.stringify({ error: "Missing productId" })
      };
    }

    console.log("[upload-product-images] creating blobs store client...");
    const store = getStore({
      name: IMAGES_STORE,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    console.log("[upload-product-images] store ready", {
      name: IMAGES_STORE,
      siteID: process.env.NETLIFY_SITE_ID,
      tokenSet: Boolean(process.env.NETLIFY_AUTH_TOKEN)
    });


    const urls = [];
    const errors = [];

    for (let i = 0; i < images.length; i++) {
      const dataUrl = images[i];
      console.log("[upload-product-images] image loop", { i, key: safeId(productId, i), isDataUrl: isDataUrl(dataUrl) });

      if (!isDataUrl(dataUrl)) {
        errors.push({ index: i, error: "Not a dataURL" });
        urls.push(null);
        continue;
      }

      const key = safeId(productId, i);
      const url = await storeImageAsUrl({ store, key, dataUrl });

      if (!url) {
        console.log("[upload-product-images] storeImageAsUrl returned null", { i, key });
        errors.push({ index: i, error: "Could not store image" });
        urls.push(null);
        continue;
      }

      console.log("[upload-product-images] stored image ok", { i, key, url });
      urls.push(url);
    }

    const ok = errors.length === 0;
    console.log("[upload-product-images] returning response", { success: ok, urls, errors });

    return {
      statusCode: ok ? 200 : 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      },
      body: JSON.stringify({ success: ok, urls, errors })
    };
  } catch (e) {
    console.error("[upload-product-images] handler catch", {
      error: e?.message || String(e)
    });
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



