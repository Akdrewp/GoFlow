# /app Directory Overview

This directory contains all user-facing pages and UI components for the GoFlow application, built using the Next.js App Router.

## Core Architecture

This directory follows a separation of concerns by splitting components into two main categories:

### Server Components
These files are named the routes name uppercase ex /assign is Assign.tsx These are reponsible for fetching data to be passed to the client components

### Client Components (e.g., DashboardView.tsx, Login.tsx)
These files are marked with "use client" and are responsible for rendering the UI in the user's browser. Any communication is done through the rest API.

### Data Flow

Any access to the database is handled through API Routes (defined in the /src/app/api directory). Server components in this /app folder call these API routes to securely fetch or modify data. This ensures that all business logic and database access are centralized and secured on the backend.

### Route Groups

* **(authPages)**: This is a route group. All routes defined within this folder (like /dashboard, /settings, etc.) are for users who are signed in to an account enforced by middleware and layout

* **Root Routes**: Pages like /login and /signup are defined at the root, making them accessible to users not yet logged in
