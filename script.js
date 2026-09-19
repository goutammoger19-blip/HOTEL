
const API = "/api";
let adminToken = localStorage.getItem("admin_token") || "";
let categories = [];
let items = [];
let cart = JSON.parse(localStorage.getItem("customer_cart") || "[]");

const $ = id => document.getElementById(id);
const money = v => new Intl.NumberFormat("en-IN", {style:"currency", currency:"INR"}).format(Number(v) || 0);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

async function api(url, options = {}, requireAdmin = false) {
  const headers = {"Content-Type":"application/json", ...(options.headers || {})};
  if (requireAdmin && adminToken) headers.Authorization = `Bearer ${adminToken}`;
  const res = await fetch(API + url, {...options, headers});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function loadData() {
  categories = await api("/categories");
  items = await api("/menu");
  populateCategories();
  renderCustomer();
  renderAdmin();
  renderCart();
}

function populateCategories() {
  $("categoryFilter").innerHTML = '<option value="all">All Categories</option>' +
    categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  $("adminCategoryFilter").innerHTML = '<option value="all">All Categories</option>' +
    categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  $("itemCategory").innerHTML = categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  renderCategories();
}

function renderCategories() {
  $("categoryList").innerHTML = categories.map(c =>
    `<div class="category-row"><span>${esc(c.name)}</span><button onclick="deleteCategory(${c.id})">Delete</button></div>`
  ).join("");
}

function renderCustomer() {
  const q = $("searchInput").value.toLowerCase();
  const cat = $("categoryFilter").value;
  const list = items.filter(i =>
    i.available &&
    (!cat || cat === "all" || String(i.category_id) === String(cat)) &&
    ((i.name || "").toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q))
  );
  $("customerEmpty").classList.toggle("hidden", list.length > 0);
  $("customerGrid").innerHTML = list.map(i => `
    <article class="card">
      <div class="card-top">
        <div><h3>${esc(i.name)}</h3><div class="category">${esc(i.category_name || "")}</div></div>
        <span class="badge available">Available</span>
      </div>
      <div class="price">${money(i.price)}</div>
      <div class="description">${esc(i.description || "")}</div>
      <button class="add-btn card-actions" onclick="addToCart(${i.id})">🛒 Add to Cart</button>
    </article>`).join("");
}

function renderAdmin() {
  const q = $("adminSearch").value.toLowerCase();
  const cat = $("adminCategoryFilter").value;
  const av = $("availabilityFilter").value;
  const list = items.filter(i =>
    (!cat || cat === "all" || String(i.category_id) === String(cat)) &&
    (av === "all" || (av === "available" ? i.available : !i.available)) &&
    (i.name || "").toLowerCase().includes(q)
  );
  $("adminGrid").innerHTML = list.map(i => `
    <article class="card">
      <div class="card-top">
        <div><h3>${esc(i.name)}</h3><div class="category">${esc(i.category_name || "")}</div></div>
        <span class="badge ${i.available ? "available" : "unavailable"}">${i.available ? "Available" : "Unavailable"}</span>
      </div>
      <div class="price">${money(i.price)}</div>
      <div class="description">${esc(i.description || "")}</div>
      <div class="card-actions">
        <button onclick="editItem(${i.id})">✏ Edit</button>
        <button onclick="toggleAvailability(${i.id})">${i.available ? "⏸ Disable" : "▶ Enable"}</button>
        <button class="delete" onclick="deleteItem(${i.id})">🗑 Delete</button>
      </div>
    </article>`).join("");
}

function renderCart() {
  const count = cart.reduce((s,x) => s + x.qty, 0);
  const total = cart.reduce((s,x) => s + x.price * x.qty, 0);
  $("cartCount").textContent = count;
  $("cartTotal").textContent = money(total);
  $("cartItems").innerHTML = cart.length ? cart.map(x => `
    <div class="cart-row">
      <div><h4>${esc(x.name)}</h4><div class="category">${money(x.price)} each</div></div>
      <div>
        <div class="cart-controls"><button onclick="changeQty('${x.id}',-1)">−</button><strong>${x.qty}</strong><button onclick="changeQty('${x.id}',1)">+</button></div>
        <div class="cart-price">${money(x.price * x.qty)}</div>
      </div>
    </div>`).join("") : '<div class="empty">Your cart is empty.</div>';
  $("checkoutBtn").disabled = !cart.length;
  $("checkoutBtn").style.opacity = cart.length ? 1 : .5;
}

function saveCart() {
  localStorage.setItem("customer_cart", JSON.stringify(cart));
}

function addToCart(id) {
  const item = items.find(i => i.id === id);
  if (!item || !item.available) return;
  const existing = cart.find(x => x.id === id);
  if (existing) existing.qty++;
  else cart.push({id:item.id, name:item.name, price:Number(item.price), qty:1});
  saveCart(); renderCart(); toast(item.name + " added to cart.");
}

window.changeQty = (id, d) => {
  const x = cart.find(i => i.id === id);
  if (!x) return;
  x.qty += d;
  if (x.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart(); renderCart();
};

function openItemModal(item) {
  $("modalTitle").textContent = item ? "Edit Food Item" : "Add Food Item";
  $("itemId").value = item?.id || "";
  $("itemName").value = item?.name || "";
  $("itemCategory").value = item?.category_id ?? categories[0]?.id ?? "";
  $("itemPrice").value = item?.price ?? "";
  $("itemDescription").value = item?.description || "";
  $("itemAvailable").checked = item?.available ?? true;
  $("itemModal").classList.remove("hidden");
}

$("itemForm").onsubmit = async e => {
  e.preventDefault();
  const id = $("itemId").value;
  const data = {
    name: $("itemName").value.trim(),
    category_id: Number($("itemCategory").value) || null,
    price: Number($("itemPrice").value),
    description: $("itemDescription").value.trim(),
    available: $("itemAvailable").checked
  };
  try {
    if (id) await api(`/menu/${id}`, {method:"PUT", body:JSON.stringify(data)}, true);
    else await api("/menu", {method:"POST", body:JSON.stringify(data)}, true);
    await loadData(); close("itemModal");
    toast(id ? "Food item updated." : "Food item added.");
  } catch (err) { handleAuthError(err); }
};

window.editItem = id => {
  const item = items.find(x => x.id === id);
  if (item) openItemModal(item);
};

window.deleteItem = async id => {
  const x = items.find(i => i.id === id);
  if (!x || !confirm(`Delete "${x.name}"?`)) return;
  try {
    await api(`/menu/${id}`, {method:"DELETE"}, true);
    cart = cart.filter(i => i.id !== id); saveCart();
    await loadData(); toast("Food item deleted.");
  } catch (err) { handleAuthError(err); }
};

window.toggleAvailability = async id => {
  const x = items.find(i => i.id === id);
  if (!x) return;
  try {
    await api(`/menu/${id}/availability`, {method:"PATCH", body:JSON.stringify({available:!x.available})}, true);
    await loadData(); toast(x.name + " is now " + (!x.available ? "available." : "unavailable."));
  } catch (err) { handleAuthError(err); }
};

$("categoryForm").onsubmit = async e => {
  e.preventDefault();
  const n = $("newCategory").value.trim();
  if (!n) return;
  try {
    await api("/categories", {method:"POST", body:JSON.stringify({name:n})}, true);
    $("newCategory").value = "";
    await loadData(); toast("Category added.");
  } catch (err) { handleAuthError(err); }
};

window.deleteCategory = async id => {
  try {
    await api(`/categories/${id}`, {method:"DELETE"}, true);
    await loadData();
  } catch (err) { handleAuthError(err); }
};

function close(id) { $(id).classList.add("hidden"); }
function toast(m) {
  const t = $("toast"); t.textContent = m; t.classList.add("show");
  clearTimeout(window.tt); window.tt = setTimeout(() => t.classList.remove("show"), 2200);
}

function showView(admin) {
  $("customerView").classList.toggle("hidden", admin);
  $("adminView").classList.toggle("hidden", !admin);
  $("customerTab").classList.toggle("active", !admin);
  $("adminTab").classList.toggle("active", admin);
}

function openAdmin() {
  if (adminToken) showView(true);
  else $("adminLoginModal").classList.remove("hidden");
}

function logoutAdmin() {
  adminToken = "";
  localStorage.removeItem("admin_token");
  showView(false);
  toast("Admin logged out.");
}

async function adminLogin(e) {
  e.preventDefault();
  $("adminLoginError").classList.add("hidden");
  try {
    const data = await api("/admin/login", {
      method:"POST",
      body:JSON.stringify({
        username:$("adminUsername").value.trim(),
        password:$("adminPassword").value
      })
    });
    adminToken = data.token;
    localStorage.setItem("admin_token", adminToken);
    $("adminLoginForm").reset();
    close("adminLoginModal");
    showView(true);
    await loadData();
    toast("Admin login successful.");
  } catch (err) {
    $("adminLoginError").textContent = err.message;
    $("adminLoginError").classList.remove("hidden");
  }
}

function handleAuthError(err) {
  if (/login|required|expired|invalid.*session/i.test(err.message)) {
    logoutAdmin();
    $("adminLoginError").textContent = "Your admin session has expired. Please log in again.";
    $("adminLoginError").classList.remove("hidden");
    $("adminLoginModal").classList.remove("hidden");
  } else alert(err.message);
}

$("customerTab").onclick = () => showView(false);
$("adminTab").onclick = openAdmin;
$("adminLogoutBtn").onclick = logoutAdmin;
$("adminLoginForm").onsubmit = adminLogin;
$("cartBtn").onclick = () => {$("cartDrawer").classList.remove("hidden"); renderCart();};
$("closeCart").onclick = () => close("cartDrawer");
$("addItemBtn").onclick = () => openItemModal();
$("categoryBtn").onclick = () => $("categoryModal").classList.remove("hidden");
["searchInput","categoryFilter"].forEach(id => $(id).oninput = renderCustomer);
["adminSearch","adminCategoryFilter","availabilityFilter"].forEach(id => $(id).oninput = renderAdmin);
document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => close(b.dataset.close));
$("orderType").onchange = () => {
  $("tableNumber").disabled = $("orderType").value !== "dine-in";
  if ($("tableNumber").disabled) $("tableNumber").value = "";
};

$("checkoutBtn").onclick = () => {
  if (!cart.length) return;
  close("cartDrawer");
  const total = cart.reduce((s,x) => s+x.price*x.qty,0);
  $("checkoutSummary").innerHTML = cart.map(x =>
    `<div class="summary-row"><span>${esc(x.name)} × ${x.qty}</span><strong>${money(x.price*x.qty)}</strong></div>`
  ).join("") + `<hr><div class="summary-row"><strong>Total</strong><strong>${money(total)}</strong></div>`;
  $("checkoutModal").classList.remove("hidden");
};

$("checkoutForm").onsubmit = async e => {
  e.preventDefault();
  const payload = {
    customer_name: $("customerName").value.trim(),
    phone: $("customerPhone").value.trim(),
    order_type: $("orderType").value,
    table_number: $("tableNumber").value.trim(),
    notes: $("orderNotes").value.trim(),
    items: cart.map(x => ({food_item_id:x.id, quantity:x.qty}))
  };
  try {
    const order = await api("/orders", {method:"POST", body:JSON.stringify(payload)});
    cart = []; saveCart(); renderCart();
    close("checkoutModal");
    $("successText").textContent = `Thank you, ${payload.customer_name}! Your order #${order.order_id} for ${money(order.total)} has been received.`;
    $("successModal").classList.remove("hidden");
    $("checkoutForm").reset();
    $("tableNumber").disabled = false;
  } catch (err) { alert(err.message); }
};

$("continueBtn").onclick = () => close("successModal");
document.querySelectorAll(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m) close(m.id); }));

loadData().catch(err => console.error(err));
