const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const session = require('express-session');

const app = express();
app.set('trust proxy', 1);

/* =========================
   MIDDLEWARES
========================= */
app.use(cors({
  origin: 'https://pasnet.netlify.app',
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: 'pasnet_secret_key',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: true,
    sameSite: 'none'
  }
}));

/* =========================
   BASE DE DATOS
========================= */
const db = new sqlite3.Database('./database.db');

db.run(`
  CREATE TABLE IF NOT EXISTS solicitudes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan TEXT,
    nombre TEXT,
    direccion TEXT,
    telefono TEXT,
    comentario TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado TEXT DEFAULT 'pendiente'
  )
`);

// Asegura estado para registros antiguos
db.run(`UPDATE solicitudes SET estado='pendiente' WHERE estado IS NULL`);

/* =========================
   LOGIN ADMIN
========================= */
app.post('/login', (req, res) => {
  const { user, password } = req.body;

  if (user === 'admin' && password === 'pasnet123') {
    req.session.auth = true;
    console.log('🔐 Admin autenticado');
    return res.json({ ok: true });
  }

  res.status(401).json({ error: 'Credenciales incorrectas' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

/* =========================
   MIDDLEWARE PROTECCIÓN
========================= */
function auth(req, res, next) {
  if (req.session.auth) return next();
  return res.status(401).json({ error: 'No autorizado' });
}

/* =========================
   RUTAS API
========================= */

// Crear solicitud (frontend público)
app.post('/solicitudes', (req, res) => {
  const { plan, nombre, direccion, telefono, comentario } = req.body;

  db.run(
    `INSERT INTO solicitudes (plan, nombre, direccion, telefono, comentario)
     VALUES (?, ?, ?, ?, ?)`,
    [plan, nombre, direccion, telefono, comentario],
    function (err) {
      if (err) {
        console.error('❌ Error BD:', err);
        return res.status(500).json({ error: 'Error BD' });
      }
      res.json({ ok: true, id: this.lastID });
    }
  );
});

// Obtener solicitudes (panel admin)
app.get('/solicitudes', auth, (req, res) => {
  db.all(
    `SELECT * FROM solicitudes ORDER BY fecha DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error BD' });
      res.json(rows);
    }
  );
});

// Marcar como instalado
app.put('/solicitudes/:id', auth, (req, res) => {
  const { id } = req.params;

  db.run(
    `UPDATE solicitudes SET estado='instalado' WHERE id=?`,
    [id],
    err => {
      if (err) {
        return res.status(500).json({ error: 'Error actualizando estado' });
      }
      res.json({ ok: true });
    }
  );
});

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend activo en puerto ${PORT}`);
});


