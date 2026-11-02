import { NotFoundError } from '../common/errors/not-found.error.js';

export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(
    `Endpoint '${req.method} ${req.originalUrl}' does not exist on this server`
  );
  next(error);
};

export default notFoundHandler;
