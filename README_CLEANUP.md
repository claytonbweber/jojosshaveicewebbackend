# Firebase Data Cleanup Instructions

This guide explains how to use the `cleanup_firebase.js` script to remove redundant data from your Firebase Firestore database.

## Prerequisites

1. Node.js installed on your machine
2. Firebase Admin SDK credentials

## Setup

1. **Install dependencies**:
   ```
   npm install firebase-admin
   ```

2. **Create Firebase Admin credentials**:
   - Go to the [Firebase Console](https://console.firebase.google.com/)
   - Navigate to your project
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Save the JSON file as `firebase-admin-key.json` in the same directory as the cleanup script

## Running the Cleanup Script

1. Open your terminal
2. Navigate to the directory containing the script
3. Run the script:
   ```
   node cleanup_firebase.js
   ```

## What this script does

The cleanup script performs the following tasks:

1. Removes redundant fields from `asana_config.settings`:
   - `workspaces` (redundant with `asana_workspaces` collection)
   - `sync_projects` (redundant with `asana_projects` collection)
   - `last_sync_projects` (redundant field)

## After Running

After running the script, you should see confirmation messages for each cleanup action taken. The redundant data should now be removed from your Firestore database.

## Manual Cleanup in Firebase Console

If you prefer to manually clean up the data:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Navigate to your project
3. Click on "Firestore Database" in the left menu
4. Find the `asana_config` collection
5. Open the `settings` document
6. Delete the fields:
   - `workspaces`
   - `sync_projects`
   - `last_sync_projects` 