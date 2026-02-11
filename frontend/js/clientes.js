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
     RENDER CLIENTES
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

      let porcentaje = 0;

      if (deuda === 0 && abonado > 0) {
        porcentaje = 100;
      } else {
        const total = deuda + abonado;
        porcentaje = total > 0
          ? Math.round((abonado / total) * 100)
          : 0;
      }

      porcentaje = Math.min(100, porcentaje);

      const inicial = (c.nombre || 'N')[0].toUpperCase();

      const card = document.createElement('div');
      card.className = 'finance-card';

      card.innerHTML = `
        <div class="card-top">
          <div class="card-left">
            <div class="avatar">${inicial}</div>
            <div>
              <h3>${c.nombre || 'Sin nombre'}</h3>
              <small>📅 ${c.fecha_cobro || 'Sin fecha'}</small>
            </div>
          </div>

          <div class="card-right">
            <h2>$${deuda.toLocaleString()}</h2>
            <small>${porcentaje}% pagado</small>
          </div>
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
     MODAL
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
    const hoy = new Date().toISOString().split('T')[0];

    modalBody.innerHTML = `
      <h2>Registrar Pago</h2>

      <div style="margin-bottom:15px;">
        <strong>${cliente.nombre}</strong><br>
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

      <input
        type="date"
        id="fechaPago"
        max="${hoy}"
        value="${hoy}"
        style="width:100%;padding:10px;margin-bottom:15px;"
      >

      <button id="btnGuardarPago" style="margin-bottom:20px;">
        Registrar Pago
      </button>

      <hr style="opacity:.2;margin:15px 0;">

      <h3>Historial</h3>
      <div id="listaHistorial">
        Cargando...
      </div>
    `;

    document
      .getElementById('btnGuardarPago')
      .addEventListener('click', guardarPago);

    modal.style.display = "flex";

    cargarHistorial(cliente.id);
  }

  async function guardarPago() {

  const monto = Number(document.getElementById('montoPago').value);
  const fecha = document.getElementById('fechaPago').value;
  const hoy = new Date().toISOString().split('T')[0];

  if (!monto || monto <= 0) {
    alert('Ingresa un monto válido');
    return;
  }

  if (!fecha) {
    alert('Selecciona una fecha');
    return;
  }

  if (fecha > hoy) {
    alert('No puedes seleccionar una fecha futura');
    return;
  }

  if (monto > clienteActual.deuda) {
    alert('El monto no puede ser mayor que la deuda');
    return;
  }

  try {

    /* =========================
       1️⃣ ACTUALIZAR DEUDA
    ========================= */

    const nuevaDeuda = clienteActual.deuda - monto;
    const nuevoAbono = (clienteActual.abono || 0) + monto;

    const resUpdate = await fetch(`${API}/clientes/${clienteActual.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        deuda: nuevaDeuda,
        abono: nuevoAbono
      })
    });

    if (!resUpdate.ok) throw new Error();

    /* =========================
       2️⃣ REGISTRAR MOVIMIENTO
    ========================= */

    await fetch(`${API}/clientes/${clienteActual.id}/movimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        tipo: 'pago',
        monto,
        concepto: 'Pago registrado',
        fecha
      })
    });

    modal.style.display = "none";
    cargarClientes();

  } catch (err) {
    console.error(err);
    alert('❌ Error registrando el pago');
  }
}

  async function cargarHistorial(clienteId) {
    try {

      const res = await fetch(`${API}/clientes/${clienteId}/movimientos`, {
        credentials: 'include'
      });

      const movimientos = await res.json();
      const contenedor = document.getElementById('listaHistorial');

      if (!movimientos.length) {
        contenedor.innerHTML =
          '<p style="opacity:.6">Sin movimientos registrados</p>';
        return;
      }

      contenedor.innerHTML = movimientos.map(m => {

        const color =
          m.tipo === 'pago' ? '#00e676' :
          m.tipo === 'aumento' ? '#ff5252' :
          '#ffffff';

        return `
          <div style="margin-bottom:12px;padding:10px;border-radius:8px;background:rgba(255,255,255,0.05);">
            <div style="display:flex;justify-content:space-between;">
              <strong style="color:${color};">
                ${m.tipo.toUpperCase()}
              </strong>
              <span>$${Number(m.monto).toLocaleString()}</span>
            </div>

            <small style="opacity:.6;">${m.fecha}</small>

            <div style="font-size:13px;margin-top:5px;">
              ${m.concepto || ''}
            </div>
          </div>
        `;

      }).join('');

    } catch (err) {
      console.error(err);
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

      const data = await res.json();
      alert(`✅ Clientes importados: ${data.importados || 'OK'}`);
      cargarClientes();

    } catch (err) {
      console.error(err);
      alert('❌ Error importando el Excel');
    }
  });

  cargarClientes();

});