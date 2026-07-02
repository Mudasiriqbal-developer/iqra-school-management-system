# Iqra School Management System (CMS)

A modern, MERN-stack School Management System tailored for Iqra Haddiqatul Atfal Model School. This project is built using MongoDB, Express, React (Vite), and Node.js with Tailwind CSS v3 for responsive, premium design styling.

## Project Structure

- `/backend` - Node.js + Express REST API server with Mongoose integration
- `/frontend` - React + Vite + Tailwind CSS Single Page Application (SPA)

---

## Getting Started

Follow the steps below to set up and run the development environment.

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB running locally or a MongoDB Atlas URI

### 1. Database & Environment Configuration

Create a `.env` file inside the `backend` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

Create a `.env` file inside the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Running the Servers

To start the development servers, run the following commands in separate terminals:

### Start Backend Server

```bash
cd backend
npm run dev
```

The backend API will run at `http://localhost:5000` (Health Check: `/api/health`).

### Start Frontend Server

```bash
cd frontend
npm run dev
```

The frontend SPA will run at `http://localhost:5173` (default Vite port).
