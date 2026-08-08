import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index.js';
import { setupSwagger } from './docs/swagger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

setupSwagger(app);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
