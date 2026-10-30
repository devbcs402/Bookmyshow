import { ValidationError } from '../common/errors/validation.error.js';

export const validate = schema => {
  return async (req, res, next) => {
    try {
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      return next();
    } catch (error) {
      if (error.errors && Array.isArray(error.errors)) {
        const formattedDetails = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          rule: err.code
        }));

        return next(
          new ValidationError(
            'Validation failed: One or more parameters are invalid',
            formattedDetails
          )
        );
      }
      return next(error);
    }
  };
};

export default validate;

