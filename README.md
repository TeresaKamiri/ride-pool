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
3. Create a `.env` file with the following content:
   ```sh
   DB_HOST=your_database_host
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_NAME=your_database_name
   JWT_SECRET=your_jwt_secret
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
## API Endpoints

### Authentication
- `POST /login` - User login
- `POST /register` - User registration

### User Profile
- `GET /profile/:user` - View user profile
- `PUT /profile/:user` - Update user profile

### Ride & Booking
- `POST /offerride/:user` - Offer a ride
- `POST /search` - Search for available rides
- `GET /book-history/:user` - View user booking history
- `GET /all-routes` - View all available routes

### Vehicle Management
- `POST /add-vehicle/:user` - Add a new vehicle
- `GET /manage-vehicle/:user` - View user's vehicles
- `GET /all-vehicles` - View all vehicles
- `DELETE /delete-vehicle/:vehicle` - Delete a vehicle
- `GET /update-vehicle/:vehicle` - View/update vehicle details

## API Documentation
Swagger UI is available at:
```
http://localhost:3000/api-docs
```

## License
This project is open-source and available under the [MIT License](LICENSE).
