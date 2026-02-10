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
      const nombre = (c.nombre || '').trim();
      const telefono = (c.telefono || '').trim();
      const direccion = (c.direccion || '').trim();

      const card = document.createElement('div');
      card.className = 'card';

      card.innerHTML = `
        <h3>${nombre || 'Sin nombre'}</h3>
        <p>📞 ${telefono || 'N/A'}</p>
        <p>🏠 ${direccion || 'N/A'}</p>
        <p>💰 Deuda: $${Number(c.deuda || 0).toLocaleString()}</p>
        <p>📅 Cobro: ${c.fecha_cobro || 'N/A'}</p>
        <p>📌 Estado: ${c.estado || 'pendiente'}</p>
      `;

      lista.appendChild(card);
    });
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