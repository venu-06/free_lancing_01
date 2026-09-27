# BuildLedger — Construction Payment Management

A React and Express application for tracking construction projects, work categories, vendors, installment payments, and outstanding balances.

## Requirements

- Node.js 18+
- MongoDB Community Server or a MongoDB Atlas connection string

## Run locally

```bash
npm install
Copy-Item .env.example .env
# Edit .env and set MONGODB_URI to your MongoDB connection string.
npm run dev
```

The React app is served at `http://localhost:5173`; the API listens at `http://localhost:5000`.

## Features

- Project setup and status tracking
- Work categories with vendor contact and agreed contract amount
- Dated installment payments with method, reference, and notes
- Automatic paid totals and remaining balance calculations
- Payment history and downloadable CSV report
- Outstanding payment report API
- Responsive dashboard with cash flow and project progress views

The dashboard starts with sample construction data for an immediate preview. The API persists user-created records in MongoDB. Payment amounts must be positive; the API allows recording overpayments, and the balance formula can therefore become negative if a contract is overpaid.

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Service health |
| GET, POST | `/api/projects` | List and create projects |
| PATCH, DELETE | `/api/projects/:projectId` | Update or remove a project |
| POST | `/api/projects/:projectId/categories` | Add a work category |
| PATCH, DELETE | `/api/projects/:projectId/categories/:categoryId` | Update or remove a category |
| POST | `/api/projects/:projectId/categories/:categoryId/payments` | Record an installment |
| DELETE | `/api/projects/:projectId/categories/:categoryId/payments/:paymentId` | Remove a payment |
| GET | `/api/reports/outstanding` | List unpaid balances |
