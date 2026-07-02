/* Orders management for admin.html */

(function () {
  const STATUS = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    delivered: 'Livrée'
  };

  const ordersTableBody = () => document.getElementById('ordersTableBody');
  const ordersEmpty = () => document.getElementById('ordersEmpty');
  const ordersFilter = () => document.getElementById('ordersFilter');

  function getOrders() {
    // prefers shared API
    if (window.bpOrders && typeof window.bpOrders.getAll === 'function') {
      return window.bpOrders.getAll();
    }
    // fallback
    try {
      const raw = localStorage.getItem('bpOrders');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setOrders(orders) {
    if (window.bpOrders && typeof window.bpOrders.saveAll === 'function') {
      return window.bpOrders.saveAll(orders);
    }
    localStorage.setItem('bpOrders', JSON.stringify(Array.isArray(orders) ? orders : []));
  }

  function fmt(n) {
    return (n || 0).toLocaleString('fr-FR') + ' FCFA';
  }

  function fmtDate(iso) {
    try {
      const d = iso ? new Date(iso) : new Date();
      return d.toLocaleString('fr-FR');
    } catch {
      return iso || '';
    }
  }

  function getFilteredOrders() {
    const filter = ordersFilter()?.value || 'all';
    const search = document.getElementById('ordersSearch')?.value.toLowerCase() || '';
    let list = getOrders();
    
    // Filtrer par statut
    if (filter !== 'all') {
      list = list.filter(o => o.status === filter);
    }
    
    // Filtrer par recherche (nom, téléphone, adresse)
    if (search) {
      list = list.filter(o => 
        (o.buyerName || '').toLowerCase().includes(search) ||
        (o.buyerPhone || '').toLowerCase().includes(search) ||
        (o.buyerAddress || '').toLowerCase().includes(search)
      );
    }
    
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function renderOrders() {
    const list = getFilteredOrders();
    const tbody = ordersTableBody();
    const emptyEl = ordersEmpty();

    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    tbody.innerHTML = list.map(o => {
      const items = (o.items || []).map(it => `${it.name} x${it.qty}`).join('<br/>');
      const status = o.status || 'pending';
      const statusClass = `status-${status}`;

      return `
        <tr>
          <td class="date-col">${escapeHtml(fmtDate(o.createdAt))}</td>
          <td class="name-col">${escapeHtml(o.buyerName || '—')}</td>
          <td class="phone-col">${escapeHtml(o.buyerPhone || '—')}</td>
          <td class="address-col">${escapeHtml(o.buyerAddress || '—')}</td>
          <td class="items-col">${items}</td>
          <td class="total-col"><strong>${escapeHtml(fmt(o.total))}</strong></td>
          <td class="status-col">
            <select class="status-select ${statusClass}" onchange="window.bpOrdersAdmin && window.bpOrdersAdmin.updateStatus('${escapeAttr(o.id)}', this.value)">
              <option value="pending" ${status==='pending'?'selected':''}>⏳ En attente</option>
              <option value="confirmed" ${status==='confirmed'?'selected':''}>✔️ Confirmée</option>
              <option value="delivered" ${status==='delivered'?'selected':''}>✅ Livrée</option>
            </select>
          </td>
          <td class="actions-col">
            <button class="btn-small btn-delete" onclick="window.bpOrdersAdmin && window.bpOrdersAdmin.deleteOrder('${escapeAttr(o.id)}')">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function updateStatus(orderId, newStatus) {
    const orders = getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return;
    orders[idx].status = newStatus;
    setOrders(orders);
    renderOrders();
    // Rafraîchir les stats aussi
    if (window.renderStats) window.renderStats();
    if (window.updateSidebarBadges) window.updateSidebarBadges();
  }

  function deleteOrder(orderId) {
    const order = getOrders().find(o => o.id === orderId);
    const buyerName = order?.buyerName || 'cette commande';
    if (!confirm(`Supprimer la commande de "${buyerName}" ? Cette action est irréversible.`)) return;
    const orders = getOrders();
    setOrders(orders.filter(o => o.id !== orderId));
    renderOrders();
    // Rafraîchir les stats aussi
    if (window.renderStats) window.renderStats();
    if (window.updateSidebarBadges) window.updateSidebarBadges();
  }

  // Event listeners
  document.addEventListener('DOMContentLoaded', () => {
    const filterEl = ordersFilter();
    const searchEl = document.getElementById('ordersSearch');
    
    if (filterEl) {
      filterEl.addEventListener('change', renderOrders);
    }
    
    if (searchEl) {
      searchEl.addEventListener('input', renderOrders);
    }
    
    renderOrders();
  });

  // Expose API admin
  window.bpOrdersAdmin = {
    render: renderOrders,
    updateStatus,
    deleteOrder
  };

})();

  });

})();

