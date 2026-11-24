/**
 * DANALB Angola · DANALB EXPRESS — Painel de Gestão (Admin)
 * Gestão direta e em tempo real de Pedidos, Viatura (4 Ângulos) e Contactos
 */

const STORAGE_KEYS = {
  AUTH: "danalb_admin_auth",
  ORDERS: "danalb_admin_orders",
  VEHICLE: "danalb_admin_vehicle",
  SETTINGS: "danalb_admin_settings"
};

// Dados Padrão Iniciais (Alinhados com a identidade da DANALB Angola e PDF da gráfica)
const INITIAL_DATA = {
  orders: [],
  vehicle: {
    modelo: "Suzuki Alto 800",
    matricula: "LDA-89-AE",
    cor: "Preto Metalizado",
    ano: 2022,
    km: 45200,
    status: "Disponível",
    angles: [
      {
        id: 1,
        title: "Ângulo 1 · Dianteira Esquerda",
        label: "Dianteira esquerda",
        caption: "Dianteira e lateral esquerda",
        url: "assets/images/d8b69083-7a4a-4a2f-8457-d968d3039d71.jpg"
      },
      {
        id: 2,
        title: "Ângulo 2 · Vidro Traseiro",
        label: "Vidro traseiro",
        caption: "Vidro traseiro com identificação oficial",
        url: "assets/images/traseira.jpg"
      },
      {
        id: 3,
        title: "Ângulo 3 · Traseira Lateral",
        label: "Traseira lateral",
        caption: "Traseira lateral completa",
        url: "assets/images/traseira lateral.jpg"
      },
      {
        id: 4,
        title: "Ângulo 4 · Dianteira Direita",
        label: "Dianteira direita",
        caption: "Dianteira e lateral direita",
        url: "assets/images/d8b69083-7a4a-4a2f-8457-d968d3039d71.jpg"
      }
    ]
  },
  settings: {
    companyName: "DANALB Angola · DANALB EXPRESS",
    phone: "+244 936 611 252",
    whatsapp: "244936611252",
    email: "geral@danalbangola.com",
    address: "Luanda, Angola"
  }
};

class AdminApp {
  constructor() {
    this.currentTab = "dashboard";
    this.statusFilter = "todos";
    this.searchTerm = "";

    this.initStorage();
    this.initElements();
    this.initEvents();
    this.checkAuth();
    this.startClock();
    this.initFirebaseListeners();
    this.render();
  }

  initFirebaseListeners() {
    const checkFb = () => {
      if (window.DanalbFirebase && typeof window.DanalbFirebase.onOrdersChange === "function") {
        // Escutar pedidos do Firestore em tempo real
        window.DanalbFirebase.onOrdersChange((cloudOrders) => {
          if (cloudOrders && cloudOrders.length > 0) {
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(cloudOrders));
            this.renderKPIs();
            this.renderOrdersTable();
            this.renderDashboardRecent();
            this.showToast("✓ Pedidos sincronizados com Firebase Firestore");
          }
        });

        // Escutar alterações da viatura
        window.DanalbFirebase.onVehicleChange((veh) => {
          if (veh) {
            localStorage.setItem(STORAGE_KEYS.VEHICLE, JSON.stringify(veh));
            this.renderVehicleSection();
          }
        });

        // Escutar definições da empresa
        window.DanalbFirebase.onSettingsChange((settings) => {
          if (settings) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
            this.renderSettingsSection();
          }
        });
      } else {
        setTimeout(checkFb, 400);
      }
    };
    checkFb();
  }

  initStorage() {
    const existingOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    // Limpar pedidos fictícios caso ainda estejam no cache do navegador
    if (!existingOrders || existingOrders.includes("DAN-1042") || existingOrders.includes("Baptista Manuel") || existingOrders.includes("Teresa Lourenço") || existingOrders.includes("Carlos Quaresma")) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.VEHICLE)) {
      localStorage.setItem(STORAGE_KEYS.VEHICLE, JSON.stringify(INITIAL_DATA.vehicle));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_DATA.settings));
    }
  }

  getOrders() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS)) || [];
    } catch {
      return [];
    }
  }

  saveOrders(orders) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    this.render();
  }

  getVehicle() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.VEHICLE)) || INITIAL_DATA.vehicle;
    } catch {
      return INITIAL_DATA.vehicle;
    }
  }

  saveVehicle(vehicle) {
    localStorage.setItem(STORAGE_KEYS.VEHICLE, JSON.stringify(vehicle));
    this.render();
  }

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || INITIAL_DATA.settings;
    } catch {
      return INITIAL_DATA.settings;
    }
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.render();
  }

  initElements() {
    this.loginOverlay = document.getElementById("loginOverlay");
    this.loginForm = document.getElementById("loginForm");
    this.logoutBtn = document.getElementById("logoutBtn");
    this.sidebar = document.getElementById("adminSidebar");
    this.mobileMenuBtn = document.getElementById("mobileMenuBtn");
    this.sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
    this.navItems = document.querySelectorAll(".nav-item");
    this.tabPanes = document.querySelectorAll(".tab-pane");
    this.pageTitle = document.getElementById("pageTitle");
    this.pageSubtitle = document.getElementById("pageSubtitle");
    this.clockEl = document.getElementById("systemClock");
    this.toastEl = document.getElementById("toastNotification");

    // Orders elements
    this.orderSearchInput = document.getElementById("orderSearchInput");
    this.filterButtons = document.querySelectorAll("#statusFilterButtons .filter-btn");
    this.ordersTableBody = document.getElementById("ordersTableBody");
    this.dashboardRecentTableBody = document.getElementById("dashboardRecentTableBody");
    this.dashboardFleetList = document.getElementById("dashboardFleetList");
    this.tableEmptyState = document.getElementById("tableEmptyState");

    // Modals
    this.orderModal = document.getElementById("orderModal");
    this.orderForm = document.getElementById("orderForm");

    // Forms
    this.vehicleForm = document.getElementById("vehicleDetailsForm");
    this.anglesGrid = document.getElementById("anglesEditorGrid");
    this.settingsForm = document.getElementById("settingsForm");

    // Quick buttons
    const btnNovoPedidoTop = document.getElementById("btnNovoPedidoTop");
    const btnNovoPedidoMain = document.getElementById("btnNovoPedidoMain");
    if (btnNovoPedidoTop) btnNovoPedidoTop.addEventListener("click", () => this.openOrderModal());
    if (btnNovoPedidoMain) btnNovoPedidoMain.addEventListener("click", () => this.openOrderModal());

    const btnExportCSV = document.getElementById("btnExportCSV");
    if (btnExportCSV) btnExportCSV.addEventListener("click", () => this.exportCSV());

    const btnDownloadBackup = document.getElementById("btnDownloadBackup");
    if (btnDownloadBackup) btnDownloadBackup.addEventListener("click", () => this.downloadBackup());

    const btnResetDemoData = document.getElementById("btnResetDemoData");
    if (btnResetDemoData) btnResetDemoData.addEventListener("click", () => this.resetDemoData());
  }

  initEvents() {
    // Auth
    if (this.loginForm) {
      this.loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        sessionStorage.setItem(STORAGE_KEYS.AUTH, "true");
        this.loginOverlay.classList.add("is-hidden");
        this.showToast("Sessão iniciada com sucesso!");
      });
    }

    if (this.logoutBtn) {
      this.logoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem(STORAGE_KEYS.AUTH);
        this.loginOverlay.classList.remove("is-hidden");
      });
    }

    // Sidebar Mobile & Backdrop
    this.sidebarBackdrop = document.getElementById("sidebarBackdrop");

    const toggleSidebar = (open) => {
      const isOpen = open !== undefined ? open : !this.sidebar.classList.contains("is-open");
      this.sidebar.classList.toggle("is-open", isOpen);
      if (this.sidebarBackdrop) {
        this.sidebarBackdrop.classList.toggle("is-open", isOpen);
      }
      document.body.style.overflow = isOpen ? "hidden" : "";
    };

    if (this.mobileMenuBtn) {
      this.mobileMenuBtn.addEventListener("click", () => toggleSidebar());
    }

    if (this.sidebarCloseBtn) {
      this.sidebarCloseBtn.addEventListener("click", () => toggleSidebar(false));
    }

    if (this.sidebarBackdrop) {
      this.sidebarBackdrop.addEventListener("click", () => toggleSidebar(false));
    }

    // Navigation
    this.navItems.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        this.switchTab(tab);
        toggleSidebar(false);
      });
    });

    // Orders Filter & Search
    if (this.orderSearchInput) {
      this.orderSearchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.renderOrdersTable();
      });
    }

    this.filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.filterButtons.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        this.statusFilter = btn.getAttribute("data-status");
        this.renderOrdersTable();
      });
    });

    // Order Form Submit
    if (this.orderForm) {
      this.orderForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleOrderSubmit();
      });
    }

    // Vehicle Form Submit (4 Ângulos e Dados)
    if (this.vehicleForm) {
      this.vehicleForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleVehicleSubmit();
      });
    }

    // Settings Form Submit (Contactos)
    if (this.settingsForm) {
      this.settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSettingsSubmit();
      });
    }

    // Ouvir novos pedidos submetidos na página inicial em tempo real
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEYS.ORDERS) {
        this.renderKPIs();
        this.renderOrdersTable();
        this.renderDashboardRecent();
        this.showToast("Novo pedido de viagem recebido do site!");
      }
    });
  }

  checkAuth() {
    const isAuth = sessionStorage.getItem(STORAGE_KEYS.AUTH);
    if (!isAuth) {
      this.loginOverlay.classList.remove("is-hidden");
    } else {
      this.loginOverlay.classList.add("is-hidden");
    }
  }

  startClock() {
    const updateTime = () => {
      const now = new Date();
      if (this.clockEl) {
        this.clockEl.textContent = now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    this.navItems.forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-tab") === tabId);
    });

    this.tabPanes.forEach((pane) => {
      pane.classList.toggle("is-active", pane.id === `tab-${tabId}`);
    });

    const titles = {
      dashboard: ["Dashboard Geral", "Acompanhe as viagens e o estado das operações em Luanda"],
      pedidos: ["Pedidos de Viagens", "Gestão de reservas feitas no site e despacho imediato"],
      viatura: ["Viatura & 4 Ângulos", "Gestão do Suzuki Alto preto. As fotos e estado refletem no site."],
      contactos: ["Contactos & Empresa", "Telefone, WhatsApp e e-mail que aparecem no site público."]
    };

    if (titles[tabId]) {
      this.pageTitle.textContent = titles[tabId][0];
      this.pageSubtitle.textContent = titles[tabId][1];
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  render() {
    this.renderKPIs();
    this.renderOrdersTable();
    this.renderDashboardRecent();
    this.renderVehicleSection();
    this.renderSettingsSection();
  }

  renderKPIs() {
    const orders = this.getOrders();
    const total = orders.length;
    const pendentes = orders.filter((o) => o.status === "Pendente").length;
    const concluidas = orders.filter((o) => o.status === "Concluída").length;
    const faturacao = orders
      .filter((o) => o.status === "Concluída")
      .reduce((acc, cur) => acc + (Number(cur.valor) || 0), 0);

    const kpiTotal = document.getElementById("kpiTotalViagens");
    const kpiPend = document.getElementById("kpiPendentes");
    const kpiConc = document.getElementById("kpiConcluidas");
    const kpiFat = document.getElementById("kpiFaturacao");
    const badgePend = document.getElementById("pendingOrdersBadge");

    if (kpiTotal) kpiTotal.textContent = String(total);
    if (kpiPend) kpiPend.textContent = String(pendentes);
    if (kpiConc) kpiConc.textContent = String(concluidas);
    if (kpiFat) kpiFat.textContent = faturacao.toLocaleString("pt-AO") + " Kz";
    if (badgePend) {
      badgePend.textContent = String(pendentes);
      badgePend.style.display = pendentes > 0 ? "inline-block" : "none";
    }

    // Filtros
    const counts = {
      todos: total,
      Pendente: pendentes,
      Confirmada: orders.filter((o) => o.status === "Confirmada").length,
      "Em Curso": orders.filter((o) => o.status === "Em Curso").length,
      Concluída: concluidas,
      Cancelada: orders.filter((o) => o.status === "Cancelada").length
    };

    Object.keys(counts).forEach((key) => {
      const el = document.getElementById(`count${key.replace(" ", "")}`);
      if (el) el.textContent = String(counts[key]);
    });
  }

  renderOrdersTable() {
    if (!this.ordersTableBody) return;
    const orders = this.getOrders();

    const filtered = orders.filter((order) => {
      const matchesStatus = this.statusFilter === "todos" || order.status === this.statusFilter;
      const term = this.searchTerm;
      const matchesSearch =
        !term ||
        (order.nome && order.nome.toLowerCase().includes(term)) ||
        (order.telefone && order.telefone.toLowerCase().includes(term)) ||
        (order.origem && order.origem.toLowerCase().includes(term)) ||
        (order.destino && order.destino.toLowerCase().includes(term)) ||
        (order.empresa && order.empresa.toLowerCase().includes(term)) ||
        (order.id && order.id.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });

    if (filtered.length === 0) {
      this.ordersTableBody.innerHTML = "";
      if (this.tableEmptyState) this.tableEmptyState.style.display = "block";
      return;
    }

    if (this.tableEmptyState) this.tableEmptyState.style.display = "none";

    this.ordersTableBody.innerHTML = filtered
      .map((order) => {
        const statusBadgeClass = {
          Pendente: "badge-status--pending",
          Confirmada: "badge-status--confirmed",
          "Em Curso": "badge-status--progress",
          Concluída: "badge-status--completed",
          Cancelada: "badge-status--cancelled"
        }[order.status] || "badge-status--pending";

        const cleanPhone = (order.telefone || "").replace(/\D/g, "");
        const waMsg = encodeURIComponent(`Olá ${order.nome}, entramos em contacto a partir da DANALB Angola sobre a sua solicitação de transporte (${order.origem} → ${order.destino}).`);

        return `
        <tr>
          <td><strong style="color: var(--brand); font-family: monospace;">${order.id}</strong></td>
          <td>
            <div style="font-weight: 600; color: var(--ink);">${order.nome}</div>
            <div style="font-size: 11.5px; color: var(--ink-soft);">${order.telefone}${order.empresa ? ` · <em>${order.empresa}</em>` : ""}</div>
          </td>
          <td>
            <div style="font-size: 13px; font-weight: 500;">${order.origem}</div>
            <div style="font-size: 11.5px; color: var(--accent);">→ ${order.destino}</div>
          </td>
          <td>
            <div>${order.data}</div>
            <div style="font-size: 11.5px; color: var(--muted);">${order.hora || "--:--"}</div>
          </td>
          <td>${order.passageiros || "1"} pass.</td>
          <td><strong>${(Number(order.valor) || 10000).toLocaleString("pt-AO")} Kz</strong></td>
          <td><span class="badge-status ${statusBadgeClass}">${order.status}</span></td>
          <td style="text-align: right;">
            <div class="row-actions" style="justify-content: flex-end; gap: 6px;">
              <a href="https://wa.me/244${cleanPhone}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="action-icon-btn action-icon-btn--wa" title="Conversar no WhatsApp">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </a>
              <button type="button" class="action-icon-btn" onclick="app.editOrder('${order.id}')" title="Editar Pedido">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button type="button" class="action-icon-btn action-icon-btn--danger" onclick="app.deleteOrder('${order.id}')" title="Eliminar Pedido">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  renderDashboardRecent() {
    if (!this.dashboardRecentTableBody) return;
    const orders = this.getOrders().slice(0, 5);

    this.dashboardRecentTableBody.innerHTML = orders
      .map((order) => {
        const statusBadgeClass = {
          Pendente: "badge-status--pending",
          Confirmada: "badge-status--confirmed",
          "Em Curso": "badge-status--progress",
          Concluída: "badge-status--completed",
          Cancelada: "badge-status--cancelled"
        }[order.status] || "badge-status--pending";

        const cleanPhone = (order.telefone || "").replace(/\D/g, "");

        return `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--ink);">${order.nome}</div>
            <div style="font-size: 11px; color: var(--muted);">${order.telefone}</div>
          </td>
          <td>
            <div style="font-size: 12.5px;">${order.origem} → ${order.destino}</div>
          </td>
          <td>${order.data} · ${order.hora || "--:--"}</td>
          <td>${order.passageiros || "1"}</td>
          <td><span class="badge-status ${statusBadgeClass}">${order.status}</span></td>
          <td>
            <a href="https://wa.me/244${cleanPhone}" target="_blank" class="btn btn--outline btn--sm" style="font-size: 11px; padding: 0 10px;">
              Falar no WhatsApp →
            </a>
          </td>
        </tr>
      `;
      })
      .join("");

    // Mini list da frota no dashboard
    if (this.dashboardFleetList) {
      const veh = this.getVehicle();
      const statusColor = veh.status === "Disponível" ? "#10b981" : (veh.status === "Em Viagem" ? "#f59e0b" : "#ef4444");
      this.dashboardFleetList.innerHTML = `
        <div class="fleet-mini-item">
          <img src="${(veh.angles && veh.angles[0] ? veh.angles[0].url : 'assets/images/d8b69083-7a4a-4a2f-8457-d968d3039d71.jpg')}" class="fleet-mini-img" alt="${veh.modelo}">
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 13.5px; color: var(--ink);">${veh.modelo}</div>
            <div style="font-size: 11px; font-family: monospace; color: var(--brand); font-weight: 700;">${veh.matricula}</div>
            <div style="font-size: 11.5px; color: ${statusColor}; font-weight: 600; margin-top: 2px;">● ${veh.status}</div>
          </div>
          <button class="btn btn--outline btn--sm" onclick="app.switchTab('viatura')">Editar 4 Fotos →</button>
        </div>
      `;
    }
  }

  // =========================================================================
  // GESTÃO DA VIATURA E DOS 4 ÂNGULOS (REFLETE DIRETO NO CARROSSEL DO SITE)
  // =========================================================================
  renderVehicleSection() {
    const veh = this.getVehicle();

    // Preencher campos de detalhes
    const elModelo = document.getElementById("adminVehModelo");
    const elMatricula = document.getElementById("adminVehMatricula");
    const elCor = document.getElementById("adminVehCor");
    const elAno = document.getElementById("adminVehAno");
    const elKm = document.getElementById("adminVehKm");
    const elStatus = document.getElementById("adminVehStatus");

    if (elModelo) elModelo.value = veh.modelo || "Suzuki Alto 800";
    if (elMatricula) elMatricula.value = veh.matricula || "LDA-89-AE";
    if (elCor) elCor.value = veh.cor || "Preto Metalizado";
    if (elAno) elAno.value = veh.ano || 2022;
    if (elKm) elKm.value = veh.km || 45200;
    if (elStatus) elStatus.value = veh.status || "Disponível";

    // Renderizar os 4 cards dos 4 ângulos
    if (!this.anglesGrid) return;
    const angles = veh.angles || INITIAL_DATA.vehicle.angles;

    this.anglesGrid.innerHTML = angles
      .map((angle, idx) => `
        <div class="angle-editor-card" data-index="${idx}">
          <div class="angle-editor-card__preview">
            <span class="angle-editor-card__num">${angle.title || `Ângulo ${idx + 1}`}</span>
            <img src="${angle.url}" id="previewAngle${idx}" alt="${angle.label}">
          </div>
          <div class="angle-editor-card__body">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--ink-soft); display: block; margin-bottom: 4px;">Legenda do Ângulo</label>
              <input type="text" class="angle-label-input" data-index="${idx}" value="${angle.label || ''}" placeholder="Ex.: Dianteira esquerda">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--ink-soft); display: block; margin-bottom: 4px;">Caminho ou URL da Imagem</label>
              <input type="text" class="angle-url-input" data-index="${idx}" value="${angle.url || ''}" placeholder="assets/images/...">
            </div>
            <div class="angle-editor-card__file-wrap">
              <span>Ou carregar foto do telemóvel/computador:</span>
              <input type="file" accept="image/*" class="angle-file-input" data-index="${idx}">
            </div>
          </div>
        </div>
      `)
      .join("");

    // Adicionar listeners para ficheiros e URLs dos 4 ângulos
    this.anglesGrid.querySelectorAll(".angle-file-input").forEach((fileInput) => {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        const idx = Number(fileInput.getAttribute("data-index"));
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const dataUrl = loadEvent.target.result;
          const previewImg = document.getElementById(`previewAngle${idx}`);
          if (previewImg) previewImg.src = dataUrl;

          const urlInput = this.anglesGrid.querySelector(`.angle-url-input[data-index="${idx}"]`);
          if (urlInput) urlInput.value = dataUrl;
        };
        reader.readAsDataURL(file);
      });
    });

    this.anglesGrid.querySelectorAll(".angle-url-input").forEach((urlInput) => {
      urlInput.addEventListener("input", (e) => {
        const idx = Number(urlInput.getAttribute("data-index"));
        const previewImg = document.getElementById(`previewAngle${idx}`);
        if (previewImg && e.target.value) {
          previewImg.src = e.target.value;
        }
      });
    });
  }

  handleVehicleSubmit() {
    const veh = this.getVehicle();
    veh.modelo = document.getElementById("adminVehModelo").value.trim();
    veh.matricula = document.getElementById("adminVehMatricula").value.trim();
    veh.cor = document.getElementById("adminVehCor").value.trim();
    veh.ano = Number(document.getElementById("adminVehAno").value) || 2022;
    veh.km = Number(document.getElementById("adminVehKm").value) || 45200;
    veh.status = document.getElementById("adminVehStatus").value;

    // Coletar as 4 fotos dos 4 ângulos
    const updatedAngles = [];
    for (let i = 0; i < 4; i++) {
      const labelInput = this.anglesGrid.querySelector(`.angle-label-input[data-index="${i}"]`);
      const urlInput = this.anglesGrid.querySelector(`.angle-url-input[data-index="${i}"]`);
      const defaultAngle = INITIAL_DATA.vehicle.angles[i];

      updatedAngles.push({
        id: i + 1,
        title: defaultAngle.title,
        label: labelInput ? labelInput.value.trim() : defaultAngle.label,
        caption: labelInput ? labelInput.value.trim() : defaultAngle.caption,
        url: urlInput && urlInput.value.trim() ? urlInput.value.trim() : defaultAngle.url
      });
    }

    veh.angles = updatedAngles;
    this.saveVehicle(veh);

    // Sincronizar na Nuvem Firebase
    if (window.DanalbFirebase && typeof window.DanalbFirebase.saveVehicle === "function") {
      window.DanalbFirebase.saveVehicle(veh).catch((e) => console.warn("Firebase save vehicle:", e));
    }

    const msg = document.getElementById("vehicleSaveMsg");
    if (msg) {
      msg.textContent = "✓ Viatura e 4 ângulos guardados! O site foi atualizado em tempo real.";
      msg.style.color = "#10b981";
      setTimeout(() => (msg.textContent = ""), 4500);
    }
    this.showToast("✓ Viatura guardada! As alterações refletem agora no site público.");
  }

  // =========================================================================
  // GESTÃO DE CONTACTOS E EMPRESA (REFLETE DIRETO NO SITE)
  // =========================================================================
  renderSettingsSection() {
    const settings = this.getSettings();
    const setName = document.getElementById("setCompanyName");
    const setPhone = document.getElementById("setPhone");
    const setWa = document.getElementById("setWhatsApp");
    const setEmail = document.getElementById("setEmail");
    const setAddress = document.getElementById("setAddress");

    if (setName) setName.value = settings.companyName || "";
    if (setPhone) setPhone.value = settings.phone || "";
    if (setWa) setWa.value = settings.whatsapp || "";
    if (setEmail) setEmail.value = settings.email || "";
    if (setAddress) setAddress.value = settings.address || "";
  }

  handleSettingsSubmit() {
    const settings = {
      companyName: document.getElementById("setCompanyName").value.trim(),
      phone: document.getElementById("setPhone").value.trim(),
      whatsapp: document.getElementById("setWhatsApp").value.trim(),
      email: document.getElementById("setEmail").value.trim(),
      address: document.getElementById("setAddress").value.trim()
    };

    this.saveSettings(settings);

    // Sincronizar na Nuvem Firebase
    if (window.DanalbFirebase && typeof window.DanalbFirebase.saveSettings === "function") {
      window.DanalbFirebase.saveSettings(settings).catch((e) => console.warn("Firebase save settings:", e));
    }

    const msg = document.getElementById("settingsSaveMsg");
    if (msg) {
      msg.textContent = "✓ Contactos guardados! O site reflete os novos dados imediatamente.";
      msg.style.color = "#10b981";
      setTimeout(() => (msg.textContent = ""), 4500);
    }
    this.showToast("✓ Contactos guardados! O site público foi atualizado.");
  }

  // =========================================================================
  // GESTÃO DE PEDIDOS (MODAL, CRIAÇÃO, EDIÇÃO, ELIMINAÇÃO)
  // =========================================================================
  openOrderModal(orderId = null) {
    this.orderForm.reset();
    const modalTitle = document.getElementById("orderModalTitle");
    const editIdInput = document.getElementById("orderEditId");

    if (orderId) {
      const orders = this.getOrders();
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      modalTitle.textContent = `Editar Pedido #${order.id}`;
      editIdInput.value = order.id;

      document.getElementById("orderNome").value = order.nome || "";
      document.getElementById("orderTelefone").value = order.telefone || "";
      document.getElementById("orderEmail").value = order.email || "";
      document.getElementById("orderEmpresa").value = order.empresa || "";
      document.getElementById("orderOrigem").value = order.origem || "";
      document.getElementById("orderDestino").value = order.destino || "";
      document.getElementById("orderData").value = order.data || "";
      document.getElementById("orderHora").value = order.hora || "";
      document.getElementById("orderPassageiros").value = order.passageiros || "1";
      document.getElementById("orderValor").value = order.valor || "";
      document.getElementById("orderStatus").value = order.status || "Pendente";
      document.getElementById("orderViatura").value = order.viatura || "Suzuki Alto (LDA-89-AE)";
      document.getElementById("orderMensagem").value = order.mensagem || "";
    } else {
      modalTitle.textContent = "Registar Novo Pedido de Viagem";
      editIdInput.value = "";
      document.getElementById("orderData").value = new Date().toISOString().slice(0, 10);
      document.getElementById("orderHora").value = "10:00";
      document.getElementById("orderStatus").value = "Pendente";
      document.getElementById("orderViatura").value = "Suzuki Alto (LDA-89-AE)";
    }

    this.orderModal.classList.add("is-active");
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("is-active");
  }

  handleOrderSubmit() {
    const editId = document.getElementById("orderEditId").value;
    const orders = this.getOrders();

    const orderData = {
      nome: document.getElementById("orderNome").value.trim(),
      telefone: document.getElementById("orderTelefone").value.trim(),
      email: document.getElementById("orderEmail").value.trim(),
      empresa: document.getElementById("orderEmpresa").value.trim(),
      origem: document.getElementById("orderOrigem").value.trim(),
      destino: document.getElementById("orderDestino").value.trim(),
      data: document.getElementById("orderData").value,
      hora: document.getElementById("orderHora").value,
      passageiros: document.getElementById("orderPassageiros").value,
      valor: Number(document.getElementById("orderValor").value) || 10000,
      status: document.getElementById("orderStatus").value,
      viatura: document.getElementById("orderViatura").value || "Suzuki Alto (LDA-89-AE)",
      mensagem: document.getElementById("orderMensagem").value.trim()
    };

    if (editId) {
      const idx = orders.findIndex((o) => o.id === editId);
      if (idx !== -1) {
        orders[idx] = { ...orders[idx], ...orderData };
        this.showToast(`Pedido #${editId} atualizado com sucesso!`);
      }
      if (window.DanalbFirebase && typeof window.DanalbFirebase.updateOrder === "function") {
        window.DanalbFirebase.updateOrder(editId, orderData).catch((e) => console.warn("Firebase update order:", e));
      }
    } else {
      const newRef = "DAN-" + (1050 + orders.length);
      orders.unshift({ id: newRef, ...orderData });
      this.showToast(`Novo pedido #${newRef} registado com sucesso!`);
      if (window.DanalbFirebase && typeof window.DanalbFirebase.createOrder === "function") {
        window.DanalbFirebase.createOrder(orderData).catch((e) => console.warn("Firebase create order:", e));
      }
    }

    this.saveOrders(orders);
    this.closeModal("orderModal");
  }

  editOrder(orderId) {
    this.openOrderModal(orderId);
  }

  deleteOrder(orderId) {
    if (!confirm(`Tem a certeza que deseja eliminar o pedido #${orderId}?`)) return;
    let orders = this.getOrders();
    orders = orders.filter((o) => o.id !== orderId);
    this.saveOrders(orders);
    if (window.DanalbFirebase && typeof window.DanalbFirebase.deleteOrder === "function") {
      window.DanalbFirebase.deleteOrder(orderId).catch((e) => console.warn("Firebase delete order:", e));
    }
    this.showToast(`Pedido #${orderId} eliminado com sucesso!`);
  }

  // =========================================================================
  // UTILITÁRIOS: CSV, BACKUP, RESTORE & TOAST
  // =========================================================================
  exportCSV() {
    const orders = this.getOrders();
    if (orders.length === 0) {
      alert("Não existem pedidos para exportar.");
      return;
    }

    const headers = ["ID", "Cliente", "Telefone", "Email", "Empresa", "Origem", "Destino", "Data", "Hora", "Passageiros", "Valor", "Estado", "Viatura"];
    const rows = orders.map((o) => [
      o.id,
      `"${(o.nome || '').replace(/"/g, '""')}"`,
      `"${o.telefone || ''}"`,
      `"${o.email || ''}"`,
      `"${(o.empresa || '').replace(/"/g, '""')}"`,
      `"${(o.origem || '').replace(/"/g, '""')}"`,
      `"${(o.destino || '').replace(/"/g, '""')}"`,
      o.data,
      o.hora,
      o.passageiros,
      o.valor,
      o.status,
      `"${o.viatura || ''}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pedidos-danalb-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast("Ficheiro CSV exportado com sucesso!");
  }

  downloadBackup() {
    const backup = {
      orders: this.getOrders(),
      vehicle: this.getVehicle(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup-danalb-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast("Cópia de segurança descarregada com sucesso!");
  }

  resetDemoData() {
    if (!confirm("Tem a certeza que deseja limpar todos os pedidos e repor o sistema a zeros?")) return;
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    this.render();
    this.showToast("✓ Pedidos limpos! O sistema está a zeros pronto para novos testes.");
  }

  showToast(message) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.add("is-visible");
    setTimeout(() => {
      this.toastEl.classList.remove("is-visible");
    }, 3800);
  }
}

// Inicializar aplicação
let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new AdminApp();
});
