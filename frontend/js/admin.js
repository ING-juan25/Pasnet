const tablaPendientes = document.getElementById('tablaPendientes');
const tablaInstalados = document.getElementById('tablaInstalados');
const logoutBtn = document.getElementById('logout');

const API = 'https://pasnet-backend.onrender.com';

/* =========================
   CARGAR SOLICITUDES
========================= */
fetch(`${API}/solicitudes`, {
  credentials: 'include'
})
.then(res => {
  if (!res.ok) location.href = 'login.html';
  return res.json();
})
.then(data => {
  tablaPendientes.innerHTML = '';
  tablaInstalados.innerHTML = '';

  data.forEach(s => {
    if (s.estado === 'pendiente') {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.plan}</td>
        <td>${s.nombre}</td>
        <td>${s.direccion}</td>
        <td>${s.telefono}</td>
        <td>
          <button class="btn-instalar" onclick="marcarInstalado(${s.id})">
            ✔ Instalar
          </button>
        </td>
      `;
      tablaPendientes.appendChild(tr);
    } else {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `
        <h3>${s.plan}</h3>
        <p>👤 ${s.nombre}</p>
        <p>🏠 ${s.direccion}</p>
        <p>📞 ${s.telefono}</p>
        <p>✅ Instalado</p>
      `;
      tablaInstalados.appendChild(div);
    }
  });
});

/* =========================
   MARCAR COMO INSTALADO
========================= */
function marcarInstalado(id) {
  fetch(`${API}/solicitudes/${id}`, {
    method: 'PUT',
    credentials: 'include'
  })
  .then(() => location.reload());
}

/* =========================
   LOGOUT
========================= */
logoutBtn.addEventListener('click', () => {
  fetch(`${API}/logout`, {
    method: 'POST',
    credentials: 'include'
  })
  .then(() => location.href = 'login.html');
});
