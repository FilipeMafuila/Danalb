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

  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!bookingForm.reportValidity()) return;

    const formData = new FormData(bookingForm);
    const date = String(formData.get("data"));
    const [year, month, day] = date.split("-");
    const message = [
      "*Pedido de transporte — DANALB EXPRESS*",
      "",
      `*Nome:* ${formData.get("nome")}`,
      `*Telefone:* ${formData.get("telefone")}`,
      `*Origem:* ${formData.get("origem")}`,
      `*Destino:* ${formData.get("destino")}`,
      `*Data:* ${day}/${month}/${year}`,
      `*Hora:* ${formData.get("hora")}`,
      `*Passageiros:* ${formData.get("passageiros")}`,
      formData.get("mensagem") ? `*Notas:* ${formData.get("mensagem")}` : "",
    ].filter(Boolean).join("\n");

    const whatsappUrl = `https://wa.me/244936611252?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    formStatus.textContent = "O WhatsApp foi aberto com os dados da viagem. Envie a mensagem para concluir o pedido.";
  });
});
