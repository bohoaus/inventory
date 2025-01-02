# BOHO Inventory Management System

A comprehensive inventory management system built for BOHO Australia, featuring role-based access control, real-time inventory tracking, and order management capabilities.

## Table of Contents
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Authentication](#authentication)
- [Features](#features)
- [Technical Stack](#technical-stack)
- [Contributing](#contributing)
- [Contact](#contact)

## Overview

BOHO Inventory Management System is a web-based application that provides inventory tracking, order management, and role-based access control. The system supports three user roles (Admin, Viewer, and Guest) with different permission levels.

## System Architecture

### Frontend
- Static web pages hosted on GitHub Pages
- HTML/CSS/JavaScript implementation
- Responsive design for various devices

### Backend
- Supabase for database and authentication
- PostgreSQL database with real-time capabilities
- Secure API endpoints with row-level security

## Installation

1. Clone the repository:

bash
git clone https://github.com/bohoaus/inventory.git

2. Navigate to the project directory:

bash
cd inventory


3. Deploy to GitHub Pages:
- Configure GitHub Pages in repository settings
- Set source to main branch
- Access at https://bohoaus.github.io/inventory/

## Usage

### Access Levels

1. **Admin Role** (admin.html)
   - Full system access
   - Edit inventory items
   - Manage orders
   - Access all system features

2. **Viewer Role** (view.html)
   - Read-only access
   - View inventory items
   - Access order history
   - View system summary

3. **Guest Role** (guest.html)
   - Limited access
   - Basic inventory view
   - Access to sold-out items

### Key Pages
- `index.html` - Authentication portal
- `admin.html` - Admin dashboard
- `view.html` - Viewer dashboard
- `guest.html` - Guest access
- `order.html` - Order management
- `history.html` - Order history
- `summary.html` - System summary
- `soldout.html` - Sold out items

## Authentication

### Test Accounts
- Admin: a@a.com
- Viewer: v@v.com
- Guest: g@g.com

### Production Accounts
- Admin: admin@boho.aus
- Viewer: viewer@boho.aus
- Guest: guest@boho.aus

*Note: Contact system administrator for passwords*

## Features

- Real-time inventory tracking
- Order management system
- Role-based access control
- Order history tracking
- System summary and analytics
- Secure authentication
- Database backup and recovery
- Email verification system

## Technical Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Supabase
- **Database**: PostgreSQL
- **Hosting**: GitHub Pages
- **Version Control**: Git/GitHub
- **Authentication**: Supabase Auth

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/YourFeature`)
3. Commit changes (`git commit -m 'Add YourFeature'`)
4. Push to branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code structure
- Document new features
- Test thoroughly before submitting PR
- Update documentation as needed

## Contact

For any queries or support:
- Project Repository: https://github.com/bohoaus/inventory
- Organization: Boho Australia
- Email: bohoaus2012@gmail.com

---
*Note: This is an internal system. Please ensure proper authorization before accessing.*

