const express = require('express'); 
const router = express.Router();

module.exports = (pool, bcrypt, jwt, authenticateToken) => {
  
  // Middleware for Role-Based Access
  const authorize = (roles) => {
    return (req, res, next) => {
        console.log('User role:', req.user.role); // Debug log
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
  };
  
  /**
   * @swagger
   * tags:
   *   name: User
   *   description: User authentication and management
   */

  /**
   * @swagger
   * /users/register:
   *   post:
   *     summary: Register a new user
   *     tags: [User]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - email
   *               - phone
   *               - password
   *             properties:
   *               name:
   *                 type: string
   *                 example: John Doe
   *               email:
   *                 type: string
   *                 example: john@example.com
   *               phone:
   *                 type: string
   *                 example: "+123456789"
   *               password:
   *                 type: string
   *                 example: mysecurepassword
   *     responses:
   *       201:
   *         description: User created successfully
   *       400:
   *         description: Missing required fields
   *       500:
   *         description: Internal server error
   */
  router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            `INSERT INTO users (id, name, email, phone, password, role) VALUES (UUID(), ?, ?, ?, ?, ?)`,
            [name, email, phone, hashedPassword, role || 'passenger']
        );

        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /users/login:
   *   post:
   *     summary: Authenticate user and return a token
   *     tags: [User]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 example: john@example.com
   *               password:
   *                 type: string
   *                 example: mysecurepassword
   *     responses:
   *       200:
   *         description: Login successful
   *       400:
   *         description: Email and password required
   *       401:
   *         description: Invalid credentials
   *       500:
   *         description: Internal server error
   */
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
      const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, users[0].password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: users[0].id, email: users[0].email, role: users[0].role }, process.env.JWT_SECRET, { expiresIn: '1h' });
      
      // const token = jwt.sign(
      //   { id: user.id, email: user.email, role: user.role }, // Add role here
      //   process.env.JWT_SECRET,
      //   { expiresIn: '1h' }
      // );

      res.json({ token });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * @swagger
   * /users/profile/{user}:
   *   get:
   *     summary: Get user profile
   *     tags: [User]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: user
   *         required: true
   *         schema:
   *           type: string  
   *         description: UUID of the user
   *     responses:
   *       200:
   *         description: User profile data retrieved successfully
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  const { v4: uuidv4 } = require('uuid'); // Ensure UUID support

  router.get('/profile/:user', authenticateToken, async (req, res) => {
      try {
          const userId = req.params.user.trim(); // UUID-based user ID

          // 1️⃣ Fetch User Info + Driver Details (if applicable)
          const [users] = await pool.execute(`
              SELECT 
                  u.id, u.name, u.email, u.phone, 
                  d.license_number, d.license_expiry
              FROM users u
              LEFT JOIN drivers d ON u.id = d.user_id
              WHERE u.id = ?`, 
              [userId]
          );

          if (!users || users.length === 0) {
              return res.status(404).json({ error: 'User not found' });
          }

          const user = users[0]; // Single user record

          // 2️⃣ Check if User is a Driver & Fetch Vehicles
          let vehicles = [];
          if (user.driver_license) {
              const [vehicleRecords] = await pool.execute(`
                  SELECT id, make, model, plate, capacity 
                  FROM vehicles 
                  WHERE user_id = ?`, 
                  [userId]
              );
              vehicles = vehicleRecords;
          }

          // 3️⃣ Build Final Response
          const responseData = {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              is_driver: user.license_number ? true : false,
              driver_license: user.license_number || null,
              license_verified: user.license_expiry || false,
              vehicles: vehicles
          };

          res.json(responseData);
      } catch (err) {
          res.status(500).json({ error: err.message });
      }
    });

    /**
     * @swagger
     * /users/profile/{user}:
     *   put:
     *     summary: Update user profile
     *     tags: [User]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: user
     *         required: true
     *         schema:
     *           type: string
     *         description: User UUID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *               phone:
     *                 type: string
     *     responses:
     *       200:
     *         description: User profile updated successfully
     *       400:
     *         description: Invalid request data
     *       500:
     *         description: Internal server error
     */
    router.put('/profile/:user', authenticateToken, async (req, res) => {
        const { name, phone } = req.body;
        const userId = req.params.user; // UUID-based user ID
    
        if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });
    
        try {
            await pool.execute(
                'UPDATE users SET name = ?, phone = ? WHERE id = ?', 
                [name, phone, userId]
            );
    
            res.json({ message: 'User profile updated successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    
    /**
     * @swagger
     * /users/become-driver:
     *   post:
     *     summary: Register as a driver
     *     tags: [Drivers]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               license_number:
     *                 type: string
     *                 description: Driver's license number
     *               license_expiry:
     *                 type: string
     *                 format: date
     *                 description: License expiration date (YYYY-MM-DD)
     *     responses:
     *       201:
     *         description: Successfully registered as a driver
     *       400:
     *         description: User is already a driver
     *       500:
     *         description: Internal server error
     */
    router.post('/become-driver', authenticateToken, async (req, res) => {
      try {
          const userId = req.user.id; // UUID-based user ID
          const { license_number, license_expiry } = req.body;
  
          if (!license_number || !license_expiry) {
              return res.status(400).json({ error: 'License number and expiry date are required.' });
          }
  
          // Check if user is already a driver
          const [existingDriver] = await pool.query(
              `SELECT * FROM drivers WHERE user_id = ?`, 
              [userId]
          );
  
          if (existingDriver.length > 0) {
              return res.status(400).json({ error: 'User is already a driver.' });
          }
  
          // Register as driver
          await pool.query(
              `INSERT INTO drivers (id, user_id, license_number, license_expiry) VALUES (?, ?, ?, ?)`, 
              [uuidv4(), userId, license_number, license_expiry]
          );

          // Update user role to 'driver'
          await pool.query(
            `UPDATE users SET role = 'driver' WHERE id = ?`,
            [userId]
          );
  
          res.status(201).json({ message: 'User is now a driver!' });
      } catch (error) {
          res.status(500).json({ error: error.message });
      }
    });
  
    
    /**
     * @swagger
     * /users/drivers/{user}:
     *   get:
     *     summary: Get driver details
     *     tags: [Drivers]
     *     parameters:
     *       - in: path
     *         name: user
     *         required: true
     *         schema:
     *           type: string
     *         description: User UUID
     *     responses:
     *       200:
     *         description: Driver details retrieved successfully
     *       404:
     *         description: Driver not found
     *       500:
     *         description: Internal server error
     */
    router.get('/drivers/:user', authenticateToken, async (req, res) => {
        try {
            const userId = req.params.user; // UUID-based user ID
    
            const [driver] = await pool.execute(
                `SELECT u.id, u.name, u.email, u.phone, 
                        d.license_number, d.license_expiry
                 FROM users u
                 JOIN drivers d ON u.id = d.user_id
                 WHERE u.id = ?`, 
                [userId]
            );
    
            if (driver.length === 0) return res.status(404).json({ error: 'Driver not found' });
    
            res.json(driver[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    
    /**
     * @swagger
     * /users/drivers:
     *   get:
     *     summary: Get all registered drivers
     *     tags: [Drivers]
     *     responses:
     *       200:
     *         description: List of drivers retrieved successfully
     *       500:
     *         description: Internal server error
     */
    router.get('/drivers', authenticateToken, authorize(['admin']), async (req, res) => {
        try {
            const [drivers] = await pool.execute(
                `SELECT u.id, u.name, u.email, u.phone, 
                        d.license_number, d.license_expiry
                 FROM users u
                 JOIN drivers d ON u.id = d.user_id`
            );
    
            res.json(drivers);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    
    /**
   * @swagger
   * /users/drivers/{user}/rides:
   *   get:
   *     summary: Get ride history for a driver (with pagination)
   *     tags: [Drivers]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: user
   *         required: true
   *         schema:
   *           type: string
   *         description: Driver UUID
   *       - in: query
   *         name: page
   *         schema:
   *           type: string
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: string
   *           default: 10
   *         description: Number of rides per page
   *     responses:
   *       200:
   *         description: Ride history retrieved successfully
   *       404:
   *         description: No rides found for this driver
   *       500:
   *         description: Internal server error
   */
  router.get('/drivers/:user/rides', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const [rides] = await pool.execute(
          `SELECT r.id, r.origin, r.destination, r.date, 
                  r.time, r.seats_available
          FROM rides r
          WHERE r.user_id = ?
          ORDER BY r.date DESC
          LIMIT ? OFFSET ?`,
          [userId, limit, offset]
        );

        const [totalCount] = await pool.execute(
          `SELECT COUNT(*) as total FROM rides WHERE user_id = ?`,
          [userId]
        );

        const totalPages = Math.ceil(totalCount[0].total / limit);

        if (rides.length === 0) return res.status(404).json({ error: 'No rides found for this driver' });

        res.json({ page, totalPages, totalRides: totalCount[0].total, rides });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
  });

  /**
  * @swagger
  * /users/rides/{rideId}/rate:
  *   post:
  *     summary: Rate a driver after a ride
  *     tags: [Rides]
  *     security:
  *       - bearerAuth: []
  *     parameters:
  *       - in: path
  *         name: rideId
  *         required: true
  *         schema:
  *           type: string
  *         description: Ride UUID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               rating:
  *                 type: integer
  *                 minimum: 1
  *                 maximum: 5
  *               review:
  *                 type: string
  *     responses:
  *       201:
  *         description: Driver rated successfully
  *       400:
  *         description: Invalid request data
  *       404:
  *         description: Ride not found
  *       500:
  *         description: Internal server error
  */
  router.post('/rides/:rideId/rate', authenticateToken, async (req, res) => {
    try {
        const rideId = req.params.rideId;
        const { rating, review } = req.body;
        const passengerId = req.user.id; // Get passenger ID from JWT

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5." });
        }

        // Check if the ride exists and the user was a passenger in it
        const [ride] = await pool.execute(
            `SELECT driver_id FROM rides WHERE id = ? AND passenger_id = ?`,
            [rideId, passengerId]
        );

        if (ride.length === 0) return res.status(404).json({ error: "Ride not found or user not a passenger." });

        const driverId = ride[0].driver_id;

        // Insert rating into the database
        await pool.execute(
            `INSERT INTO driver_ratings (id, driver_id, passenger_id, ride_id, rating, review) 
            VALUES (UUID(), ?, ?, ?, ?, ?)`,
            [driverId, passengerId, rideId, rating, review]
        );

        res.status(201).json({ message: "Driver rated successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
  });


  return router;
};
