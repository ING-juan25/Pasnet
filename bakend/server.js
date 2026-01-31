const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const session = require('express-session');
const path = require('path');

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

app.use(express.static(path.join(__dirname, '../frontend')));

app.use(session({
  secret: 'pasnet_secret_key',
  resave: false,
  saveUninitialized: false
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
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

/* =========================
   LOGIN ADMIN
========================= */
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
   RUTAS
========================= */
app.post('/solicitud', (req, res) => {
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

      console.log('✅ Solicitud guardada ID:', this.lastID);
      res.json({ ok: true });
    }
  );
});

app.get('/solicitudes', auth, (req, res) => {
  db.all(`SELECT * FROM solicitudes ORDER BY fecha DESC`, [], (err, rows) => {
    res.json(rows);
  });
});

/* =========================
   SERVER
========================= */
app.listen(3000, () => {
  console.log('🚀 Backend activo en http://localhost:3000');
});
