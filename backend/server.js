import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';
import { connectDB } from './storage/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com'
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'data:'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:'
        ],
        connectSrc: [
          "'self'",
          'http://localhost:5000',
          'http://localhost:5173',
          'http://127.0.0.1:5000',
          'http://127.0.0.1:5173',
          'http://localhost:6100',
          'http://127.0.0.1:6100',
          'http://localhost:7000',
          'http://127.0.0.1:7000'
        ],
        frameSrc: [
          "'self'",
          'http://localhost:7000',
          'http://127.0.0.1:7000'
        ]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  })
);
app.use(express.urlencoded({ extended: true }));

// Serve Public Static Assets
app.use(express.static(path.resolve(__dirname, '../public')));

// Serve Frontend Source Files
app.use('/frontend', express.static(path.resolve(__dirname, '../frontend')));
app.use('/src', express.static(path.resolve(__dirname, '../frontend'))); // Backward-compatible route

// If production build exists in dist, serve that too
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Single-Page Application Client Fallback
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

// Start Server & Connect Database
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🕉️  SACRED FRIENDS SERVER — Q-CUBIC BACKEND PLATFORM`);
    console.log(`======================================================`);
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🔒 V1 Public Installer:  /api/download/v1`);
    console.log(`🛡️ V2 Protected Stream: /api/download/v2/authorized?token=...`);
    console.log(`💳 YouPI-PG UPI Checkout: POST /api/payment/create-order`);
    console.log(`💻 1-Device Licensing:  POST /api/license/activate`);
    console.log(`======================================================\n`);
  });
}

// Only start listening directly if run from CLI
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}

export default app;
export { app, startServer };

