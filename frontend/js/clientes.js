/* =========================
   CLIENTES - PASNET
========================= */

document.addEventListener('DOMContentLoaded', () => {

  const lista = document.getElementById('listaClientes');
  const buscador = document.getElementById('buscadorClientes');
  const btnImportar = document.getElementById('btnImportarExcel');
  const excelInput = document.getElementById('excelInput');
  

  const API = location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://pasnet-backend.onrender.com';

  console.log('API usada:', API);

  let clientesCache = [];
  let clienteActual = null;

  /* =========================
     CARGAR CLIENTES
  ========================= */
  async function cargarClientes() {
    try {
      const res = await fetch(`${API}/clientes`, { credentials: 'include' });

      if (res.status === 401) {
        alert('❌ Sesión expirada');
        location.href = 'login.html';
        return;
      }

      clientesCache = await res.json();
      renderClientes(clientesCache);

    } catch (err) {
      console.error(err);
      lista.innerHTML = '<p style="opacity:.7">❌ Error cargando clientes</p>';
    }
  }

  /* =========================
     RENDER CLIENTES (NUEVO DISEÑO)
  ========================= */
  function renderClientes(clientes) {
    lista.innerHTML = '';

    if (!clientes.length) {
      lista.innerHTML = '<p style="opacity:.6">No hay clientes registrados</p>';
      return;
    }

    clientes.forEach(c => {

      const deuda = Number(c.deuda || 0);
      const abonado = Number(c.abono || 0);
      const total = deuda + abonado;

      const porcentaje = total > 0
        ? Math.min(100, Math.round((abonado / total) * 100))
        : 100;

      const inicial = (c.nombre || 'N')[0].toUpperCase();

      const card = document.createElement('div');
      card.className = 'finance-card';

      card.innerHTML = `
        <div class="card-left">
          <div class="avatar">${inicial}</div>
          <div>
            <h3>${c.nombre || 'Sin nombre'}</h3>
            <p>${c.plan || 'Plan base'}</p>
            <small>📅 ${c.fecha_cobro || 'Sin fecha'}</small>
          </div>
        </div>

        <div class="card-right">
          <h2>$${deuda.toLocaleString()}</h2>
          <small>${porcentaje}% pagado</small>
        </div>

        <div class="progress-bar">
          <div class="progress" style="width:${porcentaje}%"></div>
        </div>
      `;

      card.addEventListener('click', () => abrirModalPago(c));

      lista.appendChild(card);
    });
  }

  /* =========================
     MODAL GLOBAL (REUTILIZADO)
  ========================= */

  const modal = document.getElementById("globalModal");
  const closeModalBtn = modal.querySelector(".close-btn");
  const modalBody = document.getElementById("modal-body");

  closeModalBtn.onclick = () => modal.style.display = "none";

  window.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
  };

  function abrirModalPago(cliente) {

  clienteActual = cliente;

  const deuda = Number(cliente.deuda || 0);
  const abonado = Number(cliente.abono || 0);
  const total = deuda + abonado;

  modalBody.innerHTML = `
    <h2>Nuevo Pago</h2>

    <div style="margin-bottom:15px;">
      <strong>${cliente.nombre}</strong><br>
      <small>${cliente.plan || 'Plan base'}</small><br>
      <small>📅 ${cliente.fecha_cobro || 'Sin fecha'}</small>
    </div>

    <div style="margin-bottom:15px;">
      <p><strong>Restante:</strong> $${deuda.toLocaleString()}</p>
      <p><strong>Total plan:</strong> $${total.toLocaleString()}</p>
    </div>

    <input 
      type="number" 
      id="montoPago" 
      placeholder="Monto recibido"
      style="width:100%;padding:10px;margin-bottom:10px;"
    >

    <button id="btnGuardarPago">
      Registrar Pago
    </button>
  `;

  document
    .getElementById('btnGuardarPago')
    .addEventListener('click', guardarPago);

  modal.style.display = "flex";
}

  async function guardarPago() {

  const monto = Number(document.getElementById('montoPago').value);

  if (!monto || monto <= 0) {
    alert('Ingresa un monto válido');
    return;
  }

  if (monto > clienteActual.deuda) {
    alert('El monto no puede ser mayor que la deuda');
    return;
  }

  const nuevaDeuda = Math.max(0, clienteActual.deuda - monto);
  const nuevoAbono = (clienteActual.abono || 0) + monto;

  try {

    const res = await fetch(`${API}/clientes/${clienteActual.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        deuda: nuevaDeuda,
        abono: nuevoAbono
      })
    });

    if (!res.ok) throw new Error();

    // Si quedó en 0 → marcar como pagado
    if (nuevaDeuda === 0) {
      await fetch(`${API}/clientes/${clienteActual.id}/pagar`, {
        method: 'PUT',
        credentials: 'include'
      });
    }

    modal.style.display = "none";

    // 🔥 Actualizar en memoria para que no tengas que recargar
    clienteActual.deuda = nuevaDeuda;
    clienteActual.abono = nuevoAbono;

    cargarClientes();

  } catch (err) {
    console.error(err);
    alert('❌ Error registrando el pago');
  }
}
  /* =========================
     BUSCADOR
  ========================= */
  buscador.addEventListener('input', e => {
    const texto = e.target.value.toLowerCase();

    const filtrados = clientesCache.filter(c =>
      (c.nombre || '').toLowerCase().includes(texto) ||
      (c.telefono || '').includes(texto)
    );

    renderClientes(filtrados);
  });

  /* =========================
     IMPORTAR EXCEL
  ========================= */
  btnImportar.addEventListener('click', async () => {
    const file = excelInput.files[0];

    if (!file) {
      alert('❌ Selecciona un archivo Excel');
      return;
    }

    const formData = new FormData();
    formData.append('excel', file);

    try {
      const res = await fetch(`${API}/clientes/importar`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      alert(`✅ Clientes importados: ${data.importados || 'OK'}`);
      cargarClientes();

    } catch (err) {
      console.error(err);
      alert('❌ Error importando el Excel');
    }
  });

  /* =========================
     INIT
  ========================= */
  cargarClientes();

});