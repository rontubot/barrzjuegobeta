const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'barrzjuego_super_secret_key_123';

// Middlewares
app.use(cors());
app.use(express.json());

// Helper: generate 6-digit random code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// --- ENDPOINTS DE API ---

// 1. Enviar código de verificación por correo
app.post('/api/auth/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Correo electrónico es requerido.' });
  }

  try {
    // Verificar si el usuario ya está registrado
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado.' });
    }

    const code = generateCode();

    // Eliminar códigos antiguos para este email
    await db.query('DELETE FROM verification_codes WHERE email = $1', [email]);

    // Insertar nuevo código
    await db.query('INSERT INTO verification_codes (email, code) VALUES ($1, $2)', [email, code]);

    // Registrar en consola para depuración
    console.log(`\n=============================================`);
    console.log(`[CÓDIGO DE VERIFICACIÓN]`);
    console.log(`Email: ${email}`);
    console.log(`Código: ${code}`);
    console.log(`=============================================\n`);

    // Llamar al Google Apps Script para enviar el correo si está configurado
    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
    const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET;
    const EMAIL_FROM_ALIAS = process.env.EMAIL_FROM_ALIAS;

    if (APPS_SCRIPT_URL) {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            code,
            secret: APPS_SCRIPT_SECRET,
            fromAlias: EMAIL_FROM_ALIAS
          })
        });
        const result = await response.json();
        if (!result.success) {
          console.error('Error al enviar correo por Apps Script:', result.error);
        }
      } catch (err) {
        console.error('Error al conectar con Google Apps Script:', err);
      }
    } else {
      console.log('Aviso: APPS_SCRIPT_URL no está configurado. El correo de verificación no se envió.');
    }

    res.json({ 
      success: true, 
      message: 'Código de verificación enviado.'
    });
  } catch (err) {
    console.error('Error al enviar código:', err);
    res.status(500).json({ error: 'Error del servidor al generar código.' });
  }
});

// 2. Registrar usuario (Crear Cuenta)
app.post('/api/auth/register', async (req, res) => {
  const { email, password, code } = req.body;
  if (!email || !password || !code) {
    return res.status(400).json({ error: 'Todos los campos (email, contraseña, código) son requeridos.' });
  }

  try {
    // Validar código de verificación
    const codeRes = await db.query('SELECT * FROM verification_codes WHERE email = $1 AND code = $2', [email, code]);
    if (codeRes.rows.length === 0) {
      return res.status(400).json({ error: 'Código de verificación incorrecto o expirado.' });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Crear usuario
    const newUserRes = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );

    const user = newUserRes.rows[0];

    // Eliminar código usado
    await db.query('DELETE FROM verification_codes WHERE email = $1', [email]);

    // Firmar JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      email: user.email,
      loggedIn: true,
      method: 'email'
    });
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    if (err.code === '23505') { // Código de error de llave duplicada en PostgreSQL
      return res.status(400).json({ error: 'El correo ya está registrado.' });
    }
    res.status(500).json({ error: 'Error del servidor al registrar.' });
  }
});

// 3. Iniciar Sesión (Login)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  }

  try {
    // Buscar usuario
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const user = userRes.rows[0];

    // Si es un usuario de Google que no tiene contraseña
    if (!user.password_hash) {
      return res.status(400).json({ error: 'Esta cuenta usa inicio de sesión con Google.' });
    }

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Firmar JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      email: user.email,
      loggedIn: true,
      method: 'email'
    });
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).json({ error: 'Error del servidor al iniciar sesión.' });
  }
});

// 4. Validar Token de Sesión
app.get('/api/auth/verify-token', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      success: true,
      email: decoded.email
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
});

// 5. Google Login (Verificación del token JWT de Google)
app.post('/api/auth/google-login', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Falta la credencial de Google.' });
  }

  try {
    // Llamar al endpoint oficial de Google para verificar el token JWT (ID Token)
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await googleRes.json();

    if (!googleRes.ok || payload.error_description) {
      return res.status(400).json({ error: 'Token de Google inválido o expirado.' });
    }

    const { email, sub: googleId, aud } = payload;

    // Opcional: Validar client ID si está configurado en las variables de entorno del servidor
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (GOOGLE_CLIENT_ID && aud !== GOOGLE_CLIENT_ID) {
      return res.status(400).json({ error: 'El ID de cliente de Google no coincide con el de esta aplicación.' });
    }

    if (!email) {
      return res.status(400).json({ error: 'No se pudo obtener el correo de la cuenta de Google.' });
    }

    // Buscar si ya existe por google_id o por email
    let userRes = await db.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [googleId, email]);
    let user;

    if (userRes.rows.length === 0) {
      // Crear nuevo usuario de Google
      const insertRes = await db.query(
        'INSERT INTO users (email, google_id) VALUES ($1, $2) RETURNING id, email',
        [email, googleId]
      );
      user = insertRes.rows[0];
    } else {
      user = userRes.rows[0];
      // Si el usuario existía por email pero no tenía google_id, asociarlo
      if (!user.google_id) {
        await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
        user.google_id = googleId;
      }
    }

    // Firmar JWT propio de la App
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      email: user.email,
      loggedIn: true,
      method: 'google'
    });
  } catch (err) {
    console.error('Error en login con Google:', err);
    res.status(500).json({ error: 'Error del servidor en autenticación de Google.' });
  }
});


// --- SERVICIO DE ARCHIVOS ESTÁTICOS EN PRODUCCIÓN ---

// Servir la compilación de producción del cliente
app.use(express.static(path.join(__dirname, '../dist')));

// Ruta comodín para SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Iniciar servidor e inicializar base de datos
app.listen(PORT, async () => {
  console.log(`\nServidor corriendo en el puerto: ${PORT}`);
  
  // Opcional: Ejecutar scripts de creación de tablas
  try {
    const fs = require('fs');
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await db.query(schemaSql);
      console.log('Tablas inicializadas correctamente en la base de datos.');
    }
  } catch (err) {
    console.error('Error al inicializar las tablas de la base de datos:', err);
  }
});
