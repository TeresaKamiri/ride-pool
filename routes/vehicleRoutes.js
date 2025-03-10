const express = require('express');
const router = express.Router();

module.exports = (pool, authenticateToken) => {

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
   * /vehicles/add-vehicle:
   *   post:
   *     summary: Add a new vehicle
   *     tags: [Vehicles]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - make
   *               - model
   *               - plate
   *               - capacity
   *             properties:
   *               make:
   *                 type: string
   *                 example: "Toyota"
   *               model:
   *                 type: string
   *                 example: "Prius"
   *               plate:
   *                 type: string
   *                 example: "ABC-1234"
   *               capacity:
   *                 type: integer
   *                 example: 4
   *     responses:
   *       201:
   *         description: ✅ Vehicle added successfully
   *       400:
   *         description: Missing required fields
   *       500:
   *         description: Internal server error
   */
  router.post('/add-vehicle', authenticateToken, authorize(['driver', 'admin']), async (req, res) => {
    const { make, model, plate, capacity } = req.body;
    if (!make || !model || !plate || !capacity) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    try {
        await pool.execute(
            'INSERT INTO vehicles (user_id, make, model, plate, capacity) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, make, model, plate, capacity]
        );
        res.status(201).json({ message: '✅ Vehicle added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
  });

  /**
   * @swagger
   * /vehicles/manage-vehicle:
   *   get:
   *     summary: Get all vehicles for the authenticated user
   *     tags: [Vehicles]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of vehicles owned by the user
   *       500:
   *         description: Internal server error
   */
  router.get('/manage-vehicle', authenticateToken, authorize(['driver', 'admin']), async (req, res) => {
    try {
      const [results] = await pool.execute(
        'SELECT * FROM vehicles WHERE user_id = ?',
        [req.user.id]
      );
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * @swagger
   * /vehicles/all-vehicles:
   *   get:
   *     summary: Get all registered vehicles
   *     tags: [Vehicles]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of all vehicles
   *       500:
   *         description: Internal server error
   */
  router.get('/all-vehicles', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
      const [results] = await pool.execute('SELECT * FROM vehicles');
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * @swagger
   * /vehicles/delete-vehicle/{vehicle_id}:
   *   delete:
   *     summary: Delete a vehicle
   *     tags: [Vehicles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: vehicle_id
   *         schema:
   *           type: string
   *         required: true
   *         description: UUID of the vehicle to delete
   *     responses:
   *       200:
   *         description: ✅ Vehicle deleted successfully
   *       403:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  router.delete('/delete-vehicle/:vehicle_id', authenticateToken, authorize(['driver', 'admin']), async (req, res) => {
    const { vehicle_id } = req.params;
    
    try {
      // Verify the user owns the vehicle (or is admin)
      const [vehicle] = await pool.execute(
        'SELECT id FROM vehicles WHERE id = ? AND (user_id = ? OR ? = "admin")',
        [vehicle_id, req.user.id, req.user.role]
      );

      if (vehicle.length === 0) {
        return res.status(403).json({ error: 'Unauthorized to delete this vehicle' });
      }

      await pool.execute('DELETE FROM vehicles WHERE id = ?', [vehicle_id]);
      res.json({ message: '✅ Vehicle deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * @swagger
   * /vehicles/update-vehicle/{vehicle_id}:
   *   put:
   *     summary: Update vehicle details
   *     tags: [Vehicles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: vehicle_id
   *         required: true
   *         schema:
   *           type: string
   *         description: UUID of the vehicle
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               make:
   *                 type: string
   *                 example: "Toyota"
   *               model:
   *                 type: string
   *                 example: "Prius"
   *               plate:
   *                 type: string
   *                 example: "ABC-1234"
   *               capacity:
   *                 type: integer
   *                 example: 4
   *     responses:
   *       200:
   *         description: Vehicle updated successfully
   *       403:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  router.put('/update-vehicle/:vehicle_id', authenticateToken, authorize(['driver', 'admin']), async (req, res) => {
    const { vehicle_id } = req.params;
    const { model, plate, capacity } = req.body;

    if (!model || !plate || !capacity) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    try {
      // Verify user owns the vehicle (or is admin)
      const [vehicle] = await pool.execute(
        'SELECT id FROM vehicles WHERE id = ? AND (user_id = ? OR ? = "admin")',
        [vehicle_id, req.user.id, req.user.role]
      );

      if (vehicle.length === 0) {
        return res.status(403).json({ error: 'Unauthorized to update this vehicle' });
      }

      await pool.execute(
        'UPDATE vehicles SET model = ?, plate = ?, capacity = ? WHERE id = ?',
        [model, plate, capacity, vehicle_id]
      );
      res.json({ message: '✅ Vehicle updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
