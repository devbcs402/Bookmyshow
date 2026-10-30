import config from './env.js';

const parseAllowedOrigins = () => {
  const origins = new Set([config.CLIENT_URL]);

  if (config.ALLOWED_ORIGINS) {
    config.ALLOWED_ORIGINS.split(',')
      .map(o => o.trim())
      .filter(Boolean)
      .forEach(o => origins.add(o));
  }

  if (config.NODE_ENV === 'development') {
    origins.add('http://localhost:3000');
    origins.add('http://localhost:5173');
    origins.add('http://127.0.0.1:3000');
    origins.add('http://127.0.0.1:5173');
  }

  return Array.from(origins);
};

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = parseAllowedOrigins();

    if (allowedOrigins.indexOf(origin) !== -1 || config.NODE_ENV === 'test') {
      return callback(null, true);
    }

    return callback(new Error(`CORS Error: Origin '${origin}' is not permitted by policy`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-Metrics-Token'
  ],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400
};

export default corsOptions;
