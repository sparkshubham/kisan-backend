import swaggerUi from 'swagger-ui-express';
import openApiSpec from './openapi.js';

export function setupSwagger(app) {
  app.get('/api/docs.json', (_req, res) => {
    res.json(openApiSpec);
  });

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'Kisan Mall API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        tryItOutEnabled: true,
      },
    })
  );
}
