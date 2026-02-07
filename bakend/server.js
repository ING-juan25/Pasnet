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
  origin: [
    'https://pasnet.netlify.app',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}));

app.use(express.json());

app.use(session({
  name: 'pasnet.sid',              // 👈 IMPORTANTE
  secret: 'pasnet_secret_key',
  resave: false,
  saveUninitialized: false,
  proxy: true,                // 👈 MANTIENE SESIÓN ACTIVA                     
  cookie: {
  secure: true,
  sameSite: 'none',
  maxAge: 1000 * 60 * 60 * 2
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

/* =========================
   LIMPIEZA AUTOMÁTICA (15 DÍAS)
========================= */

const QUINCE_DIAS = 15 * 24 * 60 * 60 * 1000;


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


db.run(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    telefono TEXT,
    direccion TEXT,
    deuda REAL DEFAULT 0,
    abono REAL DEFAULT 0,
    fecha_cobro TEXT,
    estado TEXT DEFAULT 'pendiente', -- pendiente | pagado
    creado DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.post('/clientes', auth, (req, res) => {
  const { nombre, telefono, direccion, deuda, fecha_cobro } = req.body;

  db.run(
    `INSERT INTO clientes (nombre, telefono, direccion, deuda, fecha_cobro)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, telefono, direccion, deuda, fecha_cobro],
    () => res.json({ ok: true })
  );
});

app.get('/clientes', auth, (req, res) => {
  db.all(
    `SELECT * FROM clientes ORDER BY estado, fecha_cobro`,
    [],
    (err, rows) => res.json(rows)
  );
});

app.put('/clientes/:id/pagar', auth, (req, res) => {
  db.run(
    `UPDATE clientes SET estado='pagado', deuda=0 WHERE id=?`,
    [req.params.id],
    () => res.json({ ok: true })
  );
});

app.put('/clientes/:id', auth, (req, res) => {
  const { deuda, abono, fecha_cobro } = req.body;

  db.run(
    `UPDATE clientes
     SET deuda=?, abono=?, fecha_cobro=?
     WHERE id=?`,
    [deuda, abono, fecha_cobro, req.params.id],
    () => res.json({ ok: true })
  );
});

// Eliminar solicitud (solo si está instalada)
app.delete('/solicitudes/:id', auth, (req, res) => {
  const { id } = req.params;

  // Primero validar estado
  db.get(
    `SELECT estado FROM solicitudes WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error BD' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }

      if (row.estado !== 'instalado') {
        return res.status(400).json({
          error: 'Solo se pueden eliminar solicitudes instaladas'
        });
      }

      // Si está instalada → eliminar
      db.run(
        `DELETE FROM solicitudes WHERE id = ?`,
        [id],
        err => {
          if (err) {
            return res.status(500).json({ error: 'Error al eliminar' });
          }
          res.json({ ok: true });
        }
      );
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



