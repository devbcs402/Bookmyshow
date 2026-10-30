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
        },
        Movie: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' },
            title: { type: 'string', example: 'Interstellar' },
            slug: { type: 'string', example: 'interstellar' },
            synopsis: {
              type: 'string',
              example: 'A team of explorers travel through a wormhole in space...'
            },
            durationMins: { type: 'integer', example: 169 },
            releaseDate: {
              type: 'string',
              format: 'date-time',
              example: '2026-11-05T00:00:00.000Z'
            },
            censorRating: { type: 'string', example: 'UA_13_PLUS' },
            genres: { type: 'array', items: { type: 'object' } },
            languages: { type: 'array', items: { type: 'object' } },
            availableFormats: { type: 'array', items: { type: 'string', example: 'IMAX_2D' } },
            posterUrl: { type: 'string', example: 'https://res.cloudinary.com/bms/poster.jpg' },
            status: { type: 'string', example: 'NOW_SHOWING' },
            avgRating: { type: 'number', example: 9.2 }
          }
        },
        Genre: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d2' },
            name: { type: 'string', example: 'Sci-Fi' },
            slug: { type: 'string', example: 'sci-fi' },
            isActive: { type: 'boolean', example: true }
          }
        },
        Language: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d3' },
            name: { type: 'string', example: 'Hindi' },
            code: { type: 'string', example: 'hi' },
            nativeName: { type: 'string', example: 'हिन्दी' },
            isActive: { type: 'boolean', example: true }
          }
        },
        City: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0c1' },
            name: { type: 'string', example: 'Mumbai' },
            slug: { type: 'string', example: 'mumbai' },
            state: { type: 'string', example: 'Maharashtra' },
            country: { type: 'string', example: 'India' },
            isTopCity: { type: 'boolean', example: true },
            coordinates: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'Point' },
                coordinates: {
                  type: 'array',
                  items: { type: 'number' },
                  example: [72.8777, 19.076]
                }
              }
            }
          }
        },
        Theatre: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0a1' },
            partnerId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0b1' },
            name: { type: 'string', example: 'PVR ICON: Phoenix Palladium' },
            slug: { type: 'string', example: 'pvr-icon-phoenix-palladium' },
            theatreCode: { type: 'string', example: 'PVR-MUM-01' },
            status: { type: 'string', example: 'APPROVED' },
            contactEmail: { type: 'string', example: 'icon.palladium@pvr.com' },
            contactPhone: { type: 'string', example: '+912224989100' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string', example: '462, Senapati Bapat Marg' },
                area: { type: 'string', example: 'Lower Parel' },
                cityId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0c1' },
                cityName: { type: 'string', example: 'Mumbai' },
                state: { type: 'string', example: 'Maharashtra' },
                pincode: { type: 'string', example: '400013' }
              }
            },
            location: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'Point' },
                coordinates: {
                  type: 'array',
                  items: { type: 'number' },
                  example: [72.8258, 18.9953]
                }
              }
            },
            totalScreens: { type: 'number', example: 7 },
            isActive: { type: 'boolean', example: true }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/modules/**/*.js']
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
export default swaggerSpec;
