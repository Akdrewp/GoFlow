// jest.setup.ts
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
// This ensures they are available to your tests, especially for Admin SDK initialization.
// The path.resolve ensures the correct absolute path to your .env.local file.
// process.cwd() gets the current working directory, which should be your project root.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Important: Also ensure the Firebase Emulator hosts are loaded for the Admin SDK
// If you have these in .env.local, dotenv will load them.
// If you explicitly set them in package.json, that's fine too.
// If you want to rely purely on .env.local for emulators during testing:
// Make sure these lines are in your .env.local:
// FIRESTORE_EMULATOR_HOST="localhost:8080"
// FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"