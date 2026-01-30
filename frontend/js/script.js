/* =========================
   VARIABLES GLOBALES
========================= */
const cards = document.querySelectorAll('.card');
const modal = document.getElementById('modal');
const selectedPlan = document.getElementById('selectedPlan');
const closeBtn = document.querySelector('.close');
const planForm = document.getElementById('planForm');
const separator = document.querySelector('.separator');

const WHATSAPP_NUMBER = "573104063050"; // TU NÚMERO
let currentPlan = ""; // 👈 PLAN SELECCIONADO REAL

/* =========================
   ABRIR MODAL AL CLICK PLAN
========================= */
cards.forEach(card => {
  const button = card.querySelector('button');

  button.addEventListener('click', () => {
    currentPlan = card.dataset.plan;
    selectedPlan.textContent = `Plan seleccionado: ${currentPlan}`;
    modal.classList.add('active');
    modal.style.display = 'flex';
  });
});

/* =========================
   CERRAR MODAL
========================= */
closeBtn.addEventListener('click', closeModal);

window.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});

function closeModal() {
  modal.classList.remove('active');
  modal.style.display = 'none';
}

/* =========================
   ENVÍO FORMULARIO
   ➜ BD + WhatsApp
========================= */
planForm.addEventListener('submit', async e => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const direccion = document.getElementById('direccion').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const comentario = document.getElementById('comentario').value.trim();

  if (!nombre || !direccion || !telefono) {
    alert('❌ Completa los campos obligatorios');
    return;
  }

  const data = {
    plan: currentPlan,
    nombre,
    direccion,
    telefono,
    comentario
  };

  /* ---- GUARDAR EN BASE DE DATOS ---- */
  try {
    await fetch('https://pasnet-backend.onrender.com/solicitud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (error) {
    alert('❌ Error al guardar la solicitud');
    return;
  }

  /* ---- ENVIAR A WHATSAPP ---- */
  const mensaje = `
📡 *Solicitud de Internet Fibra Óptica*
━━━━━━━━━━━━━━━━━━━━
📦 Plan: ${currentPlan}
👤 Nombre: ${nombre}
🏠 Dirección: ${direccion}
📞 Teléfono: ${telefono}
📝 Comentario: ${comentario || 'N/A'}
━━━━━━━━━━━━━━━━━━━━
`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');

  planForm.reset();
  closeModal();
});

/* =========================
   VALIDACIONES VISUALES
========================= */
const inputs = document.querySelectorAll('input[required], textarea[required]');

inputs.forEach(input => {
  input.addEventListener('blur', () => {
    input.style.borderColor = input.value.trim()
      ? '#00f7ff'
      : '#ff3b3b';
  });
});

/* =========================
   ANIMACIÓN SEPARADOR SCROLL
========================= */
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        separator.classList.add('visible');
      }
    });
  },
  { threshold: 0.4 }
);

observer.observe(separator);

/* =========================
   EFECTO HOVER UX CARDS
========================= */
cards.forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--y', `${e.clientY - rect.top}px`);
  });
});

