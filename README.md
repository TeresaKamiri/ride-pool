# Ride-Pool Backend 

## Overview
This is a Node.js backend for a ride-pooling application, replacing a previous Laravel-based system. It provides APIs for user management, ride booking, vehicle management, and authentication.

## Features
- **User Profile Management**: View and update user profiles.
- **Ride & Booking System**: Offer rides, search for rides, book rides, and view booking history.
- **Vehicle Management**: Add, update, manage, and delete vehicles.
- **Authentication**: Token-based authentication using JWT.
- **Security Enhancements**: Rate limiting, input validation, and secure password hashing. // add user access control ... 
- **Logging**: Server logs using Winston.
- **API Documentation**: Integrated Swagger UI documentation.

## Tech Stack
- **Node.js**
- **Express.js**
- **MySQL** (Database)
- **JWT** (Authentication)
- **Winston** (Logging)
- **dotenv** (Environment configuration)
- **Helmet** (Security middleware)
- **Express Rate Limit** (Rate limiting for enhanced security)
- **Swagger UI** (API documentation)

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/Smart-Ryuga-Org/ride-pool.git
   cd ride-pool
   ```
2. Install dependencies:
   ```sh
   npm install

   ```
3. Edit the `.env` file with the following content:
   ```sh
   DB_HOST=0.0.0.0   #your_database_host
   DB_NAME=ride_pool   #your_database_name
   DB_USER=root    #your_database_user
   DB_PASSWORD=   #your_database_password
   JWT_SECRET=a6b7b2661d83a172a8192dba55714578027a778642b558f5aaaafc67c649b5d6   #your_jwt_secret
   PORT=3000
   ```

   You can generate a secure JWT_SECRET using Node.js. Run the following command in your terminal:
      ```sh
      node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
      ```

4. Start the server:
   ```sh
   npm run start
   ```
   or
   ```sh
   node api.js
   ```
5. Access the api:
   local 
   ```
   http://localhost:3000
   ```

## API Documentation
Local Swagger UI is available at:
```
http://localhost:3000/api-docs
```
or
Hosted Swagger UI is available at:
```
https://rides.api.smartryuga.com/api-docs/
```

## API Endpoints

### Authentication
- `POST /users/login` - User login
- `POST /users/register` - User registration

### User Profile
- `GET /users/profile/{user}` - View user profile
- `PUT /users/profile/{user}` - Update user profile

### Ride & Booking
- `POST /rides/offerride/{user}` - Offer a ride
- `POST /rides/search` - Search for available rides
- `GET /bookings/history/{user}` - View user booking history
- `GET /rides/available` - View all available routes
- `POST /rides/cancel-ride` - Cancel a ride
- `POST /useras/rides/{rideId}/rate` - Rate a driver after a ride

### Agreements
- `POST /agreements/accept/{user}` - Accept an agreement
- `GET /agreements/{user}` - Fetch user agreements

### Ride Requests
- `GET /ride-req/{user}` - Fetch ride requests for a user
- `POST /ride-req/{user}/{vehicle}` - Send a ride request
- `POST /accepted` - Accept a ride request
- `POST /rejected` - Reject a ride request

### Carpool
- `GET /rides/my-pool/{user}` - Fetch the user's carpool

### Booking
- `POST /rides/book-ride` - Book a ride

### Drivers
- `POST /users/become-driver` - Register as a driver
- `GET /users/drivers/{user}` - Get driver details
- `GET /users/drivers` - Get all registered drivers
- `GET /users/drivers/{user}/rides` - Get ride history for a driver (with pagination)

### Vehicle Management
- `POST /vehicles/add-vehicle/{user}` - Add a new vehicle
- `GET /vehicles/manage-vehicle/{user}` - View user's vehicles
- `GET /vehicles/all-vehicles` - View all vehicles
- `DELETE /vehicles/delete-vehicle/{vehicle}` - Delete a vehicle
- `PUT /vehicles/update-vehicle/{vehicle}` - View/update vehicle details


The carpooling app follows a structured flow from user access to booking rides, handling ride requests, agreements, and overall ride management. Here’s a breakdown of how it works logically:

---

## **1. User Registration & Authentication**
### **Flow:**
- Users **register** with details like name, email, phone, and password.
- They **log in**, receive a JWT token, and can now access protected features.

### **Database (users table)**
| id  | name     | email          | phone       | password (hashed) | created_at |
|-----|---------|---------------|------------|------------------|------------|
| 1   | John Doe | john@example.com | +123456789 | [hashed_password] | 2024-03-05 |

---

## **2. Vehicle Management**
### **Flow:**
- Users **add** their vehicles.
- They **update** vehicle details.
- They **delete** vehicles if they no longer use them.

### **Database (vehicles table)**
| id  | user_id | make  | model   | year | seats | status  |
|-----|--------|-------|--------|------|-------|---------|
| 1   | 1      | Toyota | Corolla | 2020 | 4     | active |

---

## **3. Offering a Ride**
### **Flow:**
- A **driver offers a ride**, specifying:
  - Origin & destination
  - Date & time
  - Available seats
  - Cost per seat
- The ride is listed as **available**.

### **Database (rides table)**
| id  | driver_id | vehicle_id | origin | destination | date_time | seats_available | price |
|-----|-----------|-----------|--------|-------------|-----------|----------------|-------|
| 1   | 1         | 1         | Nairobi | Mombasa     | 2024-03-06 09:00 | 3 | $20 |

---

## **4. Searching for a Ride**
### **Flow:**
- A passenger **searches for rides** by filtering:
  - Destination
  - Date
  - Available seats
- They see a **list of available rides**.

### **Database Query Example**
```sql
SELECT * FROM rides WHERE destination = 'Mombasa' AND seats_available > 0;
```

---

## **5. Booking a Ride**
### **Flow:**
1. Passenger selects a ride.
2. They **request to book** a seat.
3. If accepted, payment can be processed.
4. Seats are updated.

### **Database (bookings table)**
| id  | ride_id | passenger_id | seats_booked | status  |
|-----|---------|-------------|-------------|---------|
| 1   | 1       | 2           | 1           | pending |

#### **Logic (Ride Confirmation)**
- When the driver accepts the request:
  ```sql
  UPDATE bookings SET status = 'confirmed' WHERE id = 1;
  ```
- Reduce seat count:
  ```sql
  UPDATE rides SET seats_available = seats_available - 1 WHERE id = 1;
  ```

---

## **6. Agreements & Ride Requests**
### **Flow:**
1. Passenger **requests** a ride.
2. Driver **accepts** or **rejects** the request.
3. If accepted:
   - An agreement is created.
   - Both parties must confirm.
4. If rejected:
   - The ride request is removed.

### **Database (agreements table)**
| id  | ride_id | passenger_id | driver_id | status |
|-----|---------|-------------|----------|--------|
| 1   | 1       | 2           | 1        | pending |

#### **Logic for Agreement Acceptance**
- When a driver accepts a ride request:
  ```sql
  UPDATE agreements SET status = 'accepted' WHERE id = 1;
  ```

---

## **7. Managing Ride Requests**
### **Flow:**
- **Drivers fetch ride requests** for their offered rides.
- They **accept or reject** based on availability.

### **Database (ride_requests table)**
| id  | ride_id | passenger_id | status   |
|-----|---------|-------------|---------|
| 1   | 1       | 2           | pending |

#### **Logic for Accepting a Request**
```sql
UPDATE ride_requests SET status = 'accepted' WHERE id = 1;
```

#### **Logic for Rejecting a Request**
```sql
UPDATE ride_requests SET status = 'rejected' WHERE id = 1;
```

---

## **8. Fetching a User’s Carpool**
### **Flow:**
- A user sees all **active rides** they are involved in (as a driver or passenger).

### **Database Query**
```sql
SELECT * FROM rides WHERE driver_id = 1 OR id IN (SELECT ride_id FROM bookings WHERE passenger_id = 1);
```

---

## **9. Completing a Ride**
### **Flow:**
- Once the ride is completed, the driver **marks it as completed**.
- The system **archives the ride** and removes it from active rides.

### **Database Update**
```sql
UPDATE rides SET status = 'completed' WHERE id = 1;
```

---

## **Summary of Core Functionalities**
| Feature              | User Role | Action |
|----------------------|----------|--------|
| **Register/Login** | Passenger/Driver | Creates an account |
| **Add Vehicle** | Driver | Registers a vehicle |
| **Offer a Ride** | Driver | Lists a ride |
| **Search Ride** | Passenger | Finds available rides |
| **Book a Ride** | Passenger | Requests a seat |
| **Manage Requests** | Driver | Accepts/rejects passengers |
| **Agreement Handling** | Passenger/Driver | Confirms ride agreements |
| **Fetch Carpool** | Passenger/Driver | Shows active rides |
| **Complete Ride** | Driver | Marks ride as completed |

---


## License
This project is open-source and available under the [MIT License](LICENSE).
