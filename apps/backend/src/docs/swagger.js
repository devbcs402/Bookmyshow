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
        },
        Screen: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0e1' },
            theatreId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0a1' },
            partnerId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0b1' },
            name: { type: 'string', example: 'Screen 1 - IMAX with Laser' },
            screenNumber: { type: 'integer', example: 1 },
            screenType: { type: 'string', example: 'IMAX' },
            supportedFormats: {
              type: 'array',
              items: { type: 'string' },
              example: ['2D', '3D', 'IMAX_3D']
            },
            soundSystem: { type: 'string', example: 'Dolby Atmos 12.1' },
            totalSeats: { type: 'integer', example: 250 },
            totalRows: { type: 'integer', example: 12 },
            totalColumns: { type: 'integer', example: 24 },
            layoutVersion: { type: 'integer', example: 1 },
            status: { type: 'string', example: 'ACTIVE' },
            isActive: { type: 'boolean', example: true }
          }
        },
        SeatCategory: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0f1' },
            name: { type: 'string', example: 'VIP Recliner' },
            code: { type: 'string', example: 'RECLINER' },
            displayColor: { type: 'string', example: '#8B5CF6' },
            basePrice: { type: 'number', example: 450 },
            sortOrder: { type: 'integer', example: 1 },
            isActive: { type: 'boolean', example: true }
          }
        },
        SeatingLayout: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0f2' },
            screenId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0e1' },
            layoutVersion: { type: 'integer', example: 1 },
            status: { type: 'string', example: 'PUBLISHED' },
            totalSeats: { type: 'integer', example: 250 },
            bookableSeats: { type: 'integer', example: 248 },
            totalRows: { type: 'integer', example: 12 },
            totalColumns: { type: 'integer', example: 24 },
            categoryBreakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  categoryCode: { type: 'string', example: 'PREMIUM' },
                  count: { type: 'integer', example: 100 },
                  bookableCount: { type: 'integer', example: 100 }
                }
              }
            }
          }
        },
        Seat: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0f3' },
            screenId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0e1' },
            layoutVersion: { type: 'integer', example: 1 },
            rowLabel: { type: 'string', example: 'A' },
            columnNumber: { type: 'integer', example: 1 },
            seatLabel: { type: 'string', example: 'A1' },
            categoryCode: { type: 'string', example: 'RECLINER' },
            type: { type: 'string', example: 'RECLINER' },
            status: { type: 'string', example: 'ACTIVE' },
            gridRow: { type: 'integer', example: 0 },
            gridCol: { type: 'integer', example: 0 },
            isAvailable: { type: 'boolean', example: true },
            accessibility: {
              type: 'object',
              properties: {
                isWheelchairAccessible: { type: 'boolean', example: false },
                hasCompanionSeat: { type: 'boolean', example: false }
              }
            }
          }
        },
        Show: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '67220b3f81e7d23a104f9b01' },
            partnerId: { type: 'string', example: '67220b3f81e7d23a104f9901' },
            theatreId: { type: 'string', example: '67220b3f81e7d23a104f9911' },
            screenId: { type: 'string', example: '67220b3f81e7d23a104f9951' },
            movieId: { type: 'string', example: '67220b3f81e7d23a104f981a' },
            cityId: { type: 'string', example: '67220b3f81e7d23a104f9701' },
            showDate: { type: 'string', format: 'date-time', example: '2026-11-06T00:00:00.000Z' },
            startTime: { type: 'string', format: 'date-time', example: '2026-11-06T19:30:00.000Z' },
            endTime: { type: 'string', format: 'date-time', example: '2026-11-06T22:15:00.000Z' },
            occupiedEndTime: {
              type: 'string',
              format: 'date-time',
              example: '2026-11-06T22:35:00.000Z'
            },
            cleanupBufferMinutes: { type: 'integer', example: 20 },
            timezone: { type: 'string', example: 'Asia/Kolkata' },
            format: { type: 'string', example: 'IMAX_3D' },
            language: { type: 'string', example: 'English' },
            subtitleLanguage: { type: 'string', example: 'English' },
            audioFormat: { type: 'string', example: 'Dolby Atmos' },
            status: { type: 'string', example: 'PUBLISHED' },
            layoutVersion: { type: 'integer', example: 1 },
            totalSeats: { type: 'integer', example: 220 },
            availableSeats: { type: 'integer', example: 220 },
            pricingTiers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  categoryCode: { type: 'string', example: 'RECLINER' },
                  categoryName: { type: 'string', example: 'Royal Recliner' },
                  basePrice: { type: 'number', example: 450.0 },
                  effectivePrice: { type: 'number', example: 531.0 }
                }
              }
            }
          }
        },
        ShowPricing: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '67220b3f81e7d23a104f9c01' },
            showId: { type: 'string', example: '67220b3f81e7d23a104f9b01' },
            categoryCode: { type: 'string', example: 'RECLINER' },
            basePrice: { type: 'number', example: 450.0 },
            convenienceFee: { type: 'number', example: 0 },
            taxPercent: { type: 'number', example: 18.0 },
            effectivePrice: { type: 'number', example: 531.0 },
            currency: { type: 'string', example: 'INR' }
          }
        },
        SeatAvailabilitySeat: {
          type: 'object',
          properties: {
            seatId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0f3' },
            seatLabel: { type: 'string', example: 'A1' },
            columnNumber: { type: 'integer', example: 1 },
            gridCol: { type: 'integer', example: 0 },
            categoryCode: { type: 'string', example: 'RECLINER' },
            type: { type: 'string', example: 'RECLINER' },
            price: { type: 'number', example: 531.0 },
            basePrice: { type: 'number', example: 450.0 },
            status: {
              type: 'string',
              enum: [
                'AVAILABLE',
                'LOCKED_BY_ME',
                'LOCKED_BY_OTHER',
                'BOOKED',
                'MAINTENANCE',
                'BLOCKED'
              ],
              example: 'AVAILABLE'
            },
            isSelectable: { type: 'boolean', example: true },
            lockedUntil: { type: 'string', format: 'date-time', nullable: true },
            accessibility: {
              type: 'object',
              properties: {
                isWheelchairAccessible: { type: 'boolean', example: false },
                hasCompanionSeat: { type: 'boolean', example: false }
              }
            }
          }
        },
        SeatAvailabilityResponse: {
          type: 'object',
          properties: {
            showId: { type: 'string', example: '67220b3f81e7d23a104f9b01' },
            screenId: { type: 'string', example: '67220b3f81e7d23a104f9951' },
            layoutVersion: { type: 'integer', example: 1 },
            showStatus: { type: 'string', example: 'PUBLISHED' },
            isBookable: { type: 'boolean', example: true },
            viewerUserId: { type: 'string', nullable: true, example: '65f1a2b3c4d5e6f7a8b9c0u1' },
            summary: {
              type: 'object',
              properties: {
                totalPhysicalSeats: { type: 'integer', example: 250 },
                availableSeats: { type: 'integer', example: 220 },
                lockedSeats: { type: 'integer', example: 10 },
                bookedSeats: { type: 'integer', example: 15 },
                maintenanceSeats: { type: 'integer', example: 5 }
              }
            },
            pricingTiers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  categoryCode: { type: 'string', example: 'RECLINER' },
                  categoryName: { type: 'string', example: 'Royal Recliner' },
                  basePrice: { type: 'number', example: 450.0 },
                  effectivePrice: { type: 'number', example: 531.0 }
                }
              }
            },
            rows: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  rowLabel: { type: 'string', example: 'A' },
                  categoryCode: { type: 'string', example: 'RECLINER' },
                  seats: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/SeatAvailabilitySeat' }
                  }
                }
              }
            }
          }
        },
        SeatLockAcquireRequest: {
          type: 'object',
          required: ['seatIds'],
          properties: {
            seatIds: {
              type: 'array',
              items: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0f3' },
              minItems: 1,
              maxItems: 10,
              description: 'Array of valid MongoDB seat ObjectIds (up to 10 seats)'
            }
          }
        },
        SeatLockAcquireResponse: {
          type: 'object',
          properties: {
            lockId: { type: 'string', example: 'c6a32d1f-8e4b-4a5c-9c71-2b0f4a8d9e23' },
            showId: { type: 'string', example: '67220b3f81e7d23a104f9b01' },
            userId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0u1' },
            lockedSeats: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  seatId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0f3' },
                  seatLabel: { type: 'string', example: 'A1' },
                  categoryCode: { type: 'string', example: 'RECLINER' },
                  unitPrice: { type: 'number', example: 531.0 }
                }
              }
            },
            ttlSeconds: { type: 'integer', example: 300 },
            expiresAt: { type: 'string', format: 'date-time', example: '2026-11-06T19:05:00.000Z' },
            remainingSeconds: { type: 'integer', example: 300 },
            renewalCount: { type: 'integer', example: 0 },
            maxRenewals: { type: 'integer', example: 2 }
          }
        },
        SeatLockReleaseRequest: {
          type: 'object',
          required: ['lockId', 'seatIds'],
          properties: {
            lockId: {
              type: 'string',
              format: 'uuid',
              example: 'c6a32d1f-8e4b-4a5c-9c71-2b0f4a8d9e23'
            },
            seatIds: {
              type: 'array',
              items: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0f3' },
              minItems: 1,
              maxItems: 10
            }
          }
        },
        SeatLockRenewRequest: {
          type: 'object',
          required: ['lockId', 'seatIds'],
          properties: {
            lockId: {
              type: 'string',
              format: 'uuid',
              example: 'c6a32d1f-8e4b-4a5c-9c71-2b0f4a8d9e23'
            },
            seatIds: {
              type: 'array',
              items: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0f3' },
              minItems: 1,
              maxItems: 10
            }
          }
        },
        BookingCreateRequest: {
          type: 'object',
          required: ['showId', 'seatIds'],
          properties: {
            showId: {
              type: 'string',
              example: '67220b3f81e7d23a104f9b01',
              description: 'Valid MongoDB ObjectId of the published show'
            },
            seatIds: {
              type: 'array',
              items: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0f3' },
              minItems: 1,
              maxItems: 10,
              description: 'Array of seat ObjectIds currently locked by the authenticated customer'
            }
          }
        },
        BookingCancelRequest: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              example: 'Change of schedule plans',
              maxLength: 300,
              description: 'Optional customer or partner reason for cancellation'
            }
          }
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '67220b3f81e7d23a104f9d01' },
            bookingReference: { type: 'string', example: 'BK-20261030-XYZ789' },
            customerId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0u1' },
            partnerId: { type: 'string', example: '67220b3f81e7d23a104f9901' },
            theatreId: { type: 'string', example: '67220b3f81e7d23a104f9911' },
            screenId: { type: 'string', example: '67220b3f81e7d23a104f9951' },
            showId: { type: 'string', example: '67220b3f81e7d23a104f9b01' },
            movieId: { type: 'string', example: '67220b3f81e7d23a104f981a' },
            seats: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  seatId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0f3' },
                  seatLabel: { type: 'string', example: 'A1' },
                  categoryCode: { type: 'string', example: 'RECLINER' },
                  basePrice: { type: 'number', example: 450.0 },
                  convenienceFee: { type: 'number', example: 30.0 },
                  taxAmount: { type: 'number', example: 5.4 },
                  finalPrice: { type: 'number', example: 485.4 }
                }
              }
            },
            totalSeats: { type: 'integer', example: 1 },
            baseAmount: { type: 'number', example: 450.0 },
            convenienceFee: { type: 'number', example: 30.0 },
            taxAmount: { type: 'number', example: 5.4 },
            discountAmount: { type: 'number', example: 0 },
            netPayableAmount: { type: 'number', example: 485.4 },
            currency: { type: 'string', example: 'INR' },
            status: {
              type: 'string',
              enum: [
                'PENDING_PAYMENT',
                'CONFIRMED',
                'FAILED',
                'EXPIRED',
                'CANCELLED',
                'REFUND_PENDING',
                'REFUNDED'
              ],
              example: 'PENDING_PAYMENT'
            },
            snapshot: {
              type: 'object',
              properties: {
                movieTitle: { type: 'string', example: 'Inception' },
                moviePosterUrl: { type: 'string', example: 'https://images.unsplash.com/photo-1' },
                censorRating: { type: 'string', example: 'UA' },
                durationMins: { type: 'integer', example: 148 },
                format: { type: 'string', example: 'IMAX_3D' },
                language: { type: 'string', example: 'English' },
                theatreName: { type: 'string', example: 'PVR ICON' },
                theatreAddress: { type: 'string', example: 'Oberoi Mall, Goregaon, Mumbai' },
                screenName: { type: 'string', example: 'Audi 1' },
                showStartTime: { type: 'string', format: 'date-time' },
                showEndTime: { type: 'string', format: 'date-time' },
                seatSummary: { type: 'string', example: 'A1, A2' }
              }
            },
            qrCodePayload: {
              type: 'string',
              example:
                'eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJCSy0yMDI2MTAzMC1YWVo3ODkiLCJzaG93SWQiOiI2NzIyMGIzZjgxZTdkMjNhMTA0ZjliMDEiLCJzdGF0dXMiOiJQRU5ESU5HX1BBWU1FTlQiLCJpYXQiOjE3Mzg0MjgwMDB9.signature'
            },
            expiresAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        TicketResponse: {
          type: 'object',
          properties: {
            bookingId: { type: 'string', example: '67220b3f81e7d23a104f9d01' },
            bookingReference: { type: 'string', example: 'BK-20261030-XYZ789' },
            movieTitle: { type: 'string', example: 'Inception' },
            theatreName: { type: 'string', example: 'PVR ICON' },
            screenName: { type: 'string', example: 'Audi 1' },
            showTime: { type: 'string', format: 'date-time' },
            seats: {
              type: 'array',
              items: { type: 'string', example: 'A1' }
            },
            totalSeats: { type: 'integer', example: 2 },
            status: { type: 'string', example: 'CONFIRMED' },
            qrToken: { type: 'string' },
            verificationUrl: {
              type: 'string',
              example:
                'https://api.bookmyshow.example.com/api/v1/bookings/verify/BK-20261030-XYZ789'
            }
          }
        },
        PaymentOrderCreateRequest: {
          type: 'object',
          required: ['bookingId'],
          properties: {
            bookingId: {
              type: 'string',
              example: '67220b3f81e7d23a104f9d01',
              description: 'Valid 24-character hexadecimal MongoDB ObjectId of the pending booking'
            }
          }
        },
        PaymentOrderResponse: {
          type: 'object',
          properties: {
            keyId: { type: 'string', example: 'rzp_test_mockKeyId12345678' },
            orderId: { type: 'string', example: 'order_DBJOWzybf0sJbb' },
            amount: { type: 'integer', example: 48540, description: 'Amount in paise' },
            currency: { type: 'string', example: 'INR' },
            bookingReference: { type: 'string', example: 'BK-20261030-XYZ789' },
            bookingId: { type: 'string', example: '67220b3f81e7d23a104f9d01' },
            paymentId: { type: 'string', example: '67220b3f81e7d23a104f9e01' }
          }
        },
        PaymentVerifyRequest: {
          type: 'object',
          required: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'],
          properties: {
            razorpay_order_id: { type: 'string', example: 'order_DBJOWzybf0sJbb' },
            razorpay_payment_id: { type: 'string', example: 'pay_29QQoUBi66xm2f' },
            razorpay_signature: {
              type: 'string',
              example: '9ef426ebf606b111a62d53a330070e36e4bb9a0ef44979f8295b882ac377ac82'
            },
            bookingId: { type: 'string', example: '67220b3f81e7d23a104f9d01' }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '67220b3f81e7d23a104f9e01' },
            bookingId: { type: 'string', example: '67220b3f81e7d23a104f9d01' },
            customerId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0u1' },
            partnerId: { type: 'string', example: '67220b3f81e7d23a104f9901' },
            gateway: { type: 'string', example: 'RAZORPAY' },
            razorpayOrderId: { type: 'string', example: 'order_DBJOWzybf0sJbb' },
            razorpayPaymentId: { type: 'string', example: 'pay_29QQoUBi66xm2f' },
            amount: { type: 'number', example: 485.4 },
            amountInPaise: { type: 'integer', example: 48540 },
            currency: { type: 'string', example: 'INR' },
            status: {
              type: 'string',
              enum: [
                'CREATED',
                'PENDING',
                'AUTHORIZED',
                'CAPTURED',
                'FAILED',
                'REFUND_PENDING',
                'PARTIALLY_REFUNDED',
                'REFUNDED'
              ],
              example: 'CAPTURED'
            },
            paymentMethod: { type: 'string', example: 'upi' },
            verifiedAt: { type: 'string', format: 'date-time' },
            capturedAt: { type: 'string', format: 'date-time' }
          }
        },
        RefundRequest: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: {
              type: 'number',
              example: 485.4,
              description: 'Gross refund amount in Rupees'
            },
            reason: {
              type: 'string',
              enum: [
                'CUSTOMER_REQUESTED',
                'SHOW_CANCELLED',
                'DOUBLE_BOOKING_FAILSAFE',
                'OVERPAYMENT',
                'ADMIN_OVERRIDE'
              ],
              example: 'CUSTOMER_REQUESTED'
            },
            deductions: { type: 'number', example: 0 }
          }
        },
        Refund: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '67220b3f81e7d23a104f9f01' },
            bookingId: { type: 'string', example: '67220b3f81e7d23a104f9d01' },
            paymentId: { type: 'string', example: '67220b3f81e7d23a104f9e01' },
            razorpayRefundId: { type: 'string', example: 'rfnd_DCOWzybf0sJbb' },
            refundAmount: { type: 'number', example: 485.4 },
            status: {
              type: 'string',
              enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'],
              example: 'SUCCESS'
            },
            reason: { type: 'string', example: 'CUSTOMER_REQUESTED' },
            initiatedAt: { type: 'string', format: 'date-time' },
            settledAt: { type: 'string', format: 'date-time' }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c099' },
            userId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c001' },
            title: { type: 'string', example: 'Booking Confirmed! 🎟️' },
            message: {
              type: 'string',
              example: 'Your booking BK-20261030-XYZ789 for Inception is confirmed.'
            },
            type: {
              type: 'string',
              example: 'BOOKING_CONFIRMED'
            },
            category: {
              type: 'string',
              enum: ['TRANSACTIONAL', 'MARKETING', 'SECURITY', 'SYSTEM'],
              example: 'TRANSACTIONAL'
            },
            relatedEntityType: { type: 'string', example: 'booking' },
            relatedEntityId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c088' },
            metadata: { type: 'object' },
            isRead: { type: 'boolean', example: false },
            readAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        NotificationPreference: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c001' },
            channels: {
              type: 'object',
              properties: {
                email: { type: 'boolean', example: true },
                sms: { type: 'boolean', example: true },
                whatsapp: { type: 'boolean', example: false },
                inApp: { type: 'boolean', example: true }
              }
            },
            categories: {
              type: 'object',
              properties: {
                bookingUpdates: { type: 'boolean', example: true },
                paymentUpdates: { type: 'boolean', example: true },
                promotionalUpdates: { type: 'boolean', example: false },
                securityAlerts: { type: 'boolean', example: true }
              }
            },
            preferredLanguage: {
              type: 'string',
              enum: ['en', 'hi', 'gu'],
              example: 'en'
            },
            whatsappConsent: { type: 'boolean', example: false },
            whatsappConsentAt: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        BroadcastAnnouncementRequest: {
          type: 'object',
          required: ['title', 'message'],
          properties: {
            title: { type: 'string', example: 'Scheduled Maintenance Notice' },
            message: {
              type: 'string',
              example: 'The platform will undergo maintenance on Sunday from 2 AM to 4 AM IST.'
            },
            audience: {
              type: 'string',
              enum: ['ALL', 'CUSTOMERS', 'THEATRE_OWNERS'],
              example: 'ALL'
            },
            channels: {
              type: 'array',
              items: { type: 'string', enum: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'] },
              example: ['IN_APP']
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/modules/**/*.js']
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
export default swaggerSpec;
