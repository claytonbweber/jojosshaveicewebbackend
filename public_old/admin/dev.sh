#!/bin/bash

# JoJo's Shave Ice - Asana Task Monitor
# Development Server Script

echo "=== JoJo's Shave Ice - Asana Task Monitor Development Server ==="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Start Firebase emulators
echo "Starting Firebase emulators..."
firebase emulators:start

# Note: This will start Firebase hosting on port 5000 and other services on their default ports
# Access the web app at http://localhost:5000 