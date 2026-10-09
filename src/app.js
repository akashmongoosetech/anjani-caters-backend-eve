import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import routes from './routes/index.js';
import { getSitemap } from './controllers/sitemapController.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { apiDocs } from './docs/swaggerSpec.js';

const app = express();

app.set('trust proxy', 1);

// Rate limiting first so rejected requests skip compression cost
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Compression
app.use(compression());

// Security and utility Middlewares
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", 'https://www.youtube.com', 'https://player.vimeo.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    }
  }
}));
app.use(cors({
  origin: (origin, callback) => {
    // Explicit allowlist only — never reflect arbitrary origins with credentials.
    const raw = [process.env.CORS_ORIGIN, process.env.CLIENT_URL, process.env.SERVER_URL]
      .filter(Boolean)
      .flatMap((v) => String(v).split(','))
      .map((v) => v.trim().replace(/\/$/, ''))
      .filter(Boolean);
    const allowed = raw.length > 0 ? raw : ['http://localhost:5173', 'http://localhost:3000'];
    // Non-browser clients (no Origin header) are allowed through.
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed.'));
  },
  credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize());
app.use(cookieParser());

// Serve uploaded files statically. Documents download as attachments so a
// spoofed HTML/SVG can't execute in the site origin; images stay inline.
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, filePath) => {
    if (/\.(pdf|doc|docx)$/i.test(filePath)) {
      res.setHeader('Content-Disposition', 'attachment');
    }
  }
}));

// Base API Routes
app.use('/api', routes);

// API Documentation Endpoint
app.get('/api/docs', (req, res) => {
  res.json(apiDocs);
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const mongoose = (await import('mongoose')).default;
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.json({
    status: dbState === 1 ? 'online' : 'degraded',
    system: 'Eveng Catering Enterprise Backend',
    db: dbState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Root: friendly pointer so probes/visitors don't hit an empty Express 404.
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'Eveng Catering Enterprise Backend',
    docs: '/api/docs',
    health: '/api/health',
    sitemap: '/api/sitemap.xml'
  });
});

// Sitemap endpoint (XML)
app.get('/api/sitemap.xml', getSitemap);

// Global Error Handling Middleware
app.use(errorHandler);

export default app;
