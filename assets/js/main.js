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

  if (!bookingForm) return;

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!bookingForm.reportValidity()) return;

    const submitButton = bookingForm.querySelector('button[type="submit"]');
    const formData = Object.fromEntries(new FormData(bookingForm).entries());
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    submitButton.innerHTML = 'A enviar pedido <span aria-hidden="true">…</span>';
    formStatus.dataset.state = "sending";
    formStatus.textContent = "A enviar o pedido por e-mail…";

    try {
      const response = await fetch("/api/transport-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(result.message || "Pedido não enviado");

      formStatus.dataset.state = "success";
      formStatus.textContent = result.message;
      bookingForm.reset();
    } catch {
      formStatus.dataset.state = "error";
      formStatus.textContent = "Não foi possível enviar o pedido. Tente novamente ou contacte-nos por telefone.";
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      submitButton.innerHTML = 'Enviar pedido por e-mail <span aria-hidden="true">↗</span>';
    }
  });
});
