#!/bin/bash

# JoJo's Shave Ice - Asana Task Monitor
# Deployment Script

echo "=== JoJo's Shave Ice - Asana Task Monitor Deployment ==="
echo "Deploying to Firebase..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Login to Firebase if needed
firebase login

# Deploy all resources
echo "Deploying all resources (Hosting, Functions, Firestore rules & indexes)..."
firebase deploy

echo "Deployment complete!"
echo "Visit your Firebase hosting URL to access the application." 