/* Checkout helpers + order persistence */

(function () {
  const STORAGE_KEY = 'bpOrders';

  function getOrders() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setOrders(orders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }

  function uuid() {
    return 'ord_' + Math.random().toString(16).slice(2) + '_' + Date.now();
  }

  // Exposé global : récupérer les commandes dans l'admin
  window.bpOrdersAPI = {
    list: () => getOrders(),
    add: (order) => {
      const orders = getOrders();
      orders.unshift(order);
      setOrders(orders);
      return order;
    },
    updateStatus: (orderId, status) => {
      const orders = getOrders();
      const idx = orders.findIndex(o => o.id === orderId);
      if (idx === -1) return null;
      orders[idx].status = status;
      setOrders(orders);
      return orders[idx];
    },
    remove: (orderId) => {
      const orders = getOrders();
      const next = orders.filter(o => o.id !== orderId);
      setOrders(next);
      return next;
    }
  };

  // Construction message WhatsApp pour une commande
  window.buildWhatsAppOrderMessage = function buildWhatsAppOrderMessage({
    buyerName,
    buyerPhone,
    buyerAddress,
    payment,
    items,
    total
  }) {
    const payLabels = { airtel: 'Airtel Money', mtn: 'MTN Money', cash: 'Livraison Cash' };

    const lines = items.map(it => `• ${it.name} x${it.qty} = ${fmt(it.subtotal)}`).join('\n');

    return encodeURIComponent(
      `🛒 *NOUVELLE COMMANDE – Brazzaphone*\n\n` +
      `👤 Nom : ${buyerName}\n` +
      `📞 Tél : ${buyerPhone}\n` +
      `📍 Adresse : ${buyerAddress}\n` +
      `💳 Paiement : ${payLabels[payment] || payment}\n\n` +
      `📦 Produits :\n${lines}\n\n` +
      `💰 *Total : ${fmt(total)}*`
    );
  };

})();

