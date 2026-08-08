/** @type {import('openapi-types').OpenAPIV3.Document} */
const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Kisan Mall API',
    description:
      'REST API for Customer, Admin, and Staff (Packer + Delivery) apps.\n\n' +
      'Use **Authorize** and paste a JWT as `Bearer <token>` for protected routes.',
    version: '1.0.0',
    contact: { name: 'Kisan Mall' },
  },
  servers: [
    { url: 'https://kisan-backend-ten.vercel.app/api', description: 'Production (Vercel)' },
    { url: 'http://localhost:3000/api', description: 'Local' },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Customer Auth' },
    { name: 'Customer Catalog' },
    { name: 'Customer Addresses' },
    { name: 'Customer Orders' },
    { name: 'Customer Coupons' },
    { name: 'Customer Wishlist' },
    { name: 'Customer Notifications' },
    { name: 'Admin Auth' },
    { name: 'Admin Dashboard' },
    { name: 'Admin Products' },
    { name: 'Admin Catalog' },
    { name: 'Admin Orders' },
    { name: 'Admin Customers' },
    { name: 'Admin Inventory' },
    { name: 'Admin Payments' },
    { name: 'Admin Misc' },
    { name: 'Staff Auth' },
    { name: 'Staff Packer' },
    { name: 'Staff Delivery' },
  ],
  components: {
    securitySchemes: {
      CustomerBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Customer JWT from /customer/auth/otp/verify',
      },
      AdminBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Admin JWT from /admin/auth/login',
      },
      StaffBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Staff JWT from /staff/auth/login',
      },
    },
    schemas: {
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {},
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
        },
      },
      CustomerUser: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          mobile: { type: 'string', example: '9876543210' },
          name: { type: 'string' },
          email: { type: 'string' },
          isLocationSet: { type: 'boolean' },
          hasPassword: { type: 'boolean' },
        },
      },
      AdminUser: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string' },
        },
      },
      StaffUser: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          mobile: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['packer', 'delivery_boy'] },
          isOnline: { type: 'boolean' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    service: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ===== Customer Auth =====
    '/customer/auth/otp/send': {
      post: {
        tags: ['Customer Auth'],
        summary: 'Send login OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobile'],
                properties: { mobile: { type: 'string', example: '9876543210' } },
              },
            },
          },
        },
        responses: { 200: { description: 'OTP sent' }, 400: { description: 'Invalid mobile' } },
      },
    },
    '/customer/auth/otp/verify': {
      post: {
        tags: ['Customer Auth'],
        summary: 'Verify OTP and login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobile', 'otp'],
                properties: {
                  mobile: { type: 'string' },
                  otp: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Returns token + user' }, 401: { description: 'Invalid OTP' } },
      },
    },
    '/customer/auth/me': {
      get: {
        tags: ['Customer Auth'],
        summary: 'Get current customer',
        security: [{ CustomerBearer: [] }],
        responses: { 200: { description: 'Customer profile' } },
      },
    },
    '/customer/auth/profile': {
      put: {
        tags: ['Customer Auth'],
        summary: 'Update name and email',
        security: [{ CustomerBearer: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated profile' } },
      },
    },
    '/customer/auth/password/change': {
      post: {
        tags: ['Customer Auth'],
        summary: 'Change or set password',
        security: [{ CustomerBearer: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Password updated' } },
      },
    },
    '/customer/auth/password/forgot': {
      post: {
        tags: ['Customer Auth'],
        summary: 'Forgot password — send OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobile'],
                properties: { mobile: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'OTP sent' } },
      },
    },
    '/customer/auth/password/reset': {
      post: {
        tags: ['Customer Auth'],
        summary: 'Reset password with OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobile', 'otp', 'newPassword'],
                properties: {
                  mobile: { type: 'string' },
                  otp: { type: 'string' },
                  newPassword: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Password reset' } },
      },
    },
    '/customer/auth/logout': {
      post: {
        tags: ['Customer Auth'],
        summary: 'Logout',
        responses: { 200: { description: 'Logged out' } },
      },
    },

    // ===== Customer Catalog =====
    '/customer/categories': {
      get: {
        tags: ['Customer Catalog'],
        summary: 'List categories',
        responses: { 200: { description: 'Category list' } },
      },
    },
    '/customer/products': {
      get: {
        tags: ['Customer Catalog'],
        summary: 'List products',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Product list' } },
      },
    },
    '/customer/products/search': {
      get: {
        tags: ['Customer Catalog'],
        summary: 'Search products',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Search results' } },
      },
    },
    '/customer/products/{id}': {
      get: {
        tags: ['Customer Catalog'],
        summary: 'Get product by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Product' } },
      },
    },
    '/customer/delivery-slots': {
      get: {
        tags: ['Customer Catalog'],
        summary: 'List delivery slots',
        responses: { 200: { description: 'Slots' } },
      },
    },
    '/customer/banners': {
      get: {
        tags: ['Customer Catalog'],
        summary: 'List banners',
        responses: { 200: { description: 'Banners' } },
      },
    },
    '/customer/config/serviceable-pincodes': {
      get: {
        tags: ['Customer Catalog'],
        summary: 'Serviceable pincodes',
        responses: { 200: { description: 'Pincode list' } },
      },
    },
    '/customer/locations/serviceable': {
      get: {
        tags: ['Customer Catalog'],
        summary: 'Check if pincode is serviceable',
        parameters: [{ name: 'pincode', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Serviceability result' } },
      },
    },

    // ===== Customer Addresses / Orders / etc =====
    '/customer/addresses': {
      get: {
        tags: ['Customer Addresses'],
        summary: 'List addresses',
        security: [{ CustomerBearer: [] }],
        responses: { 200: { description: 'Addresses' } },
      },
      post: {
        tags: ['Customer Addresses'],
        summary: 'Add address',
        security: [{ CustomerBearer: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  name: { type: 'string' },
                  mobile: { type: 'string' },
                  house: { type: 'string' },
                  area: { type: 'string' },
                  landmark: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  pincode: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Created' }, 201: { description: 'Created' } },
      },
    },
    '/customer/addresses/location/set': {
      post: {
        tags: ['Customer Addresses'],
        summary: 'Mark location as set',
        security: [{ CustomerBearer: [] }],
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/customer/coupons/available': {
      get: {
        tags: ['Customer Coupons'],
        summary: 'Available coupons',
        security: [{ CustomerBearer: [] }],
        responses: { 200: { description: 'Coupons' } },
      },
    },
    '/customer/coupons/validate': {
      post: {
        tags: ['Customer Coupons'],
        summary: 'Validate coupon',
        security: [{ CustomerBearer: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  subtotal: { type: 'number' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Validation result' } },
      },
    },
    '/customer/orders': {
      get: {
        tags: ['Customer Orders'],
        summary: 'List my orders',
        security: [{ CustomerBearer: [] }],
        responses: { 200: { description: 'Orders' } },
      },
      post: {
        tags: ['Customer Orders'],
        summary: 'Place order',
        security: [{ CustomerBearer: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productId: { type: 'string' },
                        quantity: { type: 'integer' },
                      },
                    },
                  },
                  addressId: { type: 'string' },
                  slotId: { type: 'string' },
                  paymentMethod: { type: 'string' },
                  couponCode: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Order created' }, 201: { description: 'Order created' } },
      },
    },
    '/customer/orders/{orderId}': {
      get: {
        tags: ['Customer Orders'],
        summary: 'Get order',
        security: [{ CustomerBearer: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Order' } },
      },
    },
    '/customer/orders/{orderId}/tracking': {
      get: {
        tags: ['Customer Orders'],
        summary: 'Track order',
        security: [{ CustomerBearer: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Tracking' } },
      },
    },
    '/customer/orders/{orderId}/review': {
      post: {
        tags: ['Customer Orders'],
        summary: 'Add order review',
        security: [{ CustomerBearer: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  rating: { type: 'integer' },
                  comment: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Review saved' } },
      },
    },
    '/customer/wishlist': {
      get: {
        tags: ['Customer Wishlist'],
        summary: 'Get wishlist',
        security: [{ CustomerBearer: [] }],
        responses: { 200: { description: 'Wishlist' } },
      },
    },
    '/customer/wishlist/{productId}': {
      post: {
        tags: ['Customer Wishlist'],
        summary: 'Add to wishlist',
        security: [{ CustomerBearer: [] }],
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Added' } },
      },
      delete: {
        tags: ['Customer Wishlist'],
        summary: 'Remove from wishlist',
        security: [{ CustomerBearer: [] }],
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Removed' } },
      },
    },
    '/customer/notifications': {
      get: {
        tags: ['Customer Notifications'],
        summary: 'List notifications',
        security: [{ CustomerBearer: [] }],
        responses: { 200: { description: 'Notifications' } },
      },
    },
    '/customer/notifications/{id}/read': {
      patch: {
        tags: ['Customer Notifications'],
        summary: 'Mark notification read',
        security: [{ CustomerBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated' } },
      },
    },

    // ===== Admin Auth =====
    '/admin/auth/login': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Admin login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'token + user' }, 401: { description: 'Invalid credentials' } },
      },
    },
    '/admin/auth/me': {
      get: {
        tags: ['Admin Auth'],
        summary: 'Get current admin',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Admin profile' } },
      },
    },
    '/admin/auth/profile': {
      put: {
        tags: ['Admin Auth'],
        summary: 'Update admin profile',
        security: [{ AdminBearer: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/admin/auth/password/change': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Change password',
        security: [{ AdminBearer: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/admin/auth/password/forgot': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Forgot password — send OTP',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'OTP sent' } },
      },
    },
    '/admin/auth/password/reset': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Reset password with OTP',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'otp', 'newPassword'],
                properties: {
                  email: { type: 'string' },
                  otp: { type: 'string' },
                  newPassword: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Reset' } },
      },
    },

    // ===== Admin resources =====
    '/admin/dashboard/stats': {
      get: {
        tags: ['Admin Dashboard'],
        summary: 'Dashboard stats',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Stats' } },
      },
    },
    '/admin/products': {
      get: {
        tags: ['Admin Products'],
        summary: 'List products',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Products' } },
      },
      post: {
        tags: ['Admin Products'],
        summary: 'Create product',
        security: [{ AdminBearer: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/admin/products/{id}': {
      get: {
        tags: ['Admin Products'],
        summary: 'Get product',
        security: [{ AdminBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Product' } },
      },
      put: {
        tags: ['Admin Products'],
        summary: 'Update product',
        security: [{ AdminBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Admin Products'],
        summary: 'Delete product',
        security: [{ AdminBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' } },
      },
    },
    '/admin/categories': {
      get: {
        tags: ['Admin Catalog'],
        summary: 'List categories',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Categories' } },
      },
      post: {
        tags: ['Admin Catalog'],
        summary: 'Create category',
        security: [{ AdminBearer: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/admin/brands': {
      get: {
        tags: ['Admin Catalog'],
        summary: 'List brands',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Brands' } },
      },
      post: {
        tags: ['Admin Catalog'],
        summary: 'Create brand',
        security: [{ AdminBearer: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/admin/orders': {
      get: {
        tags: ['Admin Orders'],
        summary: 'List orders',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Orders' } },
      },
    },
    '/admin/orders/{orderId}/status': {
      patch: {
        tags: ['Admin Orders'],
        summary: 'Update order status',
        security: [{ AdminBearer: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/admin/orders/{orderId}/assign-delivery': {
      post: {
        tags: ['Admin Orders'],
        summary: 'Assign delivery staff',
        security: [{ AdminBearer: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { staffId: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Assigned' } },
      },
    },
    '/admin/customers': {
      get: {
        tags: ['Admin Customers'],
        summary: 'List customers',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Customers' } },
      },
    },
    '/admin/customers/{id}/block': {
      patch: {
        tags: ['Admin Customers'],
        summary: 'Block customer',
        security: [{ AdminBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Blocked' } },
      },
    },
    '/admin/customers/{id}/unblock': {
      patch: {
        tags: ['Admin Customers'],
        summary: 'Unblock customer',
        security: [{ AdminBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Unblocked' } },
      },
    },
    '/admin/inventory/transactions': {
      get: {
        tags: ['Admin Inventory'],
        summary: 'Inventory transactions',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Transactions' } },
      },
    },
    '/admin/inventory/products/{productId}/stock': {
      patch: {
        tags: ['Admin Inventory'],
        summary: 'Adjust stock',
        security: [{ AdminBearer: [] }],
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  newStock: { type: 'integer' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/admin/coupons': {
      get: {
        tags: ['Admin Misc'],
        summary: 'List coupons',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Coupons' } },
      },
      post: {
        tags: ['Admin Misc'],
        summary: 'Create coupon',
        security: [{ AdminBearer: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/admin/offers': {
      get: {
        tags: ['Admin Misc'],
        summary: 'List offers',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Offers' } },
      },
    },
    '/admin/banners': {
      get: {
        tags: ['Admin Misc'],
        summary: 'List banners',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Banners' } },
      },
    },
    '/admin/delivery-slots': {
      get: {
        tags: ['Admin Misc'],
        summary: 'List delivery slots',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Slots' } },
      },
    },
    '/admin/payments': {
      get: {
        tags: ['Admin Payments'],
        summary: 'List payments',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Payments' } },
      },
    },
    '/admin/refunds': {
      get: {
        tags: ['Admin Payments'],
        summary: 'List refunds',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Refunds' } },
      },
    },
    '/admin/reports/sales': {
      get: {
        tags: ['Admin Misc'],
        summary: 'Sales report',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Sales data' } },
      },
    },
    '/admin/settings': {
      get: {
        tags: ['Admin Misc'],
        summary: 'Get settings',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Settings' } },
      },
      put: {
        tags: ['Admin Misc'],
        summary: 'Save settings',
        security: [{ AdminBearer: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Saved' } },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin Misc'],
        summary: 'List admin users',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Users' } },
      },
      post: {
        tags: ['Admin Misc'],
        summary: 'Create admin user',
        security: [{ AdminBearer: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/admin/staff': {
      get: {
        tags: ['Admin Misc'],
        summary: 'List staff users',
        security: [{ AdminBearer: [] }],
        responses: { 200: { description: 'Staff' } },
      },
    },
    '/admin/notifications/send': {
      post: {
        tags: ['Admin Misc'],
        summary: 'Send notification',
        security: [{ AdminBearer: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  message: { type: 'string' },
                  type: { type: 'string' },
                  audience: { type: 'string' },
                  customerId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Sent' } },
      },
    },

    // ===== Staff Auth =====
    '/staff/auth/login': {
      post: {
        tags: ['Staff Auth'],
        summary: 'Staff login (mobile + PIN)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobile', 'pin'],
                properties: {
                  mobile: { type: 'string' },
                  pin: { type: 'string', example: '1234' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'token + user' } },
      },
    },
    '/staff/auth/me': {
      get: {
        tags: ['Staff Auth'],
        summary: 'Get current staff',
        security: [{ StaffBearer: [] }],
        responses: { 200: { description: 'Staff profile' } },
      },
    },
    '/staff/auth/profile': {
      put: {
        tags: ['Staff Auth'],
        summary: 'Update staff profile',
        security: [{ StaffBearer: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/staff/auth/pin/change': {
      post: {
        tags: ['Staff Auth'],
        summary: 'Change PIN',
        security: [{ StaffBearer: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPin', 'newPin'],
                properties: {
                  currentPin: { type: 'string' },
                  newPin: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/staff/auth/pin/forgot': {
      post: {
        tags: ['Staff Auth'],
        summary: 'Forgot PIN — send OTP',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobile'],
                properties: { mobile: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'OTP sent' } },
      },
    },
    '/staff/auth/pin/reset': {
      post: {
        tags: ['Staff Auth'],
        summary: 'Reset PIN with OTP',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobile', 'otp', 'newPin'],
                properties: {
                  mobile: { type: 'string' },
                  otp: { type: 'string' },
                  newPin: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Reset' } },
      },
    },

    // ===== Packer =====
    '/staff/packer/orders': {
      get: {
        tags: ['Staff Packer'],
        summary: 'List packer orders',
        security: [{ StaffBearer: [] }],
        responses: { 200: { description: 'Orders' } },
      },
    },
    '/staff/packer/orders/counts': {
      get: {
        tags: ['Staff Packer'],
        summary: 'Packer order counts',
        security: [{ StaffBearer: [] }],
        responses: { 200: { description: 'Counts' } },
      },
    },
    '/staff/packer/orders/{orderId}/status': {
      patch: {
        tags: ['Staff Packer'],
        summary: 'Update packer status',
        security: [{ StaffBearer: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string', example: 'picking' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/staff/packer/orders/{orderId}/items/{itemId}/scan': {
      post: {
        tags: ['Staff Packer'],
        summary: 'Scan item barcode',
        security: [{ StaffBearer: [] }],
        parameters: [
          { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { barcode: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Scanned' } },
      },
    },

    // ===== Delivery =====
    '/staff/delivery/orders': {
      get: {
        tags: ['Staff Delivery'],
        summary: 'List delivery orders',
        security: [{ StaffBearer: [] }],
        responses: { 200: { description: 'Orders' } },
      },
    },
    '/staff/delivery/orders/counts': {
      get: {
        tags: ['Staff Delivery'],
        summary: 'Delivery order counts',
        security: [{ StaffBearer: [] }],
        responses: { 200: { description: 'Counts' } },
      },
    },
    '/staff/delivery/orders/{orderId}/accept': {
      post: {
        tags: ['Staff Delivery'],
        summary: 'Accept delivery',
        security: [{ StaffBearer: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Accepted' } },
      },
    },
    '/staff/delivery/orders/{orderId}/start': {
      post: {
        tags: ['Staff Delivery'],
        summary: 'Start delivery',
        security: [{ StaffBearer: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Started' } },
      },
    },
    '/staff/delivery/orders/{orderId}/verify-otp': {
      post: {
        tags: ['Staff Delivery'],
        summary: 'Verify customer delivery OTP',
        security: [{ StaffBearer: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { otp: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Verified' } },
      },
    },
    '/staff/delivery/orders/{orderId}/complete': {
      post: {
        tags: ['Staff Delivery'],
        summary: 'Complete delivery',
        security: [{ StaffBearer: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { codCollected: { type: 'boolean' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Completed' } },
      },
    },
    '/staff/delivery/profile/online': {
      patch: {
        tags: ['Staff Delivery'],
        summary: 'Set online status',
        security: [{ StaffBearer: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { isOnline: { type: 'boolean' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/staff/delivery/earnings': {
      get: {
        tags: ['Staff Delivery'],
        summary: 'Get earnings',
        security: [{ StaffBearer: [] }],
        responses: { 200: { description: 'Earnings' } },
      },
    },
  },
};

export default openApiSpec;
