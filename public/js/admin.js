/**
 * Herbo India - Secure Doctor & Admin Consultation CRM Controller
 * Enterprise-Grade Doctor Authentication, Role-Based Access Control,
 * Real-Time Auto-Syncing CRM, Dynamic Sorting & Chronological Order Management.
 */

let allInquiries = [];
let activeCategoryTab = "ALL";
let syncTimerId = null;
let lastSyncTimestamp = Date.now();

// Intelligent API base for both HTTP server (localhost:3000) and direct file:// execution
const API_BASE = (typeof window !== 'undefined' && window.location.protocol === 'file:')
  ? 'http://localhost:3000'
  : '';

document.addEventListener("DOMContentLoaded", () => {
  checkAuthStatus();
  setupSyncTimerDisplay();
});

// ==================== AUTHENTICATION & SESSION MANAGEMENT ====================

async function checkAuthStatus() {
  const isAuth = localStorage.getItem("herbo_admin_auth") === "true";
  const token = localStorage.getItem("herbo_admin_token");
  const authSection = document.getElementById("adminAuthSection");
  const dashboard = document.getElementById("adminDashboard");
  const btnLogout = document.getElementById("btnAdminLogout");
  const docBadge = document.getElementById("authDoctorBadge");
  const docNameDisplay = document.getElementById("doctorNameDisplay");
  const btnSubAdmin = document.getElementById("btnToggleSubAdmins");
  const btnBannerSubAdmin = document.getElementById("btnBannerSubAdmins");

  if (isAuth && token) {
    let currentUser = null;
    const stored = localStorage.getItem("herbo_admin_user");
    if (stored) {
      try { currentUser = JSON.parse(stored); } catch (err) {}
    }

    try {
      const res = await fetch(API_BASE + "/api/admin/verify", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const verifyData = await res.json();
        currentUser = verifyData.user;
        localStorage.setItem("herbo_admin_user", JSON.stringify(currentUser));
      } else if (res.status === 401) {
        clearSession();
        showAuthError("Session expired or signed out. Please sign in again.");
        return;
      }
    } catch (e) {
      console.warn("Server offline or restarting, continuing with persistent local session.");
    }

    if (!currentUser) {
      currentUser = { name: "Doctor", role: "admin" };
    }

    if (authSection) authSection.style.display = "none";
    if (dashboard) dashboard.style.display = "block";
    if (btnLogout) btnLogout.style.display = "inline-flex";
    if (docBadge) docBadge.style.display = "inline-flex";

    const isMasterAdmin = currentUser.role === "admin";
    if (btnSubAdmin) btnSubAdmin.style.display = isMasterAdmin ? "inline-flex" : "none";
    if (btnBannerSubAdmin) btnBannerSubAdmin.style.display = isMasterAdmin ? "inline-flex" : "none";
    const btnExport = document.querySelector(".btn-export");
    if (btnExport) btnExport.style.display = isMasterAdmin ? "inline-flex" : "none";

    const cleanName = (currentUser.name || "Chief Medical Admin")
      .replace(/\s*\((Master Admin|Sub-Admin)\)/gi, "")
      .replace(/\s*\(Master Admin\)/gi, "")
      .replace(/\s*\(Sub-Admin\)/gi, "")
      .trim();

    if (docNameDisplay) {
      docNameDisplay.innerText = cleanName;
    }
    const roleBadge = document.getElementById("doctorRoleBadge");
    if (roleBadge) {
      roleBadge.innerText = isMasterAdmin ? "Master Admin" : "Sub-Admin (Clinical)";
      roleBadge.className = isMasterAdmin ? "badge-role-admin" : "badge-role-subadmin";
    }

    // Load initial data and start live auto-sync polling
    loadInquiries();
    startAutoSyncPolling();

    if (isMasterAdmin) {
      loadSubAdminsList();
    }
  } else {
    stopAutoSyncPolling();
    clearSession();
    if (authSection) authSection.style.display = "flex";
    if (dashboard) dashboard.style.display = "none";
    if (btnLogout) btnLogout.style.display = "none";
    if (docBadge) docBadge.style.display = "none";
    if (btnSubAdmin) btnSubAdmin.style.display = "none";
    if (btnBannerSubAdmin) btnBannerSubAdmin.style.display = "none";
    switchAuthMode("login");
  }
}

function clearSession() {
  localStorage.removeItem("herbo_admin_auth");
  localStorage.removeItem("herbo_admin_token");
  localStorage.removeItem("herbo_admin_user");
}

window.switchAuthMode = function(mode) {
  const loginScreen = document.getElementById("loginScreenContainer");
  const errBox = document.getElementById("authErrorMessage");
  if (errBox) errBox.style.display = "none";
  if (loginScreen) loginScreen.style.display = "block";
};

// Handle Doctor & Admin Direct Database Login
window.handleDoctorLogin = async function(event) {
  event.preventDefault();
  const usernameInput = document.getElementById("adminUsername");
  const passwordInput = document.getElementById("adminPassword");
  const submitBtn = document.getElementById("btnLoginSubmit");
  const errBox = document.getElementById("authErrorMessage");

  let identifier = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // Normalize typo if user enters 'herno' instead of 'herbo'
  if (identifier.toLowerCase().includes("hernoindia")) {
    identifier = identifier.replace(/hernoindia/gi, "herboindia");
    usernameInput.value = identifier;
  }

  if (!identifier || !password) {
    showAuthError("Please enter your email and password.");
    return;
  }

  if (errBox) errBox.style.display = "none";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Verifying credentials in database...</span>`;
  }

  try {
    const res = await fetch(API_BASE + "/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identifier, username: identifier, password })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      localStorage.setItem("herbo_admin_auth", "true");
      localStorage.setItem("herbo_admin_token", data.token);
      localStorage.setItem("herbo_admin_user", JSON.stringify(data.user));
      passwordInput.value = "";
      checkAuthStatus();
    } else {
      showAuthError(data.error || "Invalid credentials. Please verify your email and password.");
    }
  } catch (netErr) {
    showAuthError("Unable to reach authentication server. Please check your connection.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sign In to Medical Portal ➔</span>`;
    }
  }
};

function showAuthError(msg) {
  const errorBox = document.getElementById("authErrorMessage");
  if (errorBox) {
    errorBox.innerText = `⚠️ ${msg}`;
    errorBox.style.display = "block";
  }
}

window.handleDoctorLogout = function() {
  if (confirm("Are you sure you want to securely lock and sign out of the Doctor Portal?")) {
    stopAutoSyncPolling();
    clearSession();
    checkAuthStatus();
  }
};

window.togglePasswordVisibility = function(inputId) {
  const pwdInput = document.getElementById(inputId || "adminPassword");
  if (pwdInput) {
    pwdInput.type = pwdInput.type === "password" ? "text" : "password";
  }
};

// ==================== MASTER ADMIN: SUB-ADMIN MANAGEMENT ====================

window.toggleSubAdminSection = function() {
  const panel = document.getElementById("subAdminManagementSection");
  if (panel) {
    const isHidden = panel.style.display === "none";
    panel.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      loadSubAdminsList();
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

window.loadSubAdminsList = async function() {
  const tableBody = document.getElementById("subAdminsTableBody");
  if (!tableBody) return;

  const token = localStorage.getItem("herbo_admin_token");
  if (!token) return;

  try {
    const res = await fetch(API_BASE + "/api/admin/subadmins", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      const users = await res.json();
      renderSubAdminsTable(users);
    }
  } catch (err) {
    console.error("Error loading sub-admins:", err);
  }
};

function renderSubAdminsTable(users) {
  const tableBody = document.getElementById("subAdminsTableBody");
  if (!tableBody) return;

  if (!users || users.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:#64748b; font-weight:600;">No sub-admin accounts registered yet.</td></tr>`;
    return;
  }

  tableBody.innerHTML = users.map(u => {
    const isMaster = u.role === "admin";
    const roleBadge = isMaster 
      ? `<span class="badge-role-admin">🛡️ Master Admin</span>` 
      : `<span class="badge-role-subadmin">🩺 Sub-Admin (Clinical)</span>`;

    const actionsHtml = isMaster
      ? `<span class="badge-root-protected">🔒 Root Protected</span>`
      : `
        <button type="button" class="btn-revoke-subadmin" onclick="deleteSubAdmin('${escapeHtml(u.username)}')" title="Revoke sub-admin access for ${escapeHtml(u.name || u.username)}">
          🗑️ Revoke Access
        </button>
      `;

    return `
      <tr>
        <td>
          <div class="subadmin-doctor-cell">
            <span class="subadmin-avatar-icon">👨‍⚕️</span>
            <div class="subadmin-doctor-info">
              <strong class="subadmin-doctor-name">${escapeHtml(u.name || u.username)}</strong>
              <span class="subadmin-doctor-title">${isMaster ? 'Chief Medical Director' : 'Consulting Specialist'}</span>
            </div>
          </div>
        </td>
        <td><code class="subadmin-username-pill">@${escapeHtml(u.username)}</code></td>
        <td><span class="subadmin-email-text">${escapeHtml(u.email)}</span></td>
        <td>${roleBadge}</td>
        <td>${actionsHtml}</td>
      </tr>
    `;
  }).join("");
}

window.handleAddSubAdmin = async function(event) {
  event.preventDefault();
  const token = localStorage.getItem("herbo_admin_token");
  const name = document.getElementById("newSubName").value.trim();
  const email = document.getElementById("newSubEmail").value.trim();
  const username = document.getElementById("newSubUsername").value.trim();
  const password = document.getElementById("newSubPassword").value.trim();
  const submitBtn = document.getElementById("btnAddSubSubmit");

  if (!name || !email || !username || !password) {
    showSubadminAlert("All fields are required.", true);
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Creating Sub-Admin Account...</span>`;
  }

  try {
    const res = await fetch(API_BASE + "/api/admin/subadmins", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ name, email, username, password })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      showSubadminAlert(`✓ Sub-Admin ${name} (${username}) successfully registered!`, false);
      document.getElementById("addSubAdminForm").reset();
      loadSubAdminsList();
    } else {
      showSubadminAlert(data.error || "Failed to create sub-admin.", true);
    }
  } catch (err) {
    showSubadminAlert("Network error while creating sub-admin.", true);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>+ Create Sub-Admin Account</span>`;
    }
  }
};

window.deleteSubAdmin = async function(username) {
  if (!confirm(`Are you sure you want to revoke and delete sub-admin access for "${username}"?`)) {
    return;
  }

  const token = localStorage.getItem("herbo_admin_token");
  try {
    const res = await fetch(`${API_BASE}/api/admin/subadmins/${username}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      showSubadminAlert(`✓ Sub-admin ${username} revoked.`, false);
      loadSubAdminsList();
    } else {
      showSubadminAlert(data.error || "Failed to delete sub-admin.", true);
    }
  } catch (err) {
    showSubadminAlert("Network error deleting sub-admin.", true);
  }
};

function showSubadminAlert(msg, isError) {
  const alertBox = document.getElementById("subadminAlertBox");
  if (alertBox) {
    alertBox.style.display = "block";
    alertBox.innerText = msg;
    if (isError) {
      alertBox.style.background = "#fee2e2";
      alertBox.style.color = "#991b1b";
      alertBox.style.border = "1px solid #fca5a5";
    } else {
      alertBox.style.background = "#ecfdf5";
      alertBox.style.color = "#065f46";
      alertBox.style.border = "1px solid #a7f3d0";
    }
  }
}

// ==================== INQUIRIES & LIVE CRM DATA MANAGEMENT ====================

// Real-Time Auto-Sync Engine
function startAutoSyncPolling() {
  stopAutoSyncPolling();
  syncTimerId = setInterval(async () => {
    await fetchInquiriesSilently();
  }, 10000); // Poll every 10 seconds
}

function stopAutoSyncPolling() {
  if (syncTimerId) {
    clearInterval(syncTimerId);
    syncTimerId = null;
  }
}

function setupSyncTimerDisplay() {
  setInterval(() => {
    const syncText = document.getElementById("syncStatusText");
    if (!syncText) return;
    const diffSec = Math.floor((Date.now() - lastSyncTimestamp) / 1000);
    if (diffSec < 5) {
      syncText.innerText = "Auto-Sync Active (Just now)";
    } else if (diffSec < 60) {
      syncText.innerText = `Auto-Sync Active (${diffSec}s ago)`;
    } else {
      syncText.innerText = `Auto-Sync Active (${Math.floor(diffSec / 60)}m ago)`;
    }
  }, 2500);
}

window.syncNow = async function() {
  const crmPill = document.getElementById("crmLivePill");
  if (crmPill) crmPill.classList.add("is-syncing");
  showToast("🔄 Syncing with live database...");
  await loadInquiries(true);
  if (crmPill) {
    setTimeout(() => crmPill.classList.remove("is-syncing"), 600);
  }
  showToast("✓ Synchronized with live database!");
};

async function fetchInquiriesSilently() {
  const token = localStorage.getItem("herbo_admin_token");
  if (!token) return;

  try {
    const res = await fetch(API_BASE + "/api/enquiries", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const serverList = await res.json();
      lastSyncTimestamp = Date.now();

      // Check if data changed
      const localIds = allInquiries.map(i => i.id + '-' + i.status).join(',');
      const serverIds = serverList.map(i => i.id + '-' + i.status).join(',');

      if (localIds !== serverIds) {
        allInquiries = serverList;
        saveToStorage();
        filterInquiries();
        updateStats();
        updateTabBadges();
      }
    }
  } catch (e) {
    // Silent network retry
  }
}

async function loadInquiries(showFeedback) {
  let loaded = [];
  const token = localStorage.getItem("herbo_admin_token") || "";

  try {
    const res = await fetch(API_BASE + "/api/enquiries", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      loaded = await res.json();
      lastSyncTimestamp = Date.now();
    }
  } catch (e) {
    console.warn("Server API not reachable, loading local cache.");
  }

  // Merge with LocalStorage cache
  const localData = JSON.parse(localStorage.getItem("herbo_enquiries") || "[]");
  const map = new Map();
  loaded.forEach(item => map.set(item.id, item));
  localData.forEach(item => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  allInquiries = Array.from(map.values());
  saveToStorage();

  filterInquiries();
  updateStats();
  updateTabBadges();
}

function saveToStorage() {
  localStorage.setItem("herbo_enquiries", JSON.stringify(allInquiries));
}

function updateStats() {
  const total = allInquiries.length;
  const newCount = allInquiries.filter(i => i.status === "New").length;
  const contactedCount = allInquiries.filter(i => i.status === "Contacted").length;
  const resolvedCount = allInquiries.filter(i => i.status === "Resolved").length;

  const statTotal = document.getElementById("statTotal");
  const statNew = document.getElementById("statNew");
  const statContacted = document.getElementById("statContacted");
  const statResolved = document.getElementById("statResolved");

  if (statTotal) statTotal.innerText = total;
  if (statNew) statNew.innerText = newCount;
  if (statContacted) statContacted.innerText = contactedCount;
  if (statResolved) statResolved.innerText = resolvedCount;
}

function updateTabBadges() {
  const total = allInquiries.length;
  const ordersCount = allInquiries.filter(i => i.type === "COD_ORDER" || (i.address && i.address.trim().length > 0)).length;
  const consultCount = total - ordersCount;
  const newCount = allInquiries.filter(i => i.status === "New").length;
  const contactedCount = allInquiries.filter(i => i.status === "Contacted").length;
  const resolvedCount = allInquiries.filter(i => i.status === "Resolved").length;

  const bAll = document.getElementById("tabCountAll");
  const bOrders = document.getElementById("tabCountOrders");
  const bConsult = document.getElementById("tabCountConsultations");
  const bNew = document.getElementById("tabCountNew");
  const bContacted = document.getElementById("tabCountContacted");
  const bResolved = document.getElementById("tabCountResolved");

  if (bAll) bAll.innerText = total;
  if (bOrders) bOrders.innerText = ordersCount;
  if (bConsult) bConsult.innerText = consultCount;
  if (bNew) bNew.innerText = newCount;
  if (bContacted) bContacted.innerText = contactedCount;
  if (bResolved) bResolved.innerText = resolvedCount;
}

window.setCategoryTab = function(tab) {
  activeCategoryTab = tab;
  document.querySelectorAll(".crm-tab").forEach(btn => {
    if (btn.getAttribute("data-tab") === tab) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  filterInquiries();
};

window.handleSearchInput = function(event) {
  const query = (event.target.value || "").trim();
  const clearBtn = document.getElementById("searchClearBtn");
  if (clearBtn) {
    clearBtn.style.display = query.length > 0 ? "block" : "none";
  }
  filterInquiries();
};

window.clearSearchInput = function() {
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClearBtn");
  if (input) input.value = "";
  if (clearBtn) clearBtn.style.display = "none";
  filterInquiries();
};

window.filterInquiries = function() {
  const query = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const typeFilter = document.getElementById("typeFilter")?.value || "ALL";
  const statusFilter = document.getElementById("statusFilter")?.value || "ALL";
  const sortOrder = document.getElementById("sortOrderSelect")?.value || "NEWEST";

  let filtered = allInquiries.filter(item => {
    // 1. Category Tab Filter
    let matchesTab = true;
    const isOrder = item.type === "COD_ORDER" || (item.address && item.address.trim().length > 0);
    if (activeCategoryTab === "ORDERS") matchesTab = isOrder;
    else if (activeCategoryTab === "CONSULTATIONS") matchesTab = !isOrder;
    else if (activeCategoryTab === "New") matchesTab = item.status === "New";
    else if (activeCategoryTab === "Contacted") matchesTab = item.status === "Contacted";
    else if (activeCategoryTab === "Resolved") matchesTab = item.status === "Resolved";

    // 2. Type Dropdown Filter
    let matchesType = true;
    if (typeFilter === "COD_ORDER") matchesType = isOrder;
    else if (typeFilter === "CONSULTATION") matchesType = !isOrder;

    // 3. Status Dropdown Filter
    let matchesStatus = (statusFilter === "ALL" || item.status === statusFilter);

    // 4. Search Filter (Multi-field)
    let matchesSearch = true;
    if (query) {
      matchesSearch = (item.id && item.id.toLowerCase().includes(query)) ||
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.contact && item.contact.toLowerCase().includes(query)) ||
        (item.issue && item.issue.toLowerCase().includes(query)) ||
        (item.address && item.address.toLowerCase().includes(query)) ||
        (item.details && item.details.toLowerCase().includes(query));
    }

    return matchesTab && matchesType && matchesStatus && matchesSearch;
  });

  // Strict Ordering & Sorting
  filtered = sortInquiries(filtered, sortOrder);

  renderInquiries(filtered);
  updateStats();
  updateTabBadges();
};

function sortInquiries(list, order) {
  const sorted = [...list];
  switch (order) {
    case "NEWEST": // Default: Chronological Newest First
      return sorted.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    
    case "OLDEST": // Chronological Oldest First
      return sorted.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    case "URGENT": // Status: New first, then Contacted, then Resolved
      const statusRank = { "New": 1, "Contacted": 2, "Resolved": 3 };
      return sorted.sort((a, b) => {
        const rankDiff = (statusRank[a.status] || 99) - (statusRank[b.status] || 99);
        if (rankDiff !== 0) return rankDiff;
        return new Date(b.date || 0) - new Date(a.date || 0);
      });

    case "ORDERS_FIRST": // COD Orders First
      return sorted.sort((a, b) => {
        const aOrder = a.type === "COD_ORDER" || (a.address && a.address.trim().length > 0) ? 1 : 2;
        const bOrder = b.type === "COD_ORDER" || (b.address && b.address.trim().length > 0) ? 1 : 2;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(b.date || 0) - new Date(a.date || 0);
      });

    case "CONSULT_FIRST": // Consultations First
      return sorted.sort((a, b) => {
        const aConsult = a.type !== "COD_ORDER" && (!a.address || !a.address.trim().length) ? 1 : 2;
        const bConsult = b.type !== "COD_ORDER" && (!b.address || !b.address.trim().length) ? 1 : 2;
        if (aConsult !== bConsult) return aConsult - bConsult;
        return new Date(b.date || 0) - new Date(a.date || 0);
      });

    case "NAME_AZ": // Customer Name (A-Z)
      return sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    default:
      return sorted.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }
}

function renderInquiries(list) {
  const container = document.getElementById("inquiriesListContainer");
  if (!container) return;

  const storedUser = localStorage.getItem("herbo_admin_user");
  let isMasterUser = false;
  try {
    isMasterUser = JSON.parse(storedUser)?.role === "admin";
  } catch (e) {}

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-inquiries-box">
        <div class="empty-icon">🩺</div>
        <h3>No Inquiries or Orders Matching Filter</h3>
        <p>No customer records match the active criteria. Click below to view all records or open the customer storefront.</p>
        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
          <button class="btn-auth-secondary" style="width:auto; padding:8px 18px;" onclick="resetAllFilters()">
            ✕ Reset All Filters
          </button>
          <a href="index.html" class="btn-visit-store">
            🌐 Open Storefront ➔
          </a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const cleanPhone = (item.contact || "").replace(/[^0-9]/g, "");
    const dateObj = item.date ? new Date(item.date) : new Date();
    
    // Relative Time calculation
    const relativeTime = getRelativeTime(dateObj);
    const fullDateString = dateObj.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const isCodOrder = item.type === "COD_ORDER" || (item.address && item.address.trim().length > 0);
    const cardClass = isCodOrder ? "inquiry-card card-type-order" : "inquiry-card card-type-consultation";
    
    const typeBadge = isCodOrder 
      ? `<span class="badge-card-type badge-type-order">📦 CASH ON DELIVERY ORDER</span>`
      : `<span class="badge-card-type badge-type-consultation">🩺 DOCTOR CONSULTATION</span>`;

    // Tailored WhatsApp reply message
    let doctorReplyText = "";
    if (isCodOrder) {
      doctorReplyText = encodeURIComponent(
        `Hello ${item.name || 'Customer'},\nThis is Herbo India regarding your Cash on Delivery Order #${item.id}.\n• Product: ${item.issue || 'Ayurvedic Wellness Pack'}\n• Delivery Address: ${item.address || 'Confidential'}\nWe are preparing your 100% discreet security parcel for dispatch. Please confirm if we can dispatch your COD parcel today.`
      );
    } else {
      doctorReplyText = encodeURIComponent(
        `Hello ${item.name || 'Patient'},\nThis is Senior Ayurvedic Specialist from Herbo India regarding your confidential medical consultation #${item.id}.\nWe have reviewed your symptoms (${item.issue || 'Consultation'}). Please let us know when is a comfortable time to discuss your customized course in complete privacy.`
      );
    }

    return `
      <div class="${cardClass}" id="card-${item.id}">
        <!-- Top Row: Identification, Type, Date & Status -->
        <div class="inquiry-header">
          <div class="ticket-title">
            <span class="ticket-id-pill" onclick="copyToClipboard('${escapeHtml(item.id)}', 'Ticket ID')" title="Click to copy ID">
              🛡️ ${escapeHtml(item.id)} <span class="btn-copy-mini">📋</span>
            </span>
            <span style="font-size:1.15rem; color:#0f172a; font-weight:800;">${escapeHtml(item.name || 'Anonymous Patient')}</span>
            ${typeBadge}
            ${item.language ? `<span style="font-size:0.72rem; background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:9999px; font-weight:700;">${escapeHtml(item.language.toUpperCase())}</span>` : ''}
          </div>

          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:0.82rem; color:#64748b; font-weight:700; white-space:nowrap;" title="${fullDateString}">
              ⏱️ ${relativeTime}
            </span>
            <span class="badge-status status-${item.status}">${item.status}</span>
          </div>
        </div>

        <!-- Key Details Grid: Phone, Remedy/Symptom, Age, Duration -->
        <div class="inquiry-meta-grid">
          <div class="inquiry-meta-item">
            <span class="inquiry-meta-label">📞 Patient Phone / WhatsApp:</span>
            <span class="inquiry-meta-value">
              <strong style="color:var(--primary-blue); font-size:1.05rem;">${escapeHtml(item.contact || 'Not Provided')}</strong>
              ${cleanPhone && cleanPhone.length >= 10 ? `
                <button type="button" class="btn-copy-mini" onclick="copyToClipboard('${cleanPhone}', 'Phone number')" title="Copy phone number">📋</button>
              ` : ''}
            </span>
          </div>

          <div class="inquiry-meta-item">
            <span class="inquiry-meta-label">🩺 Remedy / Primary Concern:</span>
            <span class="inquiry-meta-value" style="color:#0f172a;">
              ${escapeHtml(item.issue || 'Ayurvedic Treatment')}
            </span>
          </div>

          ${item.age ? `
            <div class="inquiry-meta-item">
              <span class="inquiry-meta-label">👤 Patient Age:</span>
              <span class="inquiry-meta-value">${escapeHtml(item.age)} Years</span>
            </div>
          ` : ''}

          ${item.duration ? `
            <div class="inquiry-meta-item">
              <span class="inquiry-meta-label">⏱️ Problem Duration:</span>
              <span class="inquiry-meta-value">${escapeHtml(item.duration)}</span>
            </div>
          ` : ''}
        </div>

        <!-- If COD Order: Dedicated Amber Delivery Address Box -->
        ${item.address ? `
          <div class="cod-address-box">
            <div>
              <div class="cod-address-title">
                <span>📍 Doorstep Cash-on-Delivery (COD) Shipping Address:</span>
              </div>
              <div class="cod-address-text">${escapeHtml(item.address)}</div>
            </div>
            <button type="button" class="btn-sync-now" style="padding:5px 12px; font-size:0.75rem; white-space:nowrap;" onclick="copyToClipboard('${escapeHtml(item.address)}', 'Delivery Address')">
              📋 Copy Address
            </button>
          </div>
        ` : ''}

        <!-- Case Notes / Symptoms Box -->
        <div class="inquiry-details">
          <strong style="color:var(--primary-blue, #4353ff); display:block; margin-bottom:4px; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px;">
            🩺 ${isCodOrder ? 'Customer Order Notes:' : 'Patient Clinical Symptoms & Case Notes:'}
          </strong>
          ${escapeHtml(item.details || (isCodOrder ? 'Requested 100% confidential discreet COD delivery parcel.' : 'Patient requested direct private doctor discussion.'))}
        </div>

        <!-- Card Actions & Quick Status Switcher -->
        <div class="inquiry-actions">
          <!-- Interactive Status Segmented Controller -->
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.8rem; font-weight:800; color:#64748b; text-transform:uppercase;">Status:</span>
            <div class="status-segmented-group">
              <button type="button" class="status-seg-btn ${item.status === 'New' ? 'active-new' : ''}" onclick="updateInquiryStatus('${item.id}', 'New')">
                🔴 Urgent
              </button>
              <button type="button" class="status-seg-btn ${item.status === 'Contacted' ? 'active-contacted' : ''}" onclick="updateInquiryStatus('${item.id}', 'Contacted')">
                🔵 In Consult
              </button>
              <button type="button" class="status-seg-btn ${item.status === 'Resolved' ? 'active-resolved' : ''}" onclick="updateInquiryStatus('${item.id}', 'Resolved')">
                🟢 Dispatched
              </button>
            </div>
            ${isMasterUser ? `
              <button type="button" class="btn-delete-entry" onclick="deleteInquiry('${item.id}')" title="Delete this entry (Master Admin Only)">
                🗑️
              </button>
            ` : ''}
          </div>

          <!-- Quick WhatsApp & Call Action Buttons -->
          <div class="action-btn-group">
            ${cleanPhone && cleanPhone.length >= 10 ? `
              <a href="https://wa.me/91${cleanPhone}?text=${doctorReplyText}" target="_blank" class="btn-act-wa" title="Open WhatsApp chat with prefilled template">
                <svg class="wa-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.66 20.16 9.3 19.8 8.1 19.09L7.81 18.92L4.7 19.74L5.53 16.71L5.34 16.41C4.55 15.15 4.14 13.55 4.14 11.92C4.14 7.38 7.84 3.67 12.05 3.67ZM8.79 7.38C8.61 7.38 8.32 7.45 8.08 7.71C7.84 7.97 7.15 8.62 7.15 9.94C7.15 11.26 8.11 12.54 8.24 12.72C8.38 12.89 10.12 15.59 12.78 16.74C13.42 17.01 13.91 17.18 14.3 17.3C14.94 17.51 15.52 17.48 15.98 17.41C16.5 17.33 17.57 16.76 17.8 16.12C18.02 15.48 18.02 14.93 17.96 14.82C17.89 14.71 17.72 14.65 17.45 14.51C17.19 14.38 15.88 13.74 15.64 13.65C15.4 13.56 15.22 13.52 15.05 13.78C14.88 14.04 14.39 14.61 14.24 14.78C14.09 14.96 13.95 14.98 13.68 14.85C13.42 14.71 12.58 14.44 11.58 13.55C10.8 12.85 10.28 11.99 10.13 11.73C9.98 11.47 10.12 11.33 10.25 11.2C10.37 11.08 10.51 10.9 10.65 10.74C10.78 10.58 10.83 10.46 10.92 10.29C11 10.11 10.96 9.96 10.89 9.83C10.83 9.7 10.34 8.51 10.14 8.02C9.94 7.54 9.74 7.61 9.58 7.6C9.44 7.59 9.27 7.59 9.09 7.59L8.79 7.38Z"/>
                </svg>
                ${isCodOrder ? 'Confirm COD Delivery' : 'Doctor WhatsApp'}
              </a>
              <a href="tel:${cleanPhone}" class="btn-act-call" title="Call ${cleanPhone}">
                📞 Call
              </a>
            ` : `
              <span style="font-size:0.82rem; color:#64748b; font-style:italic;">🔒 Confidential Anonymous Form</span>
            `}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Instant Status Update
window.updateInquiryStatus = async function(id, newStatus) {
  const item = allInquiries.find(i => i.id === id);
  if (item) {
    item.status = newStatus;
    saveToStorage();
    updateStats();
    updateTabBadges();
    filterInquiries();
    showToast(`✓ ${item.id} status updated to: ${newStatus}`);

    try {
      const token = localStorage.getItem("herbo_admin_token") || "";
      await fetch(`${API_BASE}/api/enquiries/${id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {}
  }
};

window.deleteInquiry = async function(id) {
  if (confirm(`Are you sure you want to permanently delete record ${id}?`)) {
    allInquiries = allInquiries.filter(i => i.id !== id);
    saveToStorage();
    updateStats();
    updateTabBadges();
    filterInquiries();
    showToast(`🗑️ ${id} deleted`);

    try {
      const token = localStorage.getItem("herbo_admin_token") || "";
      await fetch(`${API_BASE}/api/enquiries/${id}`, { 
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
    } catch (e) {}
  }
};

window.resetAllFilters = function() {
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClearBtn");
  const typeFilter = document.getElementById("typeFilter");
  const statusFilter = document.getElementById("statusFilter");
  const sortOrder = document.getElementById("sortOrderSelect");

  if (input) input.value = "";
  if (clearBtn) clearBtn.style.display = "none";
  if (typeFilter) typeFilter.value = "ALL";
  if (statusFilter) statusFilter.value = "ALL";
  if (sortOrder) sortOrder.value = "NEWEST";

  activeCategoryTab = "ALL";
  document.querySelectorAll(".crm-tab").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === "ALL");
  });

  filterInquiries();
  showToast("✓ Filters reset to default order");
};

// Clipboard Helper
window.copyToClipboard = function(text, label) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`✓ ${label} copied to clipboard!`);
    }).catch(() => {
      fallbackCopy(text, label);
    });
  } else {
    fallbackCopy(text, label);
  }
};

function fallbackCopy(text, label) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showToast(`✓ ${label} copied!`);
  } catch (e) {}
  document.body.removeChild(ta);
}

// Toast Notification
function showToast(msg) {
  const toast = document.getElementById("adminToast");
  if (!toast) return;
  toast.innerText = msg;
  toast.style.display = "flex";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toast.style.display = "none";
  }, 2400);
}

function getRelativeTime(date) {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 45) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

window.exportToCSV = function() {
  const storedUser = localStorage.getItem("herbo_admin_user");
  let isMaster = false;
  try { isMaster = JSON.parse(storedUser)?.role === "admin"; } catch (e) {}
  if (!isMaster) {
    alert("🔒 Access Denied: Sub-admins have restricted clinical rights and cannot export patient databases. Please contact Master Admin.");
    return;
  }

  if (allInquiries.length === 0) {
    alert("No records to export.");
    return;
  }

  const headers = ["Ticket/Order ID", "Type", "Received Date", "Customer Name", "Age", "Product / Primary Issue", "Duration", "Delivery Address", "Symptoms / Notes", "Contact Number", "Status"];
  const rows = allInquiries.map(i => [
    `"${i.id}"`,
    `"${i.type || (i.address ? 'COD_ORDER' : 'CONSULTATION')}"`,
    `"${new Date(i.date || Date.now()).toLocaleString('en-IN')}"`,
    `"${(i.name || '').replace(/"/g, '""')}"`,
    `"${i.age || ''}"`,
    `"${(i.issue || '').replace(/"/g, '""')}"`,
    `"${(i.duration || '').replace(/"/g, '""')}"`,
    `"${(i.address || '').replace(/"/g, '""')}"`,
    `"${(i.details || '').replace(/"/g, '""')}"`,
    `"${(i.contact || '').replace(/"/g, '""')}"`,
    `"${i.status}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Herbo_India_Inquiries_Export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("📥 Exported patient records to CSV!");
};

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
