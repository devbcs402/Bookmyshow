import swaggerJsdoc from 'swagger-jsdoc';
import config from '../config/env.js';

const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'BookMyShow Clone - Core Enterprise API',
      version: '1.0.0',
      description:
        'Enterprise-grade Movie Ticket Booking Platform RESTful API. Built with Node.js, Express, MongoDB, Redis, and Socket.IO.',
      contact: {
        name: 'Technical Architecture Team',
        email: 'architecture@bookmyshow-clone.local'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}${config.API_PREFIX}`,
        description: 'Local Development Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your short-lived JWT access token in the format: Bearer <token>'
        }
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Request completed successfully' },
            data: { type: 'object', nullable: true },
            meta: {
              type: 'object',
              nullable: true,
              properties: {
                totalRecords: { type: 'integer', example: 100 },
                currentPage: { type: 'integer', example: 1 },
                pageSize: { type: 'integer', example: 20 },
                totalPages: { type: 'integer', example: 5 },
                hasNextPage: { type: 'boolean', example: true },
                hasPrevPage: { type: 'boolean', example: false }
              }
            }
          }
        },
        ErrorEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed for request payload' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                details: { type: 'array', items: { type: 'object' }, nullable: true }
              }
            },
            requestId: { type: 'string', example: 'c6a32d1f-8e4b-4a5c-9c71-2b0f4a8d9e23' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/modules/**/*.js']
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
export default swaggerSpec;

