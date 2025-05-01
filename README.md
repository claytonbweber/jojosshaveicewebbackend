# JoJo's Shave Ice - Management Portal

Web-based management portal for JoJo's Shave Ice locations.

## Deployment Status

[![Deploy to Firebase Hosting on merge](https://github.com/claytonbweber/jojosshaveicewebbackend/actions/workflows/firebase-hosting-merge.yml/badge.svg)](https://github.com/claytonbweber/jojosshaveicewebbackend/actions/workflows/firebase-hosting-merge.yml)

## Current Objectives

1. **Login System Enhancement**:
   - Improved passcode login functionality
   - Enhanced authentication persistence
   - Better error handling and user feedback
   - Fixed role-based redirects

2. **Task Management System**:
   - Development of Base Tasks for all locations
   - Location-specific task customization
   - Task override capabilities
   - Offline task management and synchronization

3. **Multi-Location Support**:
   - Centralized management of all locations (Waimea, CMP, Hanalei)
   - Location-specific settings and configurations
   - Role-based access control for location data

4. **Employee Management**:
   - Role-based permissions (Admin, Manager, Staff)
   - Employee assignment to locations
   - Secure authentication methods

5. **Offline Functionality**:
   - Data caching for offline access
   - Operation queuing when offline
   - Automatic synchronization when online

## Features

- Multi-location management
- Role-based access control (Admin, Manager, Staff)
- Email and passcode authentication
- Real-time updates with Firebase

## Setup

1. Clone the repository:
```bash
git clone https://github.com/claytonbweber/jojosshaveicewebbackend.git
```

2. Set up Firebase configuration:
   - Copy `src/config/firebase.config.template.js` to `src/config/firebase.config.js`
   - Replace the placeholder values with your Firebase configuration
   - This file is gitignored to protect sensitive information

3. Install dependencies:
```bash
npm install
```

4. Run locally:
```bash
firebase serve
```

## Deployment

The application automatically deploys to Firebase Hosting when changes are pushed to the main branch.

Manual deployment can still be done with:
```bash
firebase deploy
```

## Environment

- Firebase v10.8.0
- Node.js v18+

## Security Notes

- Firebase configuration values are kept in a separate config file
- The config file is excluded from version control
- Use environment variables in production
- Never commit API keys or sensitive information directly in code 