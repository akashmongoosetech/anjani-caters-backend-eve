import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { getSitemap } from './controllers/sitemapController.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { apiDocs } from './docs/swaggerSpec.js';

const app = express();

app.set('trust proxy', 1);

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Security and utility Middlewares
app.use(helmet({
  crossOriginEmbedderPolicy: false,
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
    }
  }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Base API Routes
app.use('/api', routes);

// API Documentation Endpoint
app.get('/api/docs', (req, res) => {
  res.json(apiDocs);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Eveng Catering Enterprise Backend',
    timestamp: new Date().toISOString()
  });
});

// Sitemap endpoint (XML)
app.get('/api/sitemap.xml', getSitemap);

// Global Error Handling Middleware
app.use(errorHandler);

export default app;
