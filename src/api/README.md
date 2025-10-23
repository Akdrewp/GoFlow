# /api Directory Overview

This directory contains the core server-side business logic, data access, and security services for the GoFlow application. It acts as the backend that the Next.js routes directory communicates with.

## Core Services & Structure

### /database/database.ts

This file defines the data structures and schemas for the types

* **TypeScript Types & Interfaces**: Defines all primary data types.

* **Zod Schemas**: Contains all zod schemas used for runtime data validation, ensuring that all data entering or leaving the services is correct.

### /firebase/firebaseAdmin.ts

* **Admin SDK Initialization**: Initializes the Firebase Admin SDK used to communicate to the database

### /firebase/firebaseConfig.ts

* **Client Auth Initialization**: Contains the configuration for the client-side Firebase SDK, used primarily for client-side authentication.

### /firebase/firestoreDatabase.ts

* **Data Access Layer (DAL)**: This is the primary interface for all database interactions.

It uses the firebaseAdmin instance to communicate directly with the Firestore database.

### /firebase/firebaseVerify.ts

* **Security & Permissions Layer**: It is responsible for checking if a user has the necessary permissions to perform a given action. The only way data is written or read is through here

* **Role Lookup**: It verifies a user's role (e.g., "Manager" or "Employee") from the database.

### /firebase/firebaseService

Holds all the middle layer access to database resources for data fetching and api routes

* **Special Access Permissions**: Holds certain special cases where an employee can access data they might not usually have access to

* **Outward Facing Access**: All communication with the database is done through the service files after checking permissions

