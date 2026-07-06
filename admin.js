/* ============================================================
   BRAZZAPHONE – admin.js
   ============================================================ */

/* ===== AUTH ===== */
const ADMIN_USER = "admin";
const ADMIN_PASS = "brazzaphone2025";
let sessionTimeout = null;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function doLogin() {
  const u = document.getElementById("loginUser").value.trim();
  const p = document.getElementById("loginPass").value.trim();
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("dashboard").style.display = "flex";
    document.getElementById("loginError").textContent = "";
    loadData();
    renderAdminProducts();
    renderStats();
    renderMiniStats();
    updateSidebarBadges();
    showSection("products");
    resetSessionTimeout();
    showAdminToast("👋 Bienvenue admin !");
  } else {
    document.getElementById("loginError").textContent = "❌ Identifiants incorrects.";
  }
}

function resetSessionTimeout() {
  if (sessionTimeout) clearTimeout(sessionTimeout);
  sessionTimeout = setTimeout(() => {
    showAdminToast("⏰ Session expirée - reconnexion en cours...");
    setTimeout(doLogout, 2000);
  }, SESSION_TIMEOUT_MS);
}

function togglePassword() {
  const passInput = document.getElementById("loginPass");
  const btn = document.querySelector(".toggle-pass");
  if (!passInput) return;
  const isHidden = passInput.type === "password";
  passInput.type = isHidden ? "text" : "password";
  if (btn) btn.textContent = isHidden ? "🙈" : "👁️";
}

function doLogout() {
  if (sessionTimeout) clearTimeout(sessionTimeout);
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
  showAdminToast("👋 Vous êtes déconnecté.");
}

/* ===== Mobile admin menu ===== */
function toggleAdminMenu() {
  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (!sidebar || !overlay) return;
  const isOpen = sidebar.classList.contains("open");
  sidebar.classList.toggle("open", !isOpen);
  overlay.classList.toggle("open", !isOpen);
}

// Événement Enter sur login
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && document.getElementById("loginScreen")?.style.display !== "none") {
    doLogin();
  }
});

// Réinitialiser timeout sur interaction utilisateur
document.addEventListener("click", () => {
  if (document.getElementById("dashboard").style.display === "flex") {
    resetSessionTimeout();
  }
});

/* ===== DONNÉES ===== */
const DEFAULT_PRODUCTS = [];

let products = [];

function loadData() {
  const saved = localStorage.getItem("bpAdminProducts");
  products = saved ? JSON.parse(saved) : [...DEFAULT_PRODUCTS];
}

/* ===== SAUVEGARDE — écrit dans products.json via Netlify Function ===== */
async function saveData() {
  // 1. Backup local immédiat
  localStorage.setItem("bpAdminProducts", JSON.stringify(products));

  // 2. Publier sur le serveur → products.json lu par la boutique
  try {
    const res = await fetch("/.netlify/functions/save-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products)
    });

    if (res.status === 200) {
      showAdminToast("✅ Boutique mise à jour automatiquement !");
      return;
    }

    const err = await res.text().catch(() => "Erreur serveur");
    throw new Error(err);

  } catch (e) {
    console.error("save-products error:", e);
    // D'après la demande : ne pas télécharger automatiquement.
    showAdminToast("⚠️ Sync auto échoué, réessaye");
  }
}


/* ===== NAVIGATION ===== */
function showSection(name) {
  document.querySelectorAll(".section").forEach(s => (s.style.display = "none"));
  const target = document.getElementById(`section-${name}`);
  if (target) target.style.display = "block";
  document.querySelectorAll(".sidebar-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".sidebar-btn").forEach(b => {
    if (b.getAttribute("onclick") && b.getAttribute("onclick").includes(`'${name}'`)) {
      b.classList.add("active");
    }
  });
  
  // Mettre à jour le titre du header
  const sectionTitles = {
    products: "📦 Gestion des Produits",
    orders: "🛒 Gestion des Commandes",
    stats: "📊 Statistiques Catalogue"
  };
  const titleEl = document.getElementById("sectionTitle");
  if (titleEl) titleEl.textContent = sectionTitles[name] || name;
  
  // Rafraîchir les données spécifiques à la section
  if (name === "orders" && window.bpOrdersAdmin) {
    window.bpOrdersAdmin.render();
  } else if (name === "stats") {
    renderStats();
  }
}

/* Mettre à jour l'heure du header toutes les 30 secondes */
function updateSessionTime() {
  const timeEl = document.getElementById("sessionTime");
  if (!timeEl) return;
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  timeEl.textContent = `${hours}:${mins}`;
}

/* ===== BADGES SIDEBAR ===== */
function updateSidebarBadges() {
  // Compter les produits
  const productCount = products.length;
  const productCountEl = document.getElementById("sidebarProductCount");
  if (productCountEl) productCountEl.textContent = productCount;

  // Compter les commandes en attente et revenus totaux
  const orders = (window.bpOrders && typeof window.bpOrders.getAll === 'function') 
    ? window.bpOrders.getAll() 
    : JSON.parse(localStorage.getItem('bpOrders') || '[]');
  
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Mettre à jour les compteurs
  const pendingEl = document.getElementById("sidebarPendingCount");
  if (pendingEl) {
    pendingEl.textContent = pendingCount;
    pendingEl.style.color = pendingCount > 0 ? '#ff9800' : '#4caf50';
  }

  const revenueEl = document.getElementById("sidebarRevenue");
  if (revenueEl) {
    revenueEl.textContent = (totalRevenue || 0).toLocaleString('fr-FR') + ' FCFA';
  }

  // Mettre à jour les badges des boutons sidebar
  const productsBadge = document.getElementById("productsBadge");
  if (productsBadge) {
    if (productCount > 0) {
      productsBadge.textContent = productCount;
      productsBadge.style.display = "inline-flex";
    } else {
      productsBadge.style.display = "none";
    }
  }

  const ordersBadge = document.getElementById("ordersBadge");
  if (ordersBadge) {
    if (pendingCount > 0) {
      ordersBadge.textContent = pendingCount;
      ordersBadge.classList.add("pending");
      ordersBadge.style.display = "inline-flex";
    } else {
      ordersBadge.style.display = "none";
    }
  }
}

setInterval(updateSessionTime, 30000);
updateSessionTime();

/* Mettre à jour les badges toutes les 60 secondes */
setInterval(updateSidebarBadges, 60000);

/* ===== LISTE PRODUITS ===== */
function renderAdminProducts() {
  const search    = (document.getElementById("adminSearch")?.value || "").toLowerCase();
  const catFilter = document.getElementById("adminCatFilter")?.value || "all";

  let list = products;
  if (catFilter !== "all") list = list.filter(p => p.category === catFilter);
  if (search) list = list.filter(p => p.name.toLowerCase().includes(search));

  const tbody = document.getElementById("productsTableBody");
  if (!tbody) return;

  tbody.innerHTML = list.length === 0
    ? `<tr><td colspan="7" style="text-align:center;padding:32px;color:#aaa;">Aucun produit trouvé</td></tr>`
    : list.map(p => `
    <tr>
      <td><img src="${p.image}" alt="${p.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><rect fill=%22%23eee%22 width=%2248%22 height=%2248%22/><text fill=%22%23aaa%22 font-size=%2220%22 x=%2250%25%22 y=%2256%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>📱</text></svg>'" /></td>
      <td>
        <strong>${p.name}</strong>
        ${Number(p.stock) <= 2 ? `<span class="low-stock-badge" title="Stock faible : ${p.stock ?? 0} restant(s)">⚠️ Stock faible (${p.stock ?? 0})</span>` : ""}
      </td>
      <td><span class="cat-badge cat-${p.category}">${catLabel(p.category)}</span></td>
      <td class="price-cell">${fmt(p.price)}</td>
      <td class="old-price-cell">${p.oldPrice ? fmt(p.oldPrice) : "—"}</td>
      <td>${p.badge || "—"}</td>
      <td>
        <div class="action-btns">
          <button class="edit-btn" onclick="openProductModal(${p.id})">✏️ Modifier</button>
          <button class="del-btn"  onclick="deleteProduct(${p.id})">🗑 Supprimer</button>
        </div>
      </td>
    </tr>`).join("");

  renderMiniStats();
}

/* ===== MINI STATS ===== */
function renderMiniStats() {
  const total  = products.length;
  const neufs  = products.filter(p => p.category === "neuf").length;
  const recon  = products.filter(p => p.category === "reconditionne").length;
  const acc    = products.filter(p => p.category === "accessoire").length;
  const promos = products.filter(p => p.oldPrice).length;

  const el = document.getElementById("miniStats");
  if (!el) return;
  el.innerHTML = [
    ["📦 Total", total], ["📱 Neufs", neufs], ["♻️ Reconditionnés", recon],
    ["🎧 Accessoires", acc], ["🔥 Promos", promos]
  ].map(([label, val]) => `<div class="stat-chip">${label} : <strong>${val}</strong></div>`).join("");
}

/* ===== STATS PAGE ===== */
function renderStats() {
  const cats = { neuf: 0, reconditionne: 0, accessoire: 0 };
  let minPrice = Infinity, maxPrice = 0, totalVal = 0;
  products.forEach(p => {
    cats[p.category] = (cats[p.category] || 0) + 1;
    if (p.price < minPrice) minPrice = p.price;
    if (p.price > maxPrice) maxPrice = p.price;
    totalVal += p.price;
  });

  // Commandes
  const orders = (window.bpOrders && typeof window.bpOrders.getAll === 'function') 
    ? window.bpOrders.getAll() 
    : JSON.parse(localStorage.getItem('bpOrders') || '[]');
  
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

  const el = document.getElementById("statsGrid");
  if (!el) return;
  el.innerHTML = [
    ["📦 Total produits",    products.length],
    ["📱 Téléphones neufs",  cats.neuf],
    ["♻️ Reconditionnés",    cats.reconditionne],
    ["🎧 Accessoires",       cats.accessoire],
    ["🔥 En promotion",      products.filter(p => p.oldPrice).length],
    ["💰 Prix moyen",        fmt(Math.round(totalVal / (products.length || 1)))],
    ["📉 Prix le plus bas",  fmt(minPrice === Infinity ? 0 : minPrice)],
    ["📈 Prix le plus haut", fmt(maxPrice)],
    ["🛒 Total commandes",   totalOrders],
    ["💵 Chiffre d'affaires", fmt(totalRevenue)],
    ["⏳ Commandes en attente", pendingOrders],
    ["✅ Commandes livrées", deliveredOrders],
  ].map(([label, val]) => `
    <div class="stat-card">
      <div class="stat-value">${val}</div>
      <div class="stat-label">${label}</div>
    </div>`).join("");
}

/* ===== MODAL PRODUIT ===== */
const MAX_PRODUCT_IMAGES = 5;

let selectedImages = []; // dataURL[]
let selectedImagesMeta = []; // { originalSize, compressedSize } | null, même index que selectedImages
let dragSrcIndex = null; // index de l'image en cours de glisser-déposer
let formDirty = false; // true dès qu'un champ du formulaire produit est modifié

// Marque le formulaire comme modifié dès qu'on touche à un champ à l'intérieur du modal
document.addEventListener("input", e => {
  if (e.target && e.target.closest && e.target.closest("#productModal")) {
    formDirty = true;
  }
});
document.addEventListener("change", e => {
  if (e.target && e.target.closest && e.target.closest("#productModal")) {
    formDirty = true;
  }
});

function getExistingImagesForProduct(p) {
  if (!p) return [];
  if (Array.isArray(p.images) && p.images.length) return p.images;
  if (p.image) return [p.image];
  return [];
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function updateProductImagesHidden() {
  // Conserver image (champ string) pour compatibilité si d'autres parties l'utilisent.
  const hidden = document.getElementById("pImage");
  if (!hidden) return;
  hidden.value = selectedImages[0] || "";
}

function renderSelectedImagesPreview() {
  const wrap = document.getElementById("productImagesPreviewWrap");
  const list = document.getElementById("productImagesPreviewList");
  if (!wrap || !list) return;

  if (!selectedImages.length) {
    wrap.style.display = "none";
    list.innerHTML = "";
    updateProductImagesHidden();
    return;
  }

  wrap.style.display = "block";
  list.innerHTML = `
    <div class="image-preview-grid">
      ${selectedImages.map((src, idx) => {
        const safeIdx = idx;
        const meta = selectedImagesMeta[idx];
        const sizeLabel = meta
          ? `${formatFileSize(meta.originalSize)} → ${formatFileSize(meta.compressedSize)}`
          : "";
        return `
          <div class="preview-item" draggable="true" data-drag-index="${safeIdx}">
            ${idx === 0 ? `<span class="preview-main-badge">Principale</span>` : ""}
            <img src="${src}" alt="Aperçu ${idx + 1}" />
            ${sizeLabel ? `<div class="preview-size-label">${sizeLabel}</div>` : ""}
            <button
              type="button"
              class="btn-secondary image-remove remove-btn"
              data-index="${safeIdx}"
              aria-label="Retirer l’image ${idx + 1}"
            >
              ✕
            </button>
          </div>
        `;
      }).join("")}
    </div>
    ${selectedImages.length > 1 ? `<div class="preview-reorder-hint">↕️ Glissez une image pour changer l'ordre. La première devient la photo principale.</div>` : ""}
  `;

  updateProductImagesHidden();
}

function clearSelectedImages() {
  selectedImages = [];
  selectedImagesMeta = [];
  renderSelectedImagesPreview();
  const fileInput = document.getElementById("productImages");
  if (fileInput) fileInput.value = "";
}

/* ===== Glisser-déposer pour réorganiser les images du produit ===== */
document.addEventListener("dragstart", e => {
  const item = e.target && e.target.closest && e.target.closest(".preview-item");
  if (!item) return;
  dragSrcIndex = parseInt(item.getAttribute("data-drag-index"));
  e.dataTransfer.effectAllowed = "move";
  try { e.dataTransfer.setData("text/plain", String(dragSrcIndex)); } catch (err) {}
});

document.addEventListener("dragover", e => {
  const item = e.target && e.target.closest && e.target.closest(".preview-item");
  if (!item) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
});

document.addEventListener("drop", e => {
  const item = e.target && e.target.closest && e.target.closest(".preview-item");
  if (!item) return;
  e.preventDefault();
  const targetIndex = parseInt(item.getAttribute("data-drag-index"));
  if (dragSrcIndex === null || Number.isNaN(targetIndex) || dragSrcIndex === targetIndex) return;

  const [movedImg]  = selectedImages.splice(dragSrcIndex, 1);
  const [movedMeta] = selectedImagesMeta.splice(dragSrcIndex, 1);
  selectedImages.splice(targetIndex, 0, movedImg);
  selectedImagesMeta.splice(targetIndex, 0, movedMeta);

  dragSrcIndex = null;
  renderSelectedImagesPreview();
});

/**
 * Compresse et redimensionne une image avant de la stocker en base64.
 * Réduit fortement le poids (souvent 3-5 Mo -> 100-300 Ko) sans perte
 * visible pour un affichage e-commerce.
 * @param {File} file - Le fichier image original
 * @param {number} maxWidth - Largeur max en pixels (défaut 1000)
 * @param {number} quality - Qualité JPEG 0 à 1 (défaut 0.75)
 * @returns {Promise<string>} - dataURL JPEG compressé
 */
function compressImage(file, maxWidth = 1000, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => reject(new Error("Impossible de charger l'image"));
      img.src = event.target.result;
    };

    reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
    reader.readAsDataURL(file);
  });
}

(function initImageUpload() {
  const fileInput = document.getElementById("productImages");
  if (!fileInput) return;

  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files || []);
    if (!files.length) {
      clearSelectedImages();
      return;
    }

    // Limite à MAX_PRODUCT_IMAGES
    const remaining = Math.max(0, MAX_PRODUCT_IMAGES - selectedImages.length);
    const filesToRead = files.slice(0, remaining);

    if (!filesToRead.length) {
      showAdminToast(`⚠️ Maximum ${MAX_PRODUCT_IMAGES} images.`);
      fileInput.value = "";
      return;
    }

    try {
      showAdminToast("⏳ Compression des images...");
      for (const file of filesToRead) {
        if (file.size > 10 * 1024 * 1024) {
          showAdminToast("⚠️ Image trop lourde (max 10MB).");
          fileInput.value = "";
          continue;
        }
        const compressedDataUrl = await compressImage(file, 1000, 0.75);
        // Poids approximatif du base64 compressé (en octets)
        const compressedSize = Math.round((compressedDataUrl.length * 3) / 4);
        selectedImages.push(compressedDataUrl);
        selectedImagesMeta.push({ originalSize: file.size, compressedSize });
      }

      renderSelectedImagesPreview();
      showAdminToast("✅ Images compressées et prêtes !");
      // Reset input pour permettre re-sélection identique
      fileInput.value = "";
    } catch (e) {
      console.error(e);
      showAdminToast("⚠️ Erreur lecture images.");
    }
  });
})();


function openProductModal(id = null) {
  const modal = document.getElementById("productModal");
  document.getElementById("modalTitle").textContent = id ? "✏️ Modifier le produit" : "➕ Ajouter un produit";
  document.getElementById("editId").value = id || "";

  if (id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById("pName").value     = p.name;
    document.getElementById("pCategory").value = p.category;
    document.getElementById("pPrice").value    = p.price;
    document.getElementById("pOldPrice").value = p.oldPrice || "";
    document.getElementById("pBadge").value    = p.badge || "";
    document.getElementById("pStock").value    = p.stock || 0;
    document.getElementById("pDescription").value = p.description || "";

    // Images : support images[] (nouveau) + fallback image (ancien)
    selectedImages = getExistingImagesForProduct(p);
    selectedImagesMeta = selectedImages.map(() => null); // poids inconnu pour les images déjà enregistrées
    document.getElementById("pImage").value = selectedImages[0] || "";
    renderSelectedImagesPreview();

    // Charger les spécifications
    renderSpecRows(p.specs || {});

    // Charger les avis
    renderReviewRows(p.reviews_list || []);
  } else {
    ["pName", "pPrice", "pOldPrice", "pImage", "pDescription", "pStock"].forEach(elId => {
      const el = document.getElementById(elId);
      if (el) el.value = "";
    });
    document.getElementById("pCategory").value = "neuf";
    document.getElementById("pBadge").value    = "";

    clearSelectedImages();

    // Initialiser des lignes vides pour specs et avis
    document.getElementById("specsContainer").innerHTML = "";
    document.getElementById("reviewsContainer").innerHTML = "";
  }

  modal.classList.add("open");

  // Le formulaire vient d'être (ré)initialisé : on considère qu'il n'y a
  // pas encore de modification en attente. On attend la fin de la pile
  // d'exécution pour éviter que le remplissage ci-dessus ne déclenche le flag.
  setTimeout(() => { formDirty = false; }, 0);
}

function renderSpecRows(specs = {}) {
  const container = document.getElementById("specsContainer");
  container.innerHTML = "";
  Object.entries(specs).forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "spec-row";
    row.innerHTML = `
      <input type="text" placeholder="Clé (ex: Écran)" value="${escapeAttr(key)}" class="spec-key" />
      <input type="text" placeholder="Valeur (ex: 6.1 pouces)" value="${escapeAttr(value)}" class="spec-value" />
      <button type="button" onclick="this.parentElement.remove()">❌</button>
    `;
    container.appendChild(row);
  });
}

function renderReviewRows(reviews = []) {
  const container = document.getElementById("reviewsContainer");
  container.innerHTML = "";
  reviews.forEach(review => {
    const row = document.createElement("div");
    row.className = "review-row";
    row.innerHTML = `
      <input type="text" placeholder="Auteur" value="${escapeAttr(review.author || '')}" class="review-author" />
      <select class="review-rating">
        <option value="1" ${review.rating === 1 ? 'selected' : ''}>1 ⭐</option>
        <option value="2" ${review.rating === 2 ? 'selected' : ''}>2 ⭐</option>
        <option value="3" ${review.rating === 3 ? 'selected' : ''}>3 ⭐</option>
        <option value="4" ${review.rating === 4 ? 'selected' : ''}>4 ⭐</option>
        <option value="5" ${review.rating === 5 ? 'selected' : ''}>5 ⭐</option>
      </select>
      <textarea placeholder="Avis" class="review-text" rows="2">${escapeAttr(review.text || '')}</textarea>
      <button type="button" onclick="this.parentElement.remove()">❌</button>
    `;
    container.appendChild(row);
  });
}

function addSpecRow() {
  const container = document.getElementById("specsContainer");
  const row = document.createElement("div");
  row.className = "spec-row";
  row.innerHTML = `
    <input type="text" placeholder="Clé" class="spec-key" />
    <input type="text" placeholder="Valeur" class="spec-value" />
    <button type="button" onclick="this.parentElement.remove()">❌</button>
  `;
  container.appendChild(row);
}

function addReviewRow() {
  const container = document.getElementById("reviewsContainer");
  const row = document.createElement("div");
  row.className = "review-row";
  row.innerHTML = `
    <input type="text" placeholder="Auteur" class="review-author" />
    <select class="review-rating">
      <option value="5">5 ⭐</option>
      <option value="4">4 ⭐</option>
      <option value="3">3 ⭐</option>
      <option value="2">2 ⭐</option>
      <option value="1">1 ⭐</option>
    </select>
    <textarea placeholder="Avis" class="review-text" rows="2"></textarea>
    <button type="button" onclick="this.parentElement.remove()">❌</button>
  `;
  container.appendChild(row);
}

function escapeAttr(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function closeProductModal(force = false) {
  if (!force && formDirty) {
    const ok = confirm("⚠️ Vous avez des modifications non enregistrées. Fermer quand même ?");
    if (!ok) return;
  }
  formDirty = false;
  document.getElementById("productModal").classList.remove("open");
}

document.addEventListener("click", e => {
  const btn = e.target && e.target.closest && e.target.closest(".image-remove");
  if (!btn) return;

  // Si on clique un X individuel, on supprime l'image indexée.
  const idxRaw = btn.getAttribute("data-index");
  if (idxRaw !== null && idxRaw !== undefined) {
    const idx = parseInt(idxRaw);
    if (!Number.isNaN(idx)) {
      selectedImages = selectedImages.filter((_, i) => i !== idx);
      selectedImagesMeta = selectedImagesMeta.filter((_, i) => i !== idx);
      renderSelectedImagesPreview();
      const fileInput = document.getElementById("productImages");
      if (fileInput) fileInput.value = "";
    }
    return;
  }

  // Fallback: si un bouton sans index existe (ancien code), on efface tout.
  clearSelectedImages();
});

async function saveProduct() {

  const name     = document.getElementById("pName").value.trim();
  const category = document.getElementById("pCategory").value;
  const price    = parseInt(document.getElementById("pPrice").value);
  const oldPrice = parseInt(document.getElementById("pOldPrice").value) || null;
  const badge    = document.getElementById("pBadge").value || null;
  const stock    = parseInt(document.getElementById("pStock").value) || 0;
  const description = document.getElementById("pDescription").value.trim() || "";
  const editId   = parseInt(document.getElementById("editId").value) || null;

  // images : tableau source de vérité (peut être base64 dataURL)
  // Protection anti-données corrompues : ne pas enregistrer un champ image qui ressemble à un simple ID (ex: "7_0").
  // Attendu: soit dataURL, soit une URL blob Netlify: `/.netlify/blobs/product-images/...`, soit au moins un chemin valide (images/...).
  const selectedRaw = (selectedImages && selectedImages.length)
    ? selectedImages.slice(0, MAX_PRODUCT_IMAGES)
    : [((document.getElementById("pImage").value || "").trim() || "images/placeholder.jpg")];

  const isValidImageRef = (s) => {
    if (typeof s !== 'string') return false;
    const v = s.trim();
    if (!v) return false;
    if (v.startsWith('data:image/')) return true;
    if (v.startsWith('https://') || v.startsWith('http://')) return true;
    // chemins relatifs “classiques” (ancien placeholder)
    if (v.startsWith('images/') || v.startsWith('./images/') || v.startsWith('../images/')) return true;
    // on accepte aussi la forme serverless get-product-image
    if (v.startsWith('/.netlify/functions/get-product-image')) return true;
    return false;
  };


  const selected = selectedRaw.filter(isValidImageRef);


  // Validation

  if (!name || !price || stock < 0) {
    showAdminToast("⚠️ Vérifiez : Nom, Prix et Stock obligatoires !");
    return;
  }

  // Désactiver le bouton Enregistrer pour éviter les doubles clics / doublons
  // pendant une sauvegarde qui peut prendre du temps (upload images + réseau lent).
  const saveBtn = document.querySelector('[onclick="saveProduct()"]');
  const saveBtnOriginalText = saveBtn ? saveBtn.textContent : null;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "⏳ Enregistrement...";
  }

  try {
    // Récupérer les spécifications
    const specs = {};
    document.querySelectorAll(".spec-row").forEach(row => {
      const key = row.querySelector(".spec-key")?.value.trim();
      const value = row.querySelector(".spec-value")?.value.trim();
      if (key && value) specs[key] = value;
    });

    // Récupérer les avis
    const reviews_list = [];
    document.querySelectorAll(".review-row").forEach(row => {
      const author = row.querySelector(".review-author")?.value.trim();
      const rating = parseInt(row.querySelector(".review-rating")?.value || 5);
      const text = row.querySelector(".review-text")?.value.trim();
      if (author && text) {
        reviews_list.push({ author, rating, text });
      }
    });

    // Déterminer un id final AVANT upload (pour nommage des images)
    const finalId = editId || (products.length ? Math.max(...products.map(p => p.id)) + 1 : 1);

    // Upload images si ce sont des dataURLs
    let images = selected;
    // Si on a au moins 1 image mais qu'aucun dataURL n'est présent, on ne fait pas d'upload.
    // (Dans ce cas, `images` doit déjà être une vraie URL blob, sinon l'affichage sera invalide.)
    const needsUpload = Array.isArray(images) && images.some(x => typeof x === 'string' && x.startsWith('data:'));

    // Sécurité supplémentaire : si on a des références de type "<digits>_<digits>" qui ont fuit,
    // on force un fallback vers un vrai placeholder pour éviter de générer /.netlify/blobs/product-images/<id>.
    // (On protège aussi contre les chaînes "images/placeholder.jpg" si vide.)
    const isBadKeyLike = (s) => typeof s === 'string' && /^\d+_\d+$/.test(s.trim());
    if (Array.isArray(images)) {
      images = images.map(img => (isBadKeyLike(img) ? "images/placeholder.jpg" : img));
    }


    if (needsUpload) {
      // Debug (visible dans console) + toast pour confirmer que l'appel part.
      console.log("upload-product-images: starting", { finalId, count: images.length });
      showAdminToast("⏫ Upload des images...");

      try {
        const res = await fetch("/.netlify/functions/upload-product-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: finalId, images })
        });

        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload || payload.success !== true) {
          const msg = payload && payload.errors && payload.errors.length
            ? `⚠️ Upload image échoué : ${payload.errors[0].error}`
            : "⚠️ Upload image échoué.";
          showAdminToast(msg);
          console.error("upload-product-images failed:", payload);
          return;
        }

        images = (payload.urls || []).filter(Boolean);
        console.log("upload-product-images: done", { urls: images });
        if (!images.length) {
          showAdminToast("⚠️ Upload image échoué : aucune URL retournée.");
          return;
        }
      } catch (e) {
        console.error("upload-product-images error:", e);
        showAdminToast("⚠️ Erreur réseau pendant l'upload des images.");
        return;
      }
    }

    const productData = {

      name,
      category,
      price,
      oldPrice,
      badge,
      images,
      image: images[0],
      stock,
      description,
      specs,
      reviews_list,
      rating: 4.5,
      reviews: reviews_list.length,
      isFavorite: false
    };

    if (editId) {
      const idx = products.findIndex(p => p.id === editId);
      if (idx > -1) {
        products[idx] = { ...products[idx], ...productData, id: editId };
      }
      showAdminToast("✅ Produit modifié !");
    } else {
      products.push({ ...productData, id: finalId });
      showAdminToast("✅ Produit ajouté !");
    }

    saveData();
    renderAdminProducts();
    renderStats();
    updateSidebarBadges();
    closeProductModal(true); // fermeture forcée : les données viennent d'être enregistrées
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = saveBtnOriginalText;
    }
  }
}


function deleteProduct(id) {
  const product = products.find(p => p.id === id);
  const confirmMsg = `Supprimer "${product?.name || 'ce produit'}" ? Cette action est irréversible.`;
  if (!confirm(confirmMsg)) return;
  products = products.filter(p => p.id !== id);
  saveData();
  renderAdminProducts();
  renderStats();
  updateSidebarBadges();
  showAdminToast("🗑 Produit supprimé.");
}

/* ===== EXPORT MANUEL ===== */
function exportProductsJSON() {
  const data = JSON.stringify(products, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "products.json";
  a.click();
  URL.revokeObjectURL(url);
}


/* ===== UTILITAIRES ===== */

function fmt(n) {
  return (n || 0).toLocaleString("fr-FR") + " FCFA";
}

function catLabel(c) {
  return { neuf: "📱 Neuf", reconditionne: "♻️ Recond.", accessoire: "🎧 Accessoire" }[c] || c;
}

function showAdminToast(msg) {
  const t = document.getElementById("adminToast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}