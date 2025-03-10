const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ride-Pool API",
      version: "1.0.1",
      description: "API for ride-sharing platform",
    },
    servers: [
      {
        url: "https://rides.api.smartryuga.com/api",
        //url: "http://localhost:3000/api",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT", // 👈 Important for Swagger to recognize JWT
        },
      },
    },
    security: [
      {
        bearerAuth: [], // 👈 This applies JWT globally to all routes
      },
    ],
  },
  apis: ["./routes/*.js"], // 👈 Auto-loads route files
};

const swaggerDocs = swaggerJsDoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
};
