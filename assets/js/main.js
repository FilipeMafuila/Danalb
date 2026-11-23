/**
 * DANALB EXPRESS - SERVIÇOS DE TÁXI
 * Script Principal: Validação do Formulário, Datas, Passageiros e Integração WhatsApp
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initDateConstraints();
  initPassengerSelector();
  initBookingForm();
});

/**
 * 1. COMPORTAMENTO DO HEADER NO SCROLL
 */
function initHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header.classList.add('bg-white/95', 'shadow-sm', 'py-3');
      header.classList.remove('py-4');
    } else {
      header.classList.remove('bg-white/95', 'shadow-sm', 'py-3');
      header.classList.add('py-4');
    }
  });
}

/**
 * 2. REGRAS DE DATA (Proibir datas passadas no agendamento)
 */
function initDateConstraints() {
  const dataInput = document.getElementById('viagemData');
  if (dataInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const minDate = `${yyyy}-${mm}-${dd}`;
    dataInput.setAttribute('min', minDate);
    if (!dataInput.value) {
      dataInput.value = minDate;
    }
  }

  // Preencher horário sugerido para a próxima hora
  const horaInput = document.getElementById('viagemHora');
  if (horaInput && !horaInput.value) {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const hh = String(now.getHours()).padStart(2, '0');
    horaInput.value = `${hh}:00`;
  }
}

/**
 * 3. SELETOR INTERATIVO DE PASSAGEIROS (1 a 4)
 */
function initPassengerSelector() {
  const passButtons = document.querySelectorAll('.passenger-btn');
  const passInput = document.getElementById('numeroPassageiros');

  if (!passButtons.length || !passInput) return;

  passButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const count = btn.getAttribute('data-count');
      passInput.value = count;

      passButtons.forEach(b => {
        b.classList.remove('bg-[#0A2559]', 'text-white', 'shadow-sm');
        b.classList.add('bg-[#F1F5F9]', 'text-slate-700');
      });

      btn.classList.remove('bg-[#F1F5F9]', 'text-slate-700');
      btn.classList.add('bg-[#0A2559]', 'text-white', 'shadow-sm');
    });
  });
}

/**
 * 4. VALIDAÇÃO E PROCESSAMENTO DO FORMULÁRIO (ESPECIFICAÇÃO COMPLETA)
 */
function initBookingForm() {
  const form = document.getElementById('solicitarTransporteForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nome = document.getElementById('clienteNome').value.trim();
    const telefone = document.getElementById('clienteTelefone').value.trim();
    const email = document.getElementById('clienteEmail') ? document.getElementById('clienteEmail').value.trim() : '';
    const empresa = document.getElementById('clienteEmpresa') ? document.getElementById('clienteEmpresa').value.trim() : '';
    const partida = document.getElementById('localPartida').value.trim();
    const destino = document.getElementById('localDestino').value.trim();
    const data = document.getElementById('viagemData').value;
    const hora = document.getElementById('viagemHora').value;
    const passageiros = document.getElementById('numeroPassageiros').value || '1';
    const mensagem = document.getElementById('mensagemAdicional').value.trim();

    // Validações essenciais
    if (!nome) {
      showToast('Por favor, informe o seu Nome Completo.', 'error');
      document.getElementById('clienteNome').focus();
      return;
    }

    if (!telefone || telefone.length < 9) {
      showToast('Por favor, informe um número de Telefone válido (ex: 936 611 252).', 'error');
      document.getElementById('clienteTelefone').focus();
      return;
    }

    if (!partida) {
      showToast('Por favor, indique o Local de Partida.', 'error');
      document.getElementById('localPartida').focus();
      return;
    }

    if (!destino) {
      showToast('Por favor, indique o Destino pretendido.', 'error');
      document.getElementById('localDestino').focus();
      return;
    }

    if (!data) {
      showToast('Por favor, selecione a Data da viagem.', 'error');
      document.getElementById('viagemData').focus();
      return;
    }

    // Proibir datas passadas
    const todayStr = new Date().toISOString().split('T')[0];
    if (data < todayStr) {
      showToast('A data da viagem não pode ser anterior ao dia de hoje.', 'error');
      return;
    }

    if (!hora) {
      showToast('Por favor, indique o Horário pretendido.', 'error');
      document.getElementById('viagemHora').focus();
      return;
    }

    // Feedback visual de envio
    const submitBtn = document.getElementById('btnSubmitForm');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
      A registar solicitação...
    `;

    setTimeout(() => {
      // Gerar código único de referência
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const year = new Date().getFullYear();
      const pedidoRef = `DAN-${year}-${randomNum}`;

      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;

      // Exibir modal de confirmação com resumo e botão direto de WhatsApp
      showSuccessModal({
        ref: pedidoRef,
        nome,
        telefone,
        email,
        empresa,
        partida,
        destino,
        data,
        hora,
        passageiros,
        mensagem
      });

      form.reset();
      initDateConstraints();
    }, 800);
  });
}

/**
 * 5. MODAL DE SUCESSO & INTEGRAÇÃO WHATSAPP OFICIAL (936 611 252)
 */
function showSuccessModal(pedido) {
  const modal = document.getElementById('successModal');
  if (!modal) return;

  document.getElementById('modalRefPedido').textContent = `#${pedido.ref}`;
  document.getElementById('modalNome').textContent = pedido.nome;
  document.getElementById('modalTelefone').textContent = pedido.telefone;
  document.getElementById('modalPartida').textContent = pedido.partida;
  document.getElementById('modalDestino').textContent = pedido.destino;
  document.getElementById('modalDataHora').textContent = `${formatDatePT(pedido.data)} às ${pedido.hora}`;
  document.getElementById('modalPassageiros').textContent = `${pedido.passageiros} passageiro(s)`;

  // Mensagem estruturada para a central de táxis no WhatsApp (+244 936 611 252)
  const zapText = `*SOLICITAÇÃO DE TRANSPORTE - DANALB EXPRESS*%0A` +
    `*Ref:* ${pedido.ref}%0A` +
    `*Cliente:* ${pedido.nome}%0A` +
    `*Telefone:* ${pedido.telefone}%0A` +
    (pedido.empresa ? `*Empresa:* ${pedido.empresa}%0A` : '') +
    `*Origem:* ${pedido.partida}%0A` +
    `*Destino:* ${pedido.destino}%0A` +
    `*Data e Hora:* ${formatDatePT(pedido.data)} às ${pedido.hora}%0A` +
    `*Passageiros:* ${pedido.passageiros}%0A` +
    (pedido.mensagem ? `*Obs:* ${pedido.mensagem}%0A` : '') +
    `%0A_Aguardando confirmação de agendamento pela equipa._`;

  const btnZapModal = document.getElementById('btnModalWhatsApp');
  if (btnZapModal) {
    btnZapModal.href = `https://wa.me/244936611252?text=${zapText}`;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';

  const closeBtns = modal.querySelectorAll('.close-modal-btn');
  closeBtns.forEach(btn => {
    btn.onclick = () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.style.overflow = '';
    };
  });
}

function formatDatePT(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * 6. SISTEMA DE TOAST ALERTS
 */
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgClass = type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white';
  const icon = type === 'error' ? '⚠️' : 'ℹ️';

  toast.className = `${bgClass} shadow-xl rounded-xl p-4 text-sm font-medium flex items-center gap-3 transform transition-all duration-300 translate-y-[-10px] opacity-0 pointer-events-auto`;
  toast.innerHTML = `
    <span class="text-lg">${icon}</span>
    <span class="flex-1">${message}</span>
  `;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-[-10px]', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-[-10px]', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}
