/* ============================================================
   CONFIGURATION — à adapter facilement
   ============================================================ */
const CONFIG = {
  // Numéro WhatsApp de destination, format international SANS "+" ni espaces
  // Exemple Côte d'Ivoire : "225XXXXXXXXX"
  WHATSAPP_NUMBER: "2250710988269",
  // Taux de taxe / frais de service appliqué au sous-total (0.18 = 18%)
  TAX_RATE: 0,
  CURRENCY: "FCFA",
};

const ICONS = {
  grid:  '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  leaf:  '<path d="M5 19c9 0 14-5 14-14-9 0-14 5-14 14z"/><path d="M5 19c3-6 6-9 9-11"/>',
  bowl:  '<path d="M3 12h18a9 6 0 0 1-18 0z"/><path d="M12 12V4M8 6l1.5 3M16 6l-1.5 3"/>',
  fish:  '<path d="M3 12s3-5 9-5 9 5 9 5-3 5-9 5-9-5-9-5z"/><circle cx="17" cy="11" r=".6"/><path d="m3 12-2-3m2 3-2 3"/>',
  flame: '<path d="M12 2c1 4-4 5-4 9a4 4 0 0 0 8 0c0-1-.5-2-1-2 .5 3-1 4-2 4-2 0-3-1.5-3-3.5C10 7 12 5 12 2z"/>',
  cake:  '<path d="M4 21h16v-6a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3zM8 12V8m4 4V8m4 4V8M12 3v2"/>',
  cup:   '<path d="M6 3h9l-1 12a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z"/><path d="M15 6h2a2 2 0 0 1 0 4h-2.3"/>',
};

/* ============================================================
   STATE
   ============================================================ */
let MENU = { categories: [], items: [] };
let cart = {};          // { itemId: qty }
let activeCategory = "all";
let searchTerm = "";
let customer = { name: "", phone: "", address: "" };
const ticketId = Math.floor(1000 + Math.random() * 9000);

const fmt = (n) => `${n.toLocaleString("fr-FR")} ${CONFIG.CURRENCY}`;

/* ============================================================
   LOAD DATA
   ============================================================ */
async function loadMenu() {
  try {
    const res = await fetch("menu.json");
    MENU = await res.json();
  } catch (err) {
    document.getElementById("productGrid").innerHTML =
      `<p style="color:#B3492E;font-size:13px;">Impossible de charger le menu (menu.json). Si vous ouvrez ce fichier directement dans le navigateur, lancez plutôt un petit serveur local (ex. "npx serve" ou l'extension Live Server) pour autoriser le chargement du JSON.</p>`;
    return;
  }
  renderCategories();
  renderGrid();
  renderTicketCategoryFilter();
}

/* ============================================================
   RENDER: CATEGORY BAR
   ============================================================ */
function renderCategories() {
  const bar = document.getElementById("categoryBar");
  if (!bar) return;

  bar.innerHTML = MENU.categories.map(cat => `
    <button class="cat-pill ${cat.id === activeCategory ? "is-active" : ""}" data-cat="${cat.id}">
      <svg viewBox="0 0 24 24">${ICONS[cat.icon] || ICONS.grid}</svg>
      ${cat.label}
    </button>
  `).join("");

  bar.querySelectorAll("button.cat-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderCategories();
      renderGrid();
      renderTicketCategoryFilter();
    });
  });
}

/* ============================================================
   RENDER: PRODUCT GRID
   ============================================================ */
function renderGrid() {
  const grid = document.getElementById("productGrid");
  const term = searchTerm.trim().toLowerCase();

  const items = MENU.items.filter(it => {
    const matchesCat = activeCategory === "all" || it.category === activeCategory;
    const matchesTerm = !term || it.name.toLowerCase().includes(term);
    return matchesCat && matchesTerm;
  });

  if (!items.length) {
    grid.innerHTML = `<p style="color:var(--ink-soft);font-size:13.5px;">Aucun plat ne correspond à votre recherche.</p>`;
    return;
  }
  // Si on affiche toutes les catégories, regrouper par catégorie
  if (activeCategory === "all") {
    grid.innerHTML = MENU.categories.map(cat => {
      const catItems = MENU.items.filter(it => it.category === cat.id && (!term || it.name.toLowerCase().includes(term)));
      if (!catItems.length) return "";
      return `
        <div class="cat-section">
          <h3 class="cat-section-title">${cat.label}</h3>
          <div class="cat-items">
            ${catItems.map(it => {
              const qty = cart[it.id] || 0;
              const finalPrice = it.promo ? Math.round(it.price * (1 - it.promo / 100)) : it.price;
              return `
                <article class="card" data-id="${it.id}">
                  <div class="card-img">
                    <img src="${it.image}" alt="${it.name}" loading="lazy">
                    <span class="badge ${it.veg ? "badge-veg" : "badge-nonveg"}">${it.veg ? "Veg" : "Non Veg"}</span>
                    ${it.promo ? `<span class="badge badge-promo">-${it.promo}%</span>` : ""}
                  </div>
                  <div class="card-body">
                    <h3 class="card-title">${it.name}</h3>
                    <p class="card-desc">${it.desc || ""}</p>
                    <div class="card-foot">
                      <div>
                        ${it.promo ? `<span class="card-price-old">${fmt(it.price)}</span>` : ""}
                        <span class="card-price">${fmt(finalPrice)}</span>
                      </div>
                      <div class="qty-zone" data-id="${it.id}">
                        ${qty === 0
                          ? `<button class="qty-add" data-action="add"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>`
                          : `<div class="qty-stepper">
                               <button data-action="dec">−</button>
                               <span>${qty}</span>
                               <button data-action="inc">+</button>
                             </div>`
                        }
                      </div>
                    </div>
                  </div>
                </article>`;
            }).join("")}
          </div>
        </div>
      `;
    }).join("");

    // Attacher les events qty
    grid.querySelectorAll(".qty-zone").forEach(zone => {
      const id = zone.dataset.id;
      zone.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.action;
          if (action === "add" || action === "inc") cart[id] = (cart[id] || 0) + 1;
          if (action === "dec") {
            cart[id] = (cart[id] || 0) - 1;
            if (cart[id] <= 0) delete cart[id];
          }
          renderGrid();
          renderTicket();
        });
      });
    });
    return;
  }

  grid.innerHTML = items.map(it => {
    const qty = cart[it.id] || 0;
    const finalPrice = it.promo ? Math.round(it.price * (1 - it.promo / 100)) : it.price;
    return `
    <article class="card" data-id="${it.id}">
      <div class="card-img">
        <img src="${it.image}" alt="${it.name}" loading="lazy">
        <span class="badge ${it.veg ? "badge-veg" : "badge-nonveg"}">${it.veg ? "Veg" : "Non Veg"}</span>
        ${it.promo ? `<span class="badge badge-promo">-${it.promo}%</span>` : ""}
      </div>
      <div class="card-body">
        <h3 class="card-title">${it.name}</h3>
        <p class="card-desc">${it.desc || ""}</p>
        <div class="card-foot">
          <div>
            ${it.promo ? `<span class="card-price-old">${fmt(it.price)}</span>` : ""}
            <span class="card-price">${fmt(finalPrice)}</span>
          </div>
          <div class="qty-zone" data-id="${it.id}">
            ${qty === 0
              ? `<button class="qty-add" data-action="add"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>`
              : `<div class="qty-stepper">
                   <button data-action="dec">−</button>
                   <span>${qty}</span>
                   <button data-action="inc">+</button>
                 </div>`
            }
          </div>
        </div>
      </div>
    </article>`;
  }).join("");

  grid.querySelectorAll(".qty-zone").forEach(zone => {
    const id = zone.dataset.id;
    zone.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "add" || action === "inc") cart[id] = (cart[id] || 0) + 1;
        if (action === "dec") {
          cart[id] = (cart[id] || 0) - 1;
          if (cart[id] <= 0) delete cart[id];
        }
        renderGrid();
        renderTicket();
      });
    });
  });
}

/* ============================================================
   RENDER: TICKET
   ============================================================ */
function renderTicket() {
  document.getElementById("ticketId").textContent = `#${ticketId}`;
  const linesEl = document.getElementById("ticketLines");
  const entries = Object.entries(cart);

  if (!entries.length) {
    linesEl.innerHTML = `<p class="ticket-empty">Aucun article pour le moment.<br>Touchez un plat pour l'ajouter.</p>`;
  } else {
    linesEl.innerHTML = entries.map(([id, qty]) => {
      const it = MENU.items.find(m => m.id === id);
      if (!it) return "";
      const unit = it.promo ? Math.round(it.price * (1 - it.promo / 100)) : it.price;
      return `
      <div class="line-item" data-id="${id}">
        <div class="line-main">
          <p class="line-name">${it.name}</p>
          <span class="line-unit">${fmt(unit)} × ${qty}</span>
          <div class="line-qty">
            <button data-action="dec">−</button>
            <span>${qty}</span>
            <button data-action="inc">+</button>
          </div>
        </div>
        <span class="line-total">${fmt(unit * qty)}</span>
      </div>`;
    }).join("");

    linesEl.querySelectorAll(".line-item").forEach(row => {
      const id = row.dataset.id;
      row.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.action;
          if (action === "inc") cart[id] = (cart[id] || 0) + 1;
          if (action === "dec") {
            cart[id] = (cart[id] || 0) - 1;
            if (cart[id] <= 0) delete cart[id];
          }
          renderGrid();
          renderTicket();
        });
      });
    });
  }

  const subtotal = entries.reduce((sum, [id, qty]) => {
    const it = MENU.items.find(m => m.id === id);
    if (!it) return sum;
    const unit = it.promo ? Math.round(it.price * (1 - it.promo / 100)) : it.price;
    return sum + unit * qty;
  }, 0);
  const tax = Math.round(subtotal * CONFIG.TAX_RATE);
  const total = subtotal + tax;

  document.getElementById("sumSubtotal").textContent = fmt(subtotal);
  document.getElementById("taxRateLabel").textContent = Math.round(CONFIG.TAX_RATE * 100);
  document.getElementById("sumTax").textContent = fmt(tax);
  document.getElementById("sumTotal").textContent = fmt(total);

  document.getElementById("checkoutBtn").disabled = entries.length === 0;
}

/* ============================================================
   MODE / PAYMENT SWITCHES
   ============================================================ */
function renderTicketCategoryFilter() {
  const container = document.getElementById("sidebarCategoryFilter");
  if (!container || !MENU.categories) return;
  container.innerHTML = MENU.categories.map(cat => `
    <button class="cat-pill ${cat.id === activeCategory ? 'is-active' : ''}" data-cat="${cat.id}">${cat.label}</button>
  `).join("");
  container.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderCategories();
      renderGrid();
      renderTicketCategoryFilter();
    });
  });
}

/* ============================================================
   CHECKOUT — ticket à l'écran (déjà affiché) + envoi WhatsApp
   ============================================================ */
function validateCustomerInfo() {
  const nameInput = document.getElementById("customerName");
  const phoneInput = document.getElementById("customerPhone");
  const addressInput = document.getElementById("customerAddress");

  const name = nameInput ? nameInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";
  const address = addressInput ? addressInput.value.trim() : "";

  const missingFields = [];
  if (!name) missingFields.push("nom");
  if (!phone) missingFields.push("numéro");
  if (!address) missingFields.push("adresse");

  return { name, phone, address, missingFields, isValid: missingFields.length === 0 };
}

function initCheckout() {
  document.getElementById("checkoutBtn").addEventListener("click", () => {
   const entries = Object.entries(cart);
   if (!entries.length) return;

   const { name, phone, address, missingFields, isValid } = validateCustomerInfo();
   if (!isValid) {
     showToast(`Veuillez renseigner votre ${missingFields.join(", ")}.`);
     return;
   }

   let message = `Nouvelle commande AK Traiteur — Ticket #${ticketId}\n`;
   message += `Client : ${name} | ${phone} | ${address}\n\n`;
   entries.forEach(([id, qty]) => {
     const it = MENU.items.find(m => m.id === id);
     if (!it) return;
     const unit = it.promo ? Math.round(it.price * (1 - it.promo / 100)) : it.price;
     message += `${qty} x ${it.name} — ${fmt(unit * qty)}\n`;
   });

   const subtotal = entries.reduce((sum, [id, qty]) => {
     const it = MENU.items.find(m => m.id === id);
     const unit = it.promo ? Math.round(it.price * (1 - it.promo / 100)) : it.price;
     return sum + unit * qty;
   }, 0);
   const tax = Math.round(subtotal * CONFIG.TAX_RATE);
   const total = subtotal + tax;

   message += `\nSous-total : ${fmt(subtotal)}`;
   message += `\nTaxe/Service : ${fmt(tax)}`;
   message += `\nTotal : ${fmt(total)}`;

   const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
   window.open(url, "_blank");
   showToast("Ticket prêt — commande envoyée sur WhatsApp");
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
   cart = {};
   renderGrid();
   renderTicket();
  });
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
}

/* ============================================================
   SEARCH
   ============================================================ */
function initSearch() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchTerm = e.target.value;
    renderGrid();
  });
}

/* ============================================================
   SIDEBAR NAV (visual only — single-page demo)
   ============================================================ */
function initNav() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
  });
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initCheckout();
  initSearch();
  initNav();
  renderTicket();
  loadMenu();
});
