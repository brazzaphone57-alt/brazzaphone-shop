/* Product details page logic */

(function () {
  const params = new URLSearchParams(window.location.search);
  const idRaw = params.get('id');
  const productId = idRaw ? Number(idRaw) : NaN;

  const nameEl = document.getElementById('productName');
  const priceEl = document.getElementById('productPrice');
  const oldPriceEl = document.getElementById('productOldPrice');
  const descEl = document.getElementById('productDescription');
  const categoryEl = document.getElementById('productCategory');
  const idEl = document.getElementById('productId');
  const badgeRow = document.getElementById('badgeRow');
  const breadcrumbs = document.getElementById('breadcrumbs');

  const addBtn = document.getElementById('addToCartBtn');
  const waBtn = document.getElementById('whatsappOrderBtn');
  const shareBtn = document.getElementById('shareProductBtn');


  const galleryMain = document.getElementById('galleryMain');
  const galleryThumbs = document.getElementById('galleryThumbs');

  const similarGrid = document.getElementById('similarGrid');
  const similarCount = document.getElementById('similarCount');

  function getProducts() {
    // script.js met window.PRODUCTS à disposition (et la remplace depuis bpAdminProducts)
    return Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
  }

  function badgeHTML(product) {
    if (!product.badge) return '';

    const badgeText = product.badge;
    const cls = product.category === 'reconditionne'
      ? 'green'
      : product.category === 'accessoire'
        ? 'blue'
        : '';

    // Note : dans style.css on a des badges pour les cartes. Ici on fait une variante simple.
    return `<span class="product-badge ${cls}">${badgeText}</span>`;
  }

  function parseImages(product) {
    // Support flexible :
    // - product.images = [ ... ] (option)
    // - product.image = string (actuel)
    if (Array.isArray(product.images) && product.images.length) return product.images;
    if (product.image) return [product.image];
    return [];
  }

  function setGallery(images) {
    if (!images.length) {
      galleryMain.innerHTML = `<div class="img-skeleton"></div>`;
      galleryThumbs.innerHTML = '';
      return;
    }

    const mainImg = images[0];
    galleryMain.innerHTML = `
      <img src="${mainImg}" alt="${escapeHtml(productSafeName())}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22><rect fill=%22%23eee%22 width=%22300%22 height=%22300%22/><text fill=%22%23aaa%22 font-size=%2240%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>📱</text></svg>'" />
    `;

    galleryThumbs.innerHTML = images.map((src, idx) => {
      const active = idx === 0 ? 'active' : '';
      return `
        <button class="thumb-btn ${active}" type="button" data-src="${src}">
          <img src="${src}" alt="Vignette ${idx + 1}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%2272%22><rect fill=%22%23eee%22 width=%22200%22 height=%2272%22/><text fill=%22%23aaa%22 font-size=%2224%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>📷</text></svg>'" />
        </button>
      `;
    }).join('');

    // Click thumbnails
    galleryThumbs.querySelectorAll('.thumb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        galleryThumbs.querySelectorAll('.thumb-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const src = btn.getAttribute('data-src');
        galleryMain.innerHTML = `<img src="${src}" alt="${escapeHtml(productSafeName())}" />`;
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }

  let currentProduct = null;
  function productSafeName() {
    return currentProduct?.name || 'Produit';
  }

  function categoryLabel(cat) {
    return { neuf: '📱 Neuf', reconditionne: '♻️ Reconditionné', accessoire: '🎧 Accessoire' }[cat] || cat || '—';
  }

  function fmtPrice(n) {
    // Dépendance minimale : ne pas compter sur window.fmt
    try {
      return Number(n).toLocaleString('fr-FR') + ' FCFA';
    } catch {
      return String(n) + ' FCFA';
    }
  }

  function similarProducts(product) {
    const all = getProducts();
    const sameCat = all.filter(p => p.id !== product.id && p.category === product.category);
    if (sameCat.length >= 4) return sameCat.slice(0, 8);

    // fallback: par proximité de prix
    const byPrice = all
      .filter(p => p.id !== product.id)
      .slice()
      .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price));

    const merged = [...sameCat, ...byPrice.filter(p => !sameCat.some(x => x.id === p.id))];
    return merged.slice(0, 8);
  }

  function renderSimilar(list) {
    similarGrid.innerHTML = '';
    similarCount.textContent = list.length ? `${list.length} produit(s)` : '';

    if (!list.length) {
      similarGrid.innerHTML = `<div style="color:var(--gray);padding:18px 0;">Aucun produit similaire.</div>`;
      return;
    }

    similarGrid.innerHTML = list.map(p => {
      const oldPriceHTML = p.oldPrice ? `<span class="product-old-price">${fmtPrice(p.oldPrice)}</span>` : '';
      const badgeClass = p.category === 'reconditionne'
        ? 'badge-reconditionne'
        : p.category === 'accessoire'
          ? 'badge-accessoire'
          : '';
      const badgeHTML = p.badge ? `<span class="product-badge ${badgeClass}">${p.badge}</span>` : '';

      // On redirige vers la page produit
      return `
        <div class="product-card" role="button" tabindex="0" onclick="location.href='product.html?id=${p.id}'">
          ${badgeHTML}
          <div class="product-img-wrap">
            <img src="${(Array.isArray(p.images) && p.images.length ? p.images[0] : p.image) || ''}" alt="${escapeHtml(p.name)}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23eee%22 width=%22200%22 height=%22200%22/><text fill=%22%23aaa%22 font-size=%2240%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>📱</text></svg>'" />
          </div>
          <div class="product-info">
            <span class="product-category-tag">${categoryLabel(p.category)}</span>
            <p class="product-name">${escapeHtml(p.name)}</p>
            ${oldPriceHTML}
            <p class="product-price">${fmtPrice(p.price)}</p>
          </div>
          <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${p.id})">🛒 Ajouter au panier</button>
        </div>
      `;
    }).join('');
  }

  function setWhatsApp(product) {
    const qty = 1;
    const url = `product.html?id=${product.id}`;
    const lines = [
      `🛒 Produit : ${product.name}`,
      `💰 Prix : ${fmtPrice(product.price)}`,
      product.oldPrice ? `↘️ Ancien prix : ${fmtPrice(product.oldPrice)}` : '',
      `📦 Quantité : ${qty}`,
      `📍 Livraison : Brazzaville – Centre-ville`,
      `🔗 Lien : ${url}`
    ].filter(Boolean);


    const msg = encodeURIComponent(
      `Bonjour, je souhaite commander :\n\n${lines.join('\n')}\n\nMerci.`
    );

    // Utilise WHATSAPP_NUMBER de script.js si présent
    const waNumber = (typeof window.WHATSAPP_NUMBER !== 'undefined') ? window.WHATSAPP_NUMBER : '242xxxxxxxx';
    const clean = String(waNumber).replaceAll(/\s+/g, '');

    waBtn.href = `https://wa.me/${clean}?text=${msg}`;
  }

  function setPage(product) {
    // setShare button (partage WhatsApp)
    if (shareBtn) {
      shareBtn.onclick = () => {
        const url = `product.html?id=${product.id}`;
        const msg = encodeURIComponent(
          `Bonjour, voici un produit que je vous recommande :\n\n` +
          `🛒 ${product.name}\n` +
          `💰 Prix : ${fmtPrice(product.price)}\n` +
          `🔗 Lien : ${url}`
        );

        const waNumber = (typeof window.WHATSAPP_NUMBER !== 'undefined') ? window.WHATSAPP_NUMBER : '242xxxxxxxx';
        const clean = String(waNumber).replaceAll(/\s+/g, '');
        window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
      };
    }

    currentProduct = product;

    // breadcrumbs
    breadcrumbs.innerHTML = `
      <a href="index.html">Accueil</a> / <span>${escapeHtml(product.name)}</span>
    `;

    nameEl.textContent = product.name || 'Produit';
    priceEl.textContent = fmtPrice(product.price);
    if (product.oldPrice) {
      oldPriceEl.style.display = 'inline';
      oldPriceEl.textContent = fmtPrice(product.oldPrice);
    } else {
      oldPriceEl.style.display = 'none';
    }

    // Description: si champ product.description existe, sinon fallback
    descEl.textContent = product.description || `Découvrez ${product.name} — un produit idéal pour vos besoins quotidiens.`;

    categoryEl.textContent = categoryLabel(product.category);
    idEl.textContent = product.id;

    badgeRow.innerHTML = badgeHTML(product);

    const images = parseImages(product);
    setGallery(images);

    // SPÉCIFICATIONS
    renderSpecs(product);

    // AVIS CLIENTS
    renderReviews(product);

    // STOCK
    renderStock(product);

    addBtn.onclick = () => {
      if (typeof window.addToCart === 'function') {
        window.addToCart(product.id);
      } else {
        console.warn('addToCart not found');
      }
    };

    setWhatsApp(product);
  }

  function renderSpecs(product) {
    const specsGrid = document.getElementById('specsGrid');
    if (!specsGrid) return;

    if (!product.specs || Object.keys(product.specs).length === 0) {
      specsGrid.innerHTML = '<div style="color:var(--gray);padding:12px;">Aucune spécification disponible.</div>';
      return;
    }

    specsGrid.innerHTML = Object.entries(product.specs).map(([key, value]) => `
      <div class="spec-item">
        <div class="spec-label">${escapeHtml(key)}</div>
        <div class="spec-value">${escapeHtml(value)}</div>
      </div>
    `).join('');
  }

  function renderReviews(product) {
    const reviewsSummary = document.getElementById('reviewsSummary');
    const reviewsList = document.getElementById('reviewsList');

    if (!reviewsSummary || !reviewsList) return;

    // Summary
    const rating = product.rating || 0;
    const reviewCount = (product.reviews_list && product.reviews_list.length) || product.reviews || 0;

    reviewsSummary.innerHTML = `
      <div class="rating-box">
        <div class="rating-stars">${renderStarsFull(rating)}</div>
        <div class="rating-number">${rating.toFixed(1)} / 5</div>
      </div>
      <div style="color: var(--gray); font-size: 0.9rem;">
        <strong>${reviewCount}</strong> avis client${reviewCount > 1 ? 's' : ''}
      </div>
    `;

    // Reviews List
    const reviews = (product.reviews_list && Array.isArray(product.reviews_list)) ? product.reviews_list : [];

    if (reviews.length === 0) {
      reviewsList.innerHTML = '<div class="no-reviews">Aucun avis pour le moment. Soyez le premier à commenter!</div>';
      return;
    }

    reviewsList.innerHTML = reviews.map(review => `
      <div class="review-item">
        <div class="review-header">
          <span class="review-author">${escapeHtml(review.author || 'Anonyme')}</span>
          <span class="review-rating">${renderStarsFull(review.rating || 0)}</span>
        </div>
        <div class="review-text">${escapeHtml(review.text || '')}</div>
      </div>
    `).join('');
  }

  function renderStock(product) {
    const stockInfo = document.getElementById('stockInfo');
    if (!stockInfo) return;

    const stock = product.stock !== undefined ? product.stock : 0;
    let stockClass = 'available';
    let stockText = `✅ En stock (${stock} unité${stock > 1 ? 's' : ''})`;

    if (stock === 0) {
      stockClass = 'unavailable';
      stockText = '❌ Rupture de stock';
    } else if (stock < 5) {
      stockClass = 'low';
      stockText = `⚠️ Stock limité (${stock} unité${stock > 1 ? 's' : ''})`;
    }

    stockInfo.innerHTML = `<div class="stock-badge ${stockClass}">${stockText}</div>`;
  }

  function renderStarsFull(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let stars = '⭐'.repeat(fullStars);
    if (hasHalf) stars += '⯨';
    return stars;
  }

  // ===== TRACKING DES VUES PRODUIT =====
  function trackProductView(product) {
    // 1) Compteur personnalisé (Netlify Blobs)
    fetch('/.netlify/functions/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: product.id })
    }).catch(e => console.warn('Erreur tracking vue :', e));

    // 2) Événement GA4 via GTM
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'view_item',
      ecommerce: {
        items: [{
          item_id: product.id,
          item_name: product.name,
          price: product.price
        }]
      }
    });
  }

  function init() {
    // Solution robuste : charger le catalogue directement sur la page produit.
    const loadAndRender = async () => {
      if (!Number.isFinite(productId)) {
        document.body.innerHTML = `<div class="container" style="padding:40px 16px;color:#444;">
          <h1 style="font-family:Poppins,sans-serif;color:#1A1A1A;">Produit introuvable</h1>
          <p>Vérifiez l’ID dans l’URL (ex: product.html?id=3).</p>
          <a href="index.html" style="color:#FF6A00;font-weight:800;">← Retour à la boutique</a>
        </div>`;
        return;
      }

      let list = [];
      try {
        const res = await fetch('/.netlify/functions/save-products', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          list = Array.isArray(data) ? data : [];
        }
      } catch (e) {
        console.warn('Erreur chargement via function save-products:', e);
      }


      // Fallback : si script.js a déjà chargé quelque chose, on complète.
      const fallback = getProducts();
      if (list.length === 0 && Array.isArray(fallback) && fallback.length) {
        list = fallback;
      }

      currentProduct = list.find(p => p.id === productId) || null;

      if (!currentProduct) {
        document.body.innerHTML = `<div class="container" style="padding:40px 16px;color:#444;">
          <h1 style="font-family:Poppins,sans-serif;color:#1A1A1A;">Produit introuvable</h1>
          <p>Le produit n’existe pas dans le catalogue.</p>
          <p style="color:var(--gray);margin-top:8px;">ID demandé : <strong>${productId}</strong></p>
          <a href="index.html" style="color:#FF6A00;font-weight:800;">← Retour à la boutique</a>
        </div>`;
        return;
      }

      setPage(currentProduct);

      const sims = similarProducts(currentProduct);
      renderSimilar(sims);

      if (typeof window.updateCartUI === 'function') window.updateCartUI();

      // Enregistrer la vue une fois le produit confirmé trouvé
      trackProductView(currentProduct);
    };

    loadAndRender();
  }



  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
