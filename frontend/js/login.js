const form = document.getElementById('loginForm');
const error = document.getElementById('error');

form.addEventListener('submit', e => {
  e.preventDefault();

  fetch('https://pasnet-backend.onrender.com/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: user.value,
      password: password.value
    })
  })
    .then(res => {
      if (!res.ok) throw new Error();
      return res.json(); // 👈 ahora sí leemos el token
    })
    .then(data => {
      if (!data.token) throw new Error();

      // 🔐 AQUÍ ESTÁ LO QUE TE FALTABA
      localStorage.setItem('token', data.token);

      // redirección
      location.href = 'admin.html';
    })
    .catch(() => {
      error.textContent = '❌ Usuario o contraseña incorrectos';
    });
});