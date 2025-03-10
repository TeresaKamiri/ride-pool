const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid'); 

module.exports = (pool, authenticateToken) => {
    
    /**
     * @swagger
     * /agreements/accept/{user}:
     *   post:
     *     summary: Accept an agreement
     *     tags: [Agreements]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: user
     *         required: true
     *         schema:
     *           type: string
     *         description: User ID (Passenger or Driver)
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               agreement_id:
     *                 type: string
     *     responses:
     *       200:
     *         description: Agreement accepted
     *       400:
     *         description: Invalid request
     *       500:
     *         description: Internal server error
     */
    router.post('/agreements/accept/:user', authenticateToken, async (req, res) => {
        const { agreement_id } = req.body;
        const user_id = req.user.id;
        
        try {
            const [agreement] = await pool.execute('SELECT * FROM agreements WHERE id = ? AND (passenger_id = ? OR driver_id = ?)', [agreement_id, user_id, user_id]);
            if (agreement.length === 0) {
                return res.status(403).json({ error: 'Unauthorized to accept this agreement' });
            }

            await pool.execute('UPDATE agreements SET status = "accepted" WHERE id = ?', [agreement_id]);
            res.json({ message: 'Agreement accepted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /agreements/{user}:
     *   get:
     *     summary: Fetch user agreements
     *     tags: [Agreements]
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
     *         description: Agreements fetched successfully
     *       500:
     *         description: Internal server error
     */
    router.get('/agreement/:user', authenticateToken, async (req, res) => {
        try {
            const [agreements] = await pool.execute('SELECT * FROM agreements WHERE passenger_id = ? OR driver_id = ?', [req.params.user, req.params.user]);
            res.json(agreements);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /ride-req/{user}:
     *   get:
     *     summary: Fetch ride requests for a user
     *     tags: [Ride Requests]
     */
    router.get('/ride-req/:user', authenticateToken, async (req, res) => {
        try {
            const [requests] = await pool.execute('SELECT * FROM ride_requests WHERE driver_id = ?', [req.params.user]);
            res.json(requests);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /ride-req/{user}/{vehicle}:
     *   post:
     *     summary: Send a ride request
     *     tags: [Ride Requests]
     */
    router.post('/ride-req/:vehicle', authenticateToken, async (req, res) => {
        const { ride_id, driver_id } = req.body;
        const passenger_id = req.user.id;
    
        if (!ride_id || !driver_id) {
            return res.status(400).json({ error: 'Ride ID and Driver ID are required' });
        }
    
        try {
            await pool.execute(
                'INSERT INTO ride_requests (ride_id, passenger_id, driver_id, vehicle_id) VALUES (?, ?, ?, ?)',
                [ride_id, passenger_id, driver_id, req.params.vehicle]
            );
    
            res.status(201).json({ message: 'Ride request sent successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });     

    /**
     * @swagger
     * /accepted:
     *   post:
     *     summary: Accept a ride request
     *     tags: [Ride Requests]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - request_id
     *             properties:
     *               request_id:
     *                 type: string
     *                 format: uuid
     *                 description: UUID of the ride request
     *     responses:
     *       200:
     *         description: Ride request accepted
     *       403:
     *         description: Unauthorized action
     *       500:
     *         description: Internal server error
     */
    router.post('/accepted', authenticateToken, async (req, res) => {
        const { request_id } = req.body;
        const driver_id = req.user.id;

        try {
            const [existingRequest] = await pool.execute('SELECT id FROM ride_requests WHERE id = ? AND driver_id = ?', [request_id, driver_id]);
            if (existingRequest.length === 0) {
                return res.status(403).json({ error: 'Unauthorized action' });
            }

            await pool.execute('UPDATE ride_requests SET status = "accepted" WHERE id = ?', [request_id]);
            res.json({ message: 'Ride request accepted' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /rejected:
     *   post:
     *     summary: Reject a ride request
     *     tags: [Ride Requests]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - request_id
     *             properties:
     *               request_id:
     *                 type: string
     *                 format: uuid
     *                 description: UUID of the ride request
     *     responses:
     *       200:
     *         description: Ride request rejected
     *       403:
     *         description: Unauthorized action
     *       500:
     *         description: Internal server error
     */
    router.post('/rejected', authenticateToken, async (req, res) => {
        const { request_id } = req.body;
        const driver_id = req.user.id;

        try {
            const [existingRequest] = await pool.execute('SELECT id FROM ride_requests WHERE id = ? AND driver_id = ?', [request_id, driver_id]);
            if (existingRequest.length === 0) {
                return res.status(403).json({ error: 'Unauthorized action' });
            }

            await pool.execute('UPDATE ride_requests SET status = "rejected" WHERE id = ?', [request_id]);
            res.json({ message: 'Ride request rejected' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
