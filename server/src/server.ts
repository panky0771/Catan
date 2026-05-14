import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './types/socket.types';
import { setupSocketHandlers } from './socket/SocketHandler';
import authRoutes from './routes/authRoutes';
import { testConnection } from './config/database';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// =============================================
// Socket.IO
// =============================================
const isDev = process.env.NODE_ENV !== 'production';
const corsOrigin = isDev
  ? (origin: string | undefined, cb: (e: Error | null, allow?: boolean) => void) => {
      // Allow any localhost origin in development
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) cb(null, true);
      else cb(new Error('Not allowed by CORS'));
    }
  : process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  }
);

// =============================================
// Express Middleware
// =============================================
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many requests from this IP',
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many auth attempts',
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// =============================================
// Routes
// =============================================
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/stats', (req, res) => {
  res.json({
    connectedClients: io.sockets.sockets.size,
    uptime: process.uptime(),
  });
});

// =============================================
// 404 handler
// =============================================
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// =============================================
// Setup Socket Handlers
// =============================================
setupSocketHandlers(io);

// =============================================
// Start Server
// =============================================
const PORT = parseInt(process.env.PORT || '3001');

async function start() {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.warn('⚠️  Database connection failed - running without persistence');
    } else {
      console.log('✅ Database connected');
    }

    httpServer.listen(PORT, () => {
      console.log(`🚀 Catan server running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Client URL:  ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export { io };
