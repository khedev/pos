/**
 * Validation middleware for PGPOS API
 * Validates request body against Zod schemas
 */
import { ZodError } from 'zod';

/**
 * Create validation middleware from a Zod schema
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against
 * @param {string} source - The request property to validate ('body', 'query', 'params')
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          message: 'Validation failed',
          errors: messages,
        });
      }
      next(error);
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validate route parameters
 */
export const validateParams = (schema) => validate(schema, 'params');

export default validate;