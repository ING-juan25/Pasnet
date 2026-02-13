/* =========================
   CLIENTES - PASNET
========================= */

document.addEventListener('DOMContentLoaded', async () => {

  const lista = document.getElementById('listaClientes');
  const buscador = document.getElementById('buscadorClientes');

  const btnImportar = document.getElementById('btnImportarExcel');
  const excelInput = document.getElementById('excelInput');

  const filtros = document.querySelectorAll('.filtro-btn');
  let filtroActivo = 'todos';

  const API = location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://pasnet-backend.onrender.com';

  let clientesCache = [];
  let clienteActual = null;
  
  /* =========================
     IMPORTAR EXCEL
  ========================= */

  if (btnImportar && excelInput) {

    btnImportar.addEventListener('click', async (e) => {

      e.preventDefault();

      const file = excelInput.files[0];

      if (!file) {
        alert('❌ Selecciona un archivo Excel');
        return;
      }

      const formData = new FormData();
      formData.append('excel', file);

      try {

        btnImportar.disabled = true;
        btnImportar.innerText = "Importando...";

        const res = await fetch(`${API}/clientes/importar`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        if (!res.ok) throw new Error();

        const data = await res.json();

        alert(`✅ Clientes importados: ${data.importados}`);

        excelInput.value = "";
        cargarClientes();

      } catch (err) {
        console.error(err);
        alert('❌ Error importando el Excel');
      } finally {
        btnImportar.disabled = false;
        btnImportar.innerText = "Importar Excel";
      }

    });

  }

  /* =========================
     CARGAR CLIENTES
  ========================= */

  async function cargarClientes() {

    try {

      const res = await fetch(`${API}/clientes`, {
        credentials: 'include'
      });

      if (res.status === 401) {
        location.href = 'login.html';
        return;
      }

      clientesCache = await res.json();
      aplicarFiltros();

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
      const totalPlan = deuda + abonado;

      let porcentaje = totalPlan > 0
        ? Math.round((abonado / totalPlan) * 100)
        : 0;

      porcentaje = Math.min(100, porcentaje);

      const inicial = (c.nombre || 'N')[0].toUpperCase();

      const card = document.createElement('div');
      card.className = 'finance-card';

      card.innerHTML = `
        <div class="card-left">
          <div class="avatar">${inicial}</div>
          <div>
            <h3>${c.nombre || 'Sin nombre'}</h3>
            <p>Plan base</p>
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
     FILTROS
  ========================= */

  filtros.forEach(btn => {
    btn.addEventListener('click', () => {

      filtros.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      filtroActivo = btn.dataset.filtro;

      aplicarFiltros();
    });
  });

  function aplicarFiltros() {

    let filtrados = [...clientesCache];

    if (filtroActivo !== 'todos') {
      filtrados = filtrados.filter(c => c.estado === filtroActivo);
    }

    const texto = buscador.value.toLowerCase();

    if (texto) {
      filtrados = filtrados.filter(c =>
        (c.nombre || '').toLowerCase().includes(texto) ||
        (c.telefono || '').includes(texto)
      );
    }

    renderClientes(filtrados);
  }

  /* =========================
     BUSCADOR
  ========================= */

  buscador.addEventListener('input', aplicarFiltros);

  /* ============================================================
     🔥 AQUI AGREGO EL MODAL + HISTORIAL (SIN BORRAR NADA)
  ============================================================ */

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
    const totalPlan = deuda + abonado;

    const hoy = new Date().toISOString().split('T')[0];

    modalBody.innerHTML = `
      <h2>Registrar Pago</h2>

      <div style="margin-bottom:15px;">
        <strong>${cliente.nombre}</strong><br>
        <small>📅 ${cliente.fecha_cobro || 'Sin fecha'}</small>
      </div>

      <div style="margin-bottom:15px;">
        <p><strong>Restante:</strong> $${deuda.toLocaleString()}</p>
        <p><strong>Total plan:</strong> $${totalPlan.toLocaleString()}</p>
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
        min="${hoy}"
        max="${hoy}"
        value="${hoy}"
        style="width:100%;padding:10px;margin-bottom:15px;"
>

      <button id="btnGuardarPago">
        Registrar Pago
      </button>

      <hr style="margin:20px 0;opacity:.2;">

      <h3>Historial</h3>
      <div id="listaHistorial"></div>
    `;

    document
      .getElementById('btnGuardarPago')
      .addEventListener('click', guardarPago);

    cargarHistorial(cliente.id);

    modal.style.display = "flex";
  }

  async function guardarPago() {

    const monto = Number(document.getElementById('montoPago').value);
    const fecha = document.getElementById('fechaPago').value;

    if (!monto || monto <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    if (monto > clienteActual.deuda) {
      alert('El monto no puede ser mayor que la deuda');
      return;
    }

    try {

      const res = await fetch(`${API}/clientes/${clienteActual.id}/movimientos`, {
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

      if (!res.ok) throw new Error();

      modal.style.display = "none";
      await cargarClientes();

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
        contenedor.innerHTML = '<p style="opacity:.6">Sin movimientos</p>';
        return;
      }

      contenedor.innerHTML = movimientos.map(m => `
        <div class="historial-card ${m.tipo}">
          <div class="historial-left">
            <div class="historial-tipo">${m.tipo.toUpperCase()}</div>
            <div class="historial-fecha">${m.fecha}</div>
            <div class="historial-concepto">${m.concepto || ''}</div>
          </div>
          <div class="historial-monto">
            $${Number(m.monto).toLocaleString()}
          </div>
        </div>
      `).join('');

    } catch (err) {
      console.error(err);
    }
  }

  /* =========================
     INIT
  ========================= */

  async function verificarSesion() {
    try {
      const res = await fetch(`${API}/session`, {
        credentials: 'include'
      });

      if (!res.ok) {
        window.location.href = 'login.html';
        return;
      }

      await cargarClientes();

    } catch (err) {
      window.location.href = 'login.html';
    }
  }

  verificarSesion();

});