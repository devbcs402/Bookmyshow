import config from './env.js';

const allowedOrigins = [
  config.CLIENT_URL,
  ...(config.NODE_ENV === 'development'
    ? [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
      ]
    : [])
];

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

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
    'X-Request-ID'
  ],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400
};

export default corsOptions;
