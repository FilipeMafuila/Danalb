document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.getElementById("primaryNav");
  const bookingForm = document.getElementById("bookingForm");
  const dateInput = document.getElementById("viagemData");
  const formStatus = document.getElementById("formStatus");
  const yearLabel = document.getElementById("currentYear");

  if (yearLabel) yearLabel.textContent = String(new Date().getFullYear());

  if (dateInput) {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.min = today.toISOString().slice(0, 10);
  }

  if (menuToggle && navigation) {
    const closeMenu = () => {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menu");
      navigation.classList.remove("is-open");
    };

    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isExpanded));
      menuToggle.setAttribute("aria-label", isExpanded ? "Abrir menu" : "Fechar menu");
      navigation.classList.toggle("is-open", !isExpanded);
    });

    navigation.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  // Carrossel de ângulos da viatura com setas e indicadores
  const carousel = document.getElementById("vehicleCarousel");
  if (carousel) {
    const slides = carousel.querySelectorAll(".vehicle-carousel__slide");
    const dots = carousel.querySelectorAll(".indicator-dot");
    const prevBtn = document.getElementById("carouselPrev");
    const nextBtn = document.getElementById("carouselNext");
    const caption = document.getElementById("carouselCaption");
    let currentIndex = 0;
    const totalSlides = slides.length;

    const showSlide = (index) => {
      if (totalSlides === 0) return;
      currentIndex = (index + totalSlides) % totalSlides;

      slides.forEach((slide, i) => {
        slide.classList.toggle("is-active", i === currentIndex);
      });

      dots.forEach((dot, i) => {
        dot.classList.toggle("is-active", i === currentIndex);
      });

      if (caption && slides[currentIndex]) {
        caption.textContent = slides[currentIndex].getAttribute("data-caption") || `0${currentIndex + 1} / 0${totalSlides}`;
      }
    };

    if (prevBtn) {
      prevBtn.addEventListener("click", () => showSlide(currentIndex - 1));
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => showSlide(currentIndex + 1));
    }

    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => showSlide(i));
    });

    // Navegação por teclado quando o carrossel estiver em foco
    carousel.setAttribute("tabindex", "0");
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        showSlide(currentIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        showSlide(currentIndex + 1);
      }
    });

    // Suporte a swipe em ecrãs touch
    let touchStartX = 0;
    carousel.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    carousel.addEventListener("touchend", (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > 40) {
        if (diff < 0) {
          showSlide(currentIndex + 1); // deslize para esquerda -> próximo
        } else {
          showSlide(currentIndex - 1); // deslize para direita -> anterior
        }
      }
    }, { passive: true });
  }

  if (!bookingForm) return;

  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!bookingForm.reportValidity()) return;

    const formData = new FormData(bookingForm);
    const date = String(formData.get("data"));
    const [year, month, day] = date.split("-");
    const message = [
      "*Pedido de transporte — DANALB Angola*",
      "",
      `*Nome:* ${formData.get("nome")}`,
      `*Telefone:* ${formData.get("telefone")}`,
      `*E-mail:* ${formData.get("email")}`,
      formData.get("empresa") ? `*Empresa / Instituição:* ${formData.get("empresa")}` : "",
      `*Origem:* ${formData.get("origem")}`,
      `*Destino:* ${formData.get("destino")}`,
      `*Data:* ${day}/${month}/${year}`,
      `*Hora:* ${formData.get("hora")}`,
      `*Passageiros:* ${formData.get("passageiros")}`,
      formData.get("mensagem") ? `*Notas:* ${formData.get("mensagem")}` : "",
    ].filter(Boolean).join("\n");

    // Dados formatados do pedido
    const orderData = {
      nome: String(formData.get("nome")),
      telefone: String(formData.get("telefone")),
      email: String(formData.get("email") || ""),
      empresa: String(formData.get("empresa") || ""),
      origem: String(formData.get("origem")),
      destino: String(formData.get("destino")),
      data: date,
      hora: String(formData.get("hora")),
      passageiros: String(formData.get("passageiros")),
      valor: 10000,
      status: "Pendente",
      viatura: "Suzuki Alto (LDA-89-AE)",
      mensagem: String(formData.get("mensagem") || "Pedido submetido pelo formulário do site")
    };

    // 1. Gravar no Firebase Firestore (Nuvem em Tempo Real)
    if (window.DanalbFirebase && typeof window.DanalbFirebase.createOrder === "function") {
      window.DanalbFirebase.createOrder(orderData).then((firebaseId) => {
        if (firebaseId) {
          console.log("✓ Pedido gravado no Firebase com ID:", firebaseId);
        }
      }).catch((e) => console.warn("Firebase create order:", e));
    }

    // 2. Sincronizar também no LocalStorage (Backup e Painel Local)
    try {
      const orders = JSON.parse(localStorage.getItem("danalb_admin_orders") || "[]");
      const newRef = "DAN-" + (1050 + orders.length);
      orders.unshift({
        id: newRef,
        ...orderData
      });
      localStorage.setItem("danalb_admin_orders", JSON.stringify(orders));
    } catch (err) {
      console.warn("Sync admin error:", err);
    }

    // Enviar pedido por e‑mail via backend SMTP
    fetch('http://localhost:3001/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    })
      .then(r => r.json())
      .then(resp => {
        if (resp.success) {
          formStatus.textContent = '✅ Pedido enviado por e‑mail com sucesso.';
        } else {
          formStatus.textContent = '⚠️ Falha ao enviar e‑mail: ' + (resp.error || 'desconhecido');
        }
      })
      .catch(err => {
        console.error('Erro ao chamar API SMTP:', err);
        formStatus.textContent = '⚠️ Erro ao comunicar com o servidor de e‑mail.';
      });
  });

  // =========================================================================
  // SINCRONIZAÇÃO EM TEMPO REAL COM O PAINEL ADMIN (FOTOS, CONTACTOS E DADOS)
  // =========================================================================
  function syncWithAdminData() {
    try {
      // 1. Sincronizar Contactos e Informações da Empresa
      const settingsStr = localStorage.getItem("danalb_admin_settings");
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        if (settings.phone) {
          document.querySelectorAll('a[href^="tel:"]').forEach(el => {
            el.href = `tel:${settings.phone.replace(/\s+/g, "")}`;
            const strong = el.querySelector("strong");
            if (strong) strong.textContent = settings.phone;
            else if (el.classList.contains("topbar__phone") || el.closest(".topbar")) el.textContent = settings.phone;
          });
        }
        if (settings.email) {
          document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
            el.href = `mailto:${settings.email}`;
            const strong = el.querySelector("strong");
            if (strong) strong.textContent = settings.email;
          });
        }
        if (settings.whatsapp) {
          const cleanWa = settings.whatsapp.replace(/\D/g, "");
          document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
            try {
              const url = new URL(el.href);
              const text = url.searchParams.get("text") || "";
              el.href = `https://wa.me/${cleanWa}?text=${encodeURIComponent(text)}`;
            } catch (err) {
              el.href = `https://wa.me/${cleanWa}`;
            }
          });
        }
      }

      // 2. Sincronizar Viatura & Fotos dos 4 Ângulos
      const vehicleStr = localStorage.getItem("danalb_admin_vehicle");
      if (vehicleStr) {
        const veh = JSON.parse(vehicleStr);
        // Atualizar as 4 fotos dos ângulos do carrossel
        if (veh.angles && Array.isArray(veh.angles)) {
          const slides = document.querySelectorAll(".vehicle-carousel__slide");
          veh.angles.forEach((angle, idx) => {
            if (slides[idx] && angle.url) {
              const img = slides[idx].querySelector("img");
              if (img) img.src = angle.url;
              if (angle.label) {
                const tag = slides[idx].querySelector(".slide-tag");
                if (tag) tag.textContent = angle.label;
                slides[idx].setAttribute("data-caption", `0${idx + 1} / 04 · ${angle.label}`);
              }
            }
          });
          const caption = document.getElementById("carouselCaption");
          const activeSlide = document.querySelector(".vehicle-carousel__slide.is-active");
          if (caption && activeSlide) {
            caption.textContent = activeSlide.getAttribute("data-caption");
          }
        }
        // Atualizar matrícula e status da viatura
        if (veh.matricula) {
          const matEl = document.getElementById("vehicleMatriculaText");
          if (matEl) matEl.textContent = `${veh.matricula} (Oficial)`;
        }
        if (veh.status) {
          const statusEl = document.getElementById("vehicleStatusText");
          if (statusEl) {
            statusEl.textContent = `● ${veh.status}`;
            if (veh.status === "Disponível") {
              statusEl.style.color = "#10b981"; // verde
            } else if (veh.status === "Em Viagem") {
              statusEl.style.color = "#f59e0b"; // âmbar
            } else {
              statusEl.style.color = "#ef4444"; // vermelho
            }
          }
        }
      }
    } catch (err) {
      console.warn("Sync with admin error:", err);
    }
  }

  // Executar sincronização inicial
  syncWithAdminData();

  // Escutar eventos de armazenamento (quando alterado noutra aba ou janela do Admin)
  window.addEventListener("storage", (e) => {
    if (e.key === "danalb_admin_settings" || e.key === "danalb_admin_vehicle") {
      syncWithAdminData();
    }
  });
});
