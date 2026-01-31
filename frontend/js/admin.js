const API = 'https://pasnet-backend.onrender.com';

const tabla = document.getElementById('tablaSolicitudes');
const cards = document.getElementById('cardsSolicitudes');
const logoutBtn = document.getElementById('logout');

/* =========================
   CARGAR SOLICITUDES
========================= */
fetch(`${API}/solicitudes.html`, {
  credentials: 'include'
})
.then(res => {
  if (!res.ok) {
    location.href = 'login.html';
    return;
  }
  return res.json();
})
.then(data => {
  data.forEach(s => {

    // TABLA DESKTOP
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.plan}</td>
      <td>${s.nombre}</td>
      <td>${s.direccion}</td>
      <td>${s.telefono}</td>
      <td>${s.comentario || '-'}</td>
      <td>${new Date(s.fecha).toLocaleString()}</td>
    `;
    tabla.appendChild(tr);

    // CARDS MOBILE
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${s.plan}</h3>
      <p><strong>👤</strong> ${s.nombre}</p>
      <p><strong>🏠</strong> ${s.direccion}</p>
      <p><strong>📞</strong> ${s.telefono}</p>
      <p><strong>📝</strong> ${s.comentario || 'N/A'}</p>
      <p><strong>🕒</strong> ${new Date(s.fecha).toLocaleString()}</p>
    `;
    cards.appendChild(card);
  });
});

/* =========================
   LOGOUT
========================= */
logoutBtn.addEventListener('click', () => {
  fetch(`${API}/logout`, {
    method: 'POST',
    credentials: 'include'
  }).then(() => {
    location.href = 'login.html';
  });
});
