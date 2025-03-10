const express = require('express');
const { v4: uuidv4 } = require('uuid'); 
const router = express.Router();

module.exports = (pool, authenticateToken) => {
  
  /**
   * @swagger
   * tags:
   *   name: Rides
   *   description: Ride management endpoints
   */

  /**
   * @swagger
   * /rides/offerride/{user}:
   *   post:
   *     summary: Offer a ride
   *     tags: [Rides]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: user
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the user offering the ride
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - origin
   *               - destination
   *               - date
   *               - time
   *               - seats_available
   *             properties:
   *               origin:
   *                 type: string
   *                 example: "New York"
   *               destination:
   *                 type: string
   *                 example: "Boston"
   *               date:
   *                 type: string
   *                 format: date
   *                 example: "2025-03-10"
   *               time:
   *                 type: string
   *                 example: "14:00"
   *               seats_available:
   *                 type: integer
   *                 example: 3
   *     responses:
   *       200:
   *         description: Ride offered successfully
   *       500:
   *         description: Internal server error
   */
  router.post('/offerride/:user', authenticateToken, async (req, res) => {
    const { origin, destination, date, time, seats_available } = req.body;
    try {
      await pool.execute(
        'INSERT INTO rides (user_id, origin, destination, date, time, seats_available) VALUES (?, ?, ?, ?, ?, ?)',
        [req.params.user, origin, destination, date, time, seats_available]
      );
      res.json({ message: 'Ride offered successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * @swagger
   * /rides/search:
   *   post:
   *     summary: Search for available rides
   *     tags: [Rides]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - origin
   *               - destination
   *               - date
   *             properties:
   *               origin:
   *                 type: string
   *                 example: "New York"
   *               destination:
   *                 type: string
   *                 example: "Boston"
   *               date:
   *                 type: string
   *                 format: date
   *                 example: "2025-03-10"
   *     responses:
   *       200:
   *         description: List of available rides
   *       500:
   *         description: Internal server error
   */
  router.post('/search', authenticateToken, async (req, res) => {
    const { origin, destination, date } = req.body;
    try {
      const [results] = await pool.execute(
        'SELECT * FROM rides WHERE origin = ? AND destination = ? AND date = ?',
        [origin, destination, date]
      );
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * @swagger
   * /rides/available:
   *   get:
   *     summary: Get all available rides
   *     tags: [Rides]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of available rides
   *       500:
   *         description: Internal server error
   */
  router.get('/available', authenticateToken, async (req, res) => {
    try {
      const [results] = await pool.execute('SELECT * FROM rides WHERE seats_available > 0');
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * @swagger
   * /rides/history/{user}:
   *   get:
   *     summary: Get user booking history
   *     tags: [Rides]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: user
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the user
   *     responses:
   *       200:
   *         description: List of user's booking history
   *       500:
   *         description: Internal server error
   */
  router.get('/bookings/history/:user', authenticateToken, async (req, res) => {
    try {
      const [history] = await pool.execute(
        `SELECT bookings.id, rides.origin, rides.destination, rides.date, bookings.status 
         FROM bookings 
         JOIN rides ON bookings.ride_id = rides.id 
         WHERE bookings.user_id = ?`, 
        [req.params.user]
      );
  
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  

  /**
   * @swagger
   * /rides/my-pool/{user}:
   *   get:
   *     summary: Fetch the user's carpool
   *     tags: [Carpool]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: user
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     responses:
   *       200:
   *         description: Carpool details fetched successfully
   *       500:
   *         description: Internal server error
   */
  router.get("/my-pool/:user", authenticateToken, async (req, res) => {
    try {
      //const [rides] = await pool.execute("SELECT * FROM carpools WHERE user_id = ?", [req.params.user]);
      const [rides] = await pool.execute("SELECT * FROM rides WHERE driver_id = 1 OR id IN (SELECT ride_id FROM bookings WHERE passenger_id = 1)", [req.params.user]);
      res.json(rides);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * @swagger
   * /rides/book-ride:
   *   post:
   *     summary: Book a ride
   *     tags: [Booking]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - rideId
   *               - seats
   *             properties:
   *               rideId:
   *                 type: string
   *                 example: "69d206c2-1"
   *               seats:
   *                 type: integer
   *                 example: 2
   *     responses:
   *       201:
   *         description: Ride booked successfully
   *       400:
   *         description: Missing required fields or insufficient seats
   *       404:
   *         description: Ride not found
   *       500:
   *         description: Internal server error
   */
  router.post('/book-ride', authenticateToken, async (req, res) => {
    try {
        const { rideId, seats } = req.body; // Ride ID and number of seats to book
        const userId = req.user.id; // Authenticated user's ID

        if (!rideId || !seats) {
            return res.status(400).json({ error: 'Ride ID and number of seats are required.' });
        }

        // Fetch ride details
        const [ride] = await pool.execute(
            `SELECT seats_available, status FROM rides WHERE id = ?`,
            [rideId]
        );

        if (ride.length === 0) {
            return res.status(404).json({ error: 'Ride not found.' });
        }

        const rideDetails = ride[0];

        // Check if ride is completed or canceled
        if (['completed', 'canceled'].includes(rideDetails.status)) {
            return res.status(400).json({ error: `This ride has been ${rideDetails.status}.` });
        }

        // Check if ride has enough available seats
        if (rideDetails.seats_available < seats) {
            return res.status(400).json({ error: 'Not enough seats available.' });
        }

        // Check if the user already has a confirmed booking for this ride
        const [existingBooking] = await pool.execute(
            `SELECT * FROM bookings WHERE user_id = ? AND ride_id = ? AND status = 'confirmed'`,
            [userId, rideId]
        );

        if (existingBooking.length > 0) {
            return res.status(400).json({ error: 'You already have a confirmed booking for this ride.' });
        }

        // Insert booking
        await pool.execute(
            `INSERT INTO bookings (id, user_id, ride_id, seats, status) VALUES (?, ?, ?, ?, 'pending')`,
            [uuidv4(), userId, rideId, seats]
        );

        // Update available seats
        await pool.execute(
            `UPDATE rides SET seats_available = seats_available - ? WHERE id = ?`,
            [seats, rideId]
        );

        // Check if ride is now full, update status if necessary
        const [updatedRide] = await pool.execute(
            `SELECT seats_available FROM rides WHERE id = ?`,
            [rideId]
        );

        if (updatedRide[0].seats_available === 0) {
            await pool.execute(
                `UPDATE rides SET status = 'full' WHERE id = ?`,
                [rideId]
            );
        }

        res.status(201).json({ message: '✅ Ride booked successfully. Waiting for confirmation.' });
    } catch (error) {
        console.error('❌ Booking error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  /**
     * @swagger
     * /rides/cancel-ride:
     *   post:
     *     summary: Cancel a ride
     *     tags: [Rides]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - rideId
     *             properties:
     *               rideId:
     *                 type: string
     *                 example: "69d206c2-1"
     *     responses:
     *       200:
     *         description: Ride canceled successfully
     *       403:
     *         description: Ride not found or not authorized to cancel
     *       500:
     *         description: Internal server error
    */
  router.post('/cancel-ride', authenticateToken, async (req, res) => {
    try {
        const { rideId } = req.body;
        const userId = req.user.id;

        // Check if the ride exists and belongs to the driver
        const [ride] = await pool.execute(
            `SELECT * FROM rides WHERE id = ? AND user_id = ?`,
            [rideId, userId]
        );

        if (ride.length === 0) {
            return res.status(403).json({ error: 'Ride not found or not yours to cancel' });
        }

        // Update status to canceled
        await pool.execute(
            `UPDATE rides SET status = 'canceled' WHERE id = ?`,
            [rideId]
        );

        res.status(200).json({ message: '🚫 Ride canceled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
  });


  return router;
};
