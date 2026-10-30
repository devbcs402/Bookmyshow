# 13. Interactive Swagger & OpenAPI 3.0 Documentation

## 1. Overview & Living Documentation Strategy

API documentation is generated dynamically using **`swagger-jsdoc`** and served via **`swagger-ui-express`** at:
```
http://localhost:5000/api/v1/docs
```

The documentation is kept co-located with code through JSDoc OpenAPI annotations directly on route files. When routes and validation schemas are updated, the interactive documentation updates automatically without separate maintenance steps.

---

## 2. Global OpenAPI Specification (`src/docs/swagger.js`)

```javascript
import swaggerJsdoc from 'swagger-jsdoc';
import config from '../config/env.js';

const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'BookMyShow Clone - Core Enterprise API',
      version: '1.0.0',
      description:
        'Enterprise-grade Movie Ticket Booking Platform RESTful API. Built with Node.js, Express, MongoDB, Redis, and Socket.IO.'
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
            meta: { type: 'object', nullable: true }
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
```

---

## 3. Security Scheme Integration

The OpenAPI configuration pre-registers the **`BearerAuth`** security scheme. Starting in Part 4, all protected endpoints in the Swagger UI feature an "Authorize" lock button where developers and QA testers can paste JWT Bearer tokens to execute authenticated requests directly from the browser.

