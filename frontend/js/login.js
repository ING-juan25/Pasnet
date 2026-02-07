const form = document.getElementById('loginForm');
const error = document.getElementById('error');

form.addEventListener('submit', e => {
  e.preventDefault();

  fetch('https://pasnet-backend.onrender.com/login', {
    method: 'POST',
    credentials: 'include', // 👈 CLAVE
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: user.value,
      password: password.value
    })
  })
    .then(res => {
      if (!res.ok) throw new Error();
      location.href = 'admin.html';
    })
    .catch(() => {
      error.textContent = '❌ Usuario o contraseña incorrectos';
    });
});