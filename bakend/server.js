const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const session = require('express-session');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');

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
  name: 'pasnet.sid',
  secret: 'pasnet_secret_key',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 2
  }
}));

/* =========================
   BASE DE DATOS
========================= */
const db = new sqlite3.Database('./database.db');

/* =========================
   AUTH
========================= */
function auth(req, res, next) {
  if (req.session.auth) return next();
  return res.status(401).json({ error: 'No autorizado' });
}

/* =========================
   LOGIN
========================= */
app.post('/login', (req, res) => {
  const { user, password } = req.body;

  if (user === 'admin' && password === 'pasnet123') {
    req.session.auth = true;
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
   TABLAS
========================= */
db.run(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    telefono TEXT,
    direccion TEXT,
    deuda REAL DEFAULT 0,
    abono REAL DEFAULT 0,
    fecha_cobro TEXT,
    estado TEXT DEFAULT 'pendiente',
    creado DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

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

/* =========================
   CLIENTES CRUD
========================= */
app.get('/clientes', auth, (req, res) => {
  db.all(
    `SELECT * FROM clientes ORDER BY estado, fecha_cobro`,
    [],
    (_, rows) => res.json(rows)
  );
});

app.post('/clientes', auth, (req, res) => {
  const { nombre, telefono, direccion, deuda, fecha_cobro } = req.body;

  db.run(
    `INSERT INTO clientes (nombre, telefono, direccion, deuda, fecha_cobro)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, telefono, direccion, deuda, fecha_cobro],
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

app.put('/clientes/:id/pagar', auth, (req, res) => {
  db.run(
    `UPDATE clientes SET estado='pagado', deuda=0 WHERE id=?`,
    [req.params.id],
    () => res.json({ ok: true })
  );
});

/* =========================
   🔥 IMPORTAR CLIENTES DESDE EXCEL
========================= */
const upload = multer({ dest: 'uploads/' });

app.post('/clientes/importar', auth, upload.single('excel'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Archivo requerido' });
  }

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Excel vacío' });
    }

    let count = 0;

    const stmt = db.prepare(`
      INSERT INTO clientes
      (nombre, telefono, direccion, deuda, fecha_cobro)
      VALUES (?, ?, ?, ?, ?)
    `);

    rows.forEach(r => {
      stmt.run(
        r.nombre || '',
        String(r.telefono || ''),
        r.direccion || '',
        Number(r.deuda) || 0,
        r.fecha_cobro || null
      );
      count++;
    });

    stmt.finalize();
    fs.unlinkSync(req.file.path);

    res.json({ ok: true, importados: count });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error procesando Excel' });
  }
});

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend activo en puerto ${PORT}`);
});