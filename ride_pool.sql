-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS ride_pool;
USE ride_pool;

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(10) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    role ENUM('passenger', 'driver', 'admin') DEFAULT 'passenger',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Drivers Table (only for users who become drivers)
CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(10) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(10) UNIQUE NOT NULL,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    license_expiry DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Vehicles Table (only managed by drivers or admins)
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(10) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(10) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    plate VARCHAR(50) UNIQUE NOT NULL,
    capacity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES drivers(user_id) ON DELETE CASCADE
);

-- Create Rides Table (offered by drivers)
CREATE TABLE IF NOT EXISTS rides (
    id VARCHAR(10) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(10) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    seats_available INT NOT NULL,
    status ENUM('open', 'full', 'completed', 'canceled') DEFAULT 'open', 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES drivers(user_id) ON DELETE CASCADE
);

-- Create Bookings Table (passengers book rides)
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(10) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(10) NOT NULL,
    ride_id VARCHAR(10) NOT NULL,
    seats INT NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
);

-- Create Agreements Table (between passengers and drivers)
CREATE TABLE IF NOT EXISTS agreements (
    id VARCHAR(10) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(10) NOT NULL,
    ride_id VARCHAR(10) NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
);

-- Create Ride Requests Table (passengers request rides)
CREATE TABLE IF NOT EXISTS ride_requests (
    id VARCHAR(10) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(10) NOT NULL,
    ride_id VARCHAR(10) NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
);

-- Create Reviews Table (passengers review drivers)
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(10) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(10) NOT NULL,
    ride_id VARCHAR(10) NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
);
