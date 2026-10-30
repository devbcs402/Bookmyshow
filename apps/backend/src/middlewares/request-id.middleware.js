import { v4 as uuidv4 } from 'uuid';

const REQUEST_ID_HEADER = 'x-request-id';
// Alphanumeric + hyphen + underscore, max 64 chars
const SAFE_ID_REGEX = /^[a-zA-Z0-9\-_]{8,64}$/;

export const requestIdMiddleware = (req, res, next) => {
  let requestId = req.headers[REQUEST_ID_HEADER];

  if (!requestId || typeof requestId !== 'string' || !SAFE_ID_REGEX.test(requestId)) {
    requestId = uuidv4();
  }

  req.id = requestId;
  req.startTime = Date.now();
  res.locals.requestId = requestId;

  res.setHeader('X-Request-ID', requestId);
  next();
};

export default requestIdMiddleware;
