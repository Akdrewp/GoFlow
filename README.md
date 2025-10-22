<p align="center">
<img src="./public/goflow-logo.svg" alt="GoFlow Logo" width="120">
</p>

<h1 align="center">GoFlow - Field Calibration Monitoring</h1>

<p align="center">
<strong>
<a href="https://goflow--goflow-routemaker.us-east4.hosted.app/">View Live Application</a>
</strong>
</p>

About The Project

GoFlow is a streamlined web application designed for teams that require precise field calibration monitoring. It provides an intuitive platform for employees to submit detailed calibration reports from any location, allowing managers to review and ensure compliance and accuracy in real-time.

Built with a modern tech stack, GoFlow simplifies the workflow for both field operators and administrative staff, ensuring that critical calibration data is always accessible and well-organized.

Key Features

User & Organization Management: Secure sign-up and authentication with organization-based roles (Managers, Employees).

Field Reporting: Employees can create and submit calibration reports for different products and equipment.

Assignment System: Assign employees to specific trucks and loadouts for clear job tracking.

Real-time Dashboard: Users see their current assignment and recent reports upon login.

Manager Oversight: Managers have a dedicated view to monitor all active assignments and review team-wide reports for compliance.

Tech Stack

Framework: Next.js (with App Router)

Backend & Database: Firebase (Authentication, Firestore)

Deployment: Firebase App Hosting (with an integrated Cloud Run backend for server-side logic)

Styling: Tailwind CSS

Getting Started

To get a local copy up and running, follow these simple steps.

Prerequisites

Node.js (v18 or later)

npm

Installation

Clone the repo

git clone [https://github.com/your_username/goflow-routemaker.git](https://github.com/your_username/goflow-routemaker.git)


Install NPM packages

npm install


Set up your local environment variables in a .env.local file. You will need your Firebase client SDK config and your Admin SDK service account key.

# Firebase Client Config
NEXT_PUBLIC_FIREBASE_API_KEY="..."
# ... and other client variables

# Firebase Admin SDK Service Account JSON
FIREBASE_ADMIN_SDK_CONFIG='{...}'


Run the development server

npm run dev
