# JoJo's Shave Ice - Management Portal

Web-based management portal for JoJo's Shave Ice locations.

## Deployment Status

[![Deploy to Firebase Hosting on merge](https://github.com/claytonbweber/jojosshaveicewebbackend/actions/workflows/firebase-hosting-merge.yml/badge.svg)](https://github.com/claytonbweber/jojosshaveicewebbackend/actions/workflows/firebase-hosting-merge.yml)

## Features

- Multi-location management
- Role-based access control (Admin, Manager, Staff)
- Email and passcode authentication
- Real-time updates with Firebase

## Development

1. Clone the repository:
```bash
git clone https://github.com/claytonbweber/jojosshaveicewebbackend.git
```
2. Install dependencies: `npm install`
3. Run locally: `firebase serve`

## Deployment

The application automatically deploys to Firebase Hosting when changes are pushed to the main branch.

Manual deployment can still be done with:
```bash
firebase deploy
```

## Environment

- Firebase v10.8.0
- Node.js v18+ 