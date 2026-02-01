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
  name: 'pasnet.sid',              // 👈 IMPORTANTE
  secret: 'pasnet_secret_key',
  resave: false,
  saveUninitialized: false,
  rolling: true,                   // 👈 MANTIENE SESIÓN ACTIVA
  proxy: true,
  cookie: {
    secure: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 2      // 2 horas
  }
}));

/* =========================
   BASE DE DATOS
========================= */
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
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

  db.all(`PRAGMA table_info(solicitudes)`, (err, columns) => {
    if (err) return console.error(err);

    const existeEstado = columns.some(c => c.name === 'estado');

    if (!existeEstado) {
      db.run(
        `ALTER TABLE solicitudes ADD COLUMN estado TEXT DEFAULT 'pendiente'`,
        err => {
          if (err) console.error('❌ Error creando columna estado', err);
          else console.log('✅ Columna estado creada');
        }
      );
    } else {
      console.log('ℹ️ Columna estado ya existe');
    }
  });
});
db.run("DELETE FROM solicitudes");


/* =========================
   LIMPIEZA AUTOMÁTICA (15 DÍAS)
========================= */

const QUINCE_DIAS = 60 * 1000; // 1 minuto


setInterval(() => {
  console.log('🧹 Ejecutando limpieza automática...');

  db.run(
    `
    DELETE FROM solicitudes
    WHERE estado = 'instalado'
    AND fecha <= datetime('now', '-15 days')
    `,
    function (err) {
      if (err) {
        console.error('❌ Error limpieza automática:', err);
      } else {
        console.log(`🗑️ Registros eliminados: ${this.changes}`);
      }
    }
  );
}, QUINCE_DIAS);


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
    res.clearCookie('pasnet.sid');
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



