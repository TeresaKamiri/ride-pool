const request = require('supertest');
const { app, server } = require('./api'); // Import the express app and server

afterAll((done) => {
  server.close(done); // Properly close the server
});

describe('Basic API Tests', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown');
    expect(res.statusCode).toBe(404);
  });
});
