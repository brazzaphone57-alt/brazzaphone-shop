/* Admin orders helpers (shared by admin.html + admin.js) */

(function () {
  const KEY = 'bpOrders';

  function safeParse(raw) {
    try {
      const v = raw ? JSON.parse(raw) : [];
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  window.bpOrders = {
    getAll: () => safeParse(localStorage.getItem(KEY)),
    saveAll: (orders) => localStorage.setItem(KEY, JSON.stringify(Array.isArray(orders) ? orders : [])),
    createId: () => 'ord_' + Math.random().toString(16).slice(2) + '_' + Date.now()
  };
})();

