const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const winston = require('winston');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerSetup = require('./swaggerConfig');
const cron = require('node-cron');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
//const HOST = '0.0.0.0';

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

app.use(cors({
  origin: ['https://rides.api.smartryuga.com', 'http://localhost:'], // ✅ Add your frontend URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // ✅ Allow cookies if needed
  allowedHeaders: ['Content-Type', 'Authorization'] // ✅ Ensure required headers are allowed
}));

app.use(bodyParser.json());

// Logger setup (Winston)
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'server.log', fsync: true }) // 🔥 Forces immediate file write
    ]
  });
  
  // Ensure logs are flushed when the process exits
  process.on('exit', () => {
    logger.end();
  });

  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url} - ${req.ip}`);
    next();
  });  

// Database Connection (Using Pool)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test Database Connection
(async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('✅ Database connected successfully');
    connection.release();
  } catch (err) {
    logger.error(`❌ Database connection failed: ${err.message}`);
  }
})();

// Run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
      console.log('🚀 Running ride status update...');

      // Mark completed rides (past date and time)
      await pool.execute(
          `UPDATE rides SET status = 'completed' 
           WHERE CONCAT(date, ' ', time) < NOW() 
           AND status NOT IN ('completed', 'canceled')`
      );

      console.log('✅ Ride statuses updated');
  } catch (error) {
      console.error('❌ Error updating ride statuses:', error.message);
  }
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Extract token
  if (!token) return res.status(403).json({ error: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user; // Attach user to request
    next();
  });
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // 🔥 Change * to specific origins if needed
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200); // ✅ Allow preflight requests
  }

  next();
});

// Routes (Modularized)
const userRoutes = require('./routes/userRoutes')(pool, bcrypt, jwt, authenticateToken);
const rideRoutes = require('./routes/rideRoutes')(pool, authenticateToken);
const vehicleRoutes = require('./routes/vehicleRoutes')(pool, authenticateToken);
const rideAgreements = require('./routes/rideAgreements')(pool, authenticateToken);

app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/agreements', rideAgreements);


// Swagger API Docs

// Load Swagger
swaggerSetup(app);

// Root API
app.get('/', (req, res) => {
  res.json({ message: '🚀 Ride Pool API is running!' });
  //res.redirect('/api-docs');
});

// Root API Health Check
app.get('/health', (req, res) => {
  res.json({ message: '🚀 Ride Pool API is running!' });
});

// Start Server
const server = app.listen(PORT,() => {
  logger.info(`Server running on https://rides.api.smartryuga.com`);
  logger.info(`Server running on http://localhost:${PORT}`);
});

// app.listen(PORT, HOST, () => {
//   logger.info(`Server running on http://${HOST}:${PORT}`);
//   logger.info(`✅ Server running on https://smartryuga.com/rideapi`);
// });

// module.exports = app; // Export app for testing
module.exports = { app, server }; // Export both app and server