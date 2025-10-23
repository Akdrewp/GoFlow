# /src Directory Overview

This directory contains the core source code for the GoFlow application, structured to follow Next.js 14 App Router conventions.

## Directory Structure

### /api

This directory holds the application's core "backend" business logic. It is responsible for defining data structures and interacting with the database.

* Services: Contains logic for communicating with the Database file using Firebase Admin SDK.

* Types & Interfaces: Defines the TypeScript data structures used across the entire application.

### /app

This directory contains all user-facing pages, components, client-side data fetching logic, and the REST api routes

* Page Routes: Each folder represents a URL route (e.g., /app/dashboard/page.tsx).

* Data Fetching: Server components within this directory handle fetching data from the /api services before rendering the page.

* UI Components: Holds the React components that make up the user interface.

* REST API: The rest api routes the client uses to interact with the database 

#### middleware.ts

This file intercepts incoming requests to the application. It is primarily used for:

Naive route protection
