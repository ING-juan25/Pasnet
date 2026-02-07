/* =========================
   CLIENTES - COBRANZA
========================= */

const listaClientes = document.getElementById('listaClientes');
const btnAgregarCliente = document.getElementById('btnAgregarCliente');

const API = 'https://pasnet-backend.onrender.com';

/* =========================
   CARGAR CLIENTES
========================= */
function cargarClientes() {
  fetch(`${API}/clientes`, {
    credentials: 'include'
  })
    .then(res => {
      if (res.status === 401) {
        alert('⚠️ Sesión no válida');
        location.href = 'login.html';
        return null;
      }
      return res.json();
    })
    .then(data => {
      if (!data || !listaClientes) return;

      listaClientes.innerHTML = '';

      data.forEach(c => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = c.id;

        card.innerHTML = `
          <div class="card-header">
            <h3>${c.nombre}</h3>
            <input type="checkbox" ${c.estado === 'pagado' ? 'checked' : ''}>
          </div>

          <div class="card-body hidden">
            <p>📞 ${c.telefono || ''}</p>
            <p>🏠 ${c.direccion || ''}</p>

            <label>💰 Deuda</label>
            <input class="deuda" type="number" value="${c.deuda || 0}">

            <label>💵 Abono</label>
            <input class="abono" type="number" value="${c.abono || 0}">

            <label>📅 Fecha de cobro</label>
            <input class="fecha" type="date" value="${c.fecha_cobro || ''}">

            <button class="btn-guardar">✏️ Guardar cambios</button>
          </div>
        `;

        // desplegar
        card.addEventListener('click', e => {
          if (e.target.type === 'checkbox') return;
          card.querySelector('.card-body').classList.toggle('hidden');
        });

        // marcar pagado
        card.querySelector('input[type="checkbox"]').addEventListener('click', e => {
          e.stopPropagation();
          marcarPagado(c.id);
        });

        // guardar cambios
        card.querySelector('.btn-guardar').addEventListener('click', e => {
          e.stopPropagation();
          guardarCambios(c.id);
        });

        listaClientes.appendChild(card);
      });
    })
    .catch(err => {
      console.error(err);
      alert('❌ Error cargando clientes');
    });
}

/* =========================
   AGREGAR CLIENTE
========================= */
if (btnAgregarCliente) {
  btnAgregarCliente.addEventListener('click', () => {
    const nombre = document.getElementById('c-nombre').value.trim();
    const telefono = document.getElementById('c-telefono').value.trim();
    const direccion = document.getElementById('c-direccion').value.trim();
    const deuda = document.getElementById('c-deuda').value;
    const fecha = document.getElementById('c-fecha').value;

    if (!nombre) {
      alert('❌ El nombre es obligatorio');
      return;
    }

    fetch(`${API}/clientes`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        telefono,
        direccion,
        deuda,
        fecha_cobro: fecha
      })
    })
      .then(() => cargarClientes())
      .catch(() => alert('❌ Error al guardar cliente'));
  });
}

/* =========================
   MARCAR PAGADO
========================= */
function marcarPagado(id) {
  fetch(`${API}/clientes/${id}/pagar`, {
    method: 'PUT',
    credentials: 'include'
  })
    .then(() => cargarClientes())
    .catch(() => alert('❌ Error al marcar pagado'));
}

/* =========================
   GUARDAR CAMBIOS
========================= */
function guardarCambios(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (!card) return;

  const deuda = card.querySelector('.deuda').value;
  const abono = card.querySelector('.abono').value;
  const fecha = card.querySelector('.fecha').value;

  fetch(`${API}/clientes/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deuda,
      abono,
      fecha_cobro: fecha
    })
  })
    .then(() => alert('✅ Datos actualizados'))
    .catch(() => alert('❌ Error al actualizar'));
}

/* =========================
   INIT
========================= */
cargarClientes();