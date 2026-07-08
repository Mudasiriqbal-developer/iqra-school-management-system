# Iqra School Management System (IHASS) — Developer's Guide

Welcome to the **Iqra Hadiqa Tul Atfal School (IHASS)** management system! This document is designed to help you quickly understand the current state of the application, review the features your friend built, and identify exactly where to start continuing development.

---

## 1. Project Architecture Overview

The application is structured as a standard modern MERN-stack project split into two primary components:
1. **`/backend`**: Node.js + Express REST API with MongoDB (Mongoose schemas), token authentication, and email dispatch services.
2. **`/frontend`**: React SPA built with Vite, Tailwind CSS v3, and Lucide React icons.

```
iqra-school-management-system/
├── backend/
│   ├── config/              # DB connection config
│   ├── controllers/         # Request handling & database logic
│   ├── middleware/          # Auth, error, and validation middlewares
│   ├── models/              # Mongoose data models
│   ├── routes/              # Express API endpoint declarations
│   ├── utils/               # Nodemailer email configuration & tokens
│   ├── server.js            # Main Express application entrypoint
│   └── check_db.js          # Helper script to audit database records
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable UI parts (Layout, Sidebar, Navbar, etc.)
│   │   ├── context/         # AuthContext state manager & Axios interceptors
│   │   ├── features/        # Feature-specific services and sub-modals
│   │   ├── pages/           # Pages rendering the dashboard screens
│   │   ├── services/        # Axios API wrapper (api.js)
│   │   ├── App.jsx          # Route mapping & portal access boundaries
│   │   └── main.jsx         # App mounting entrypoint
│   └── tailwind.config.js   # Tailored theme colors (navy & status palettes)
└── README.md                # Standard installation instructions
```

---

## 2. Features Already Built & Operational

Your friend did an amazing job establishing a clean, modular foundation for all the primary workflows:

### A. Authentication & Account Activation Flow
- **Multi-Role Support**: Supports four user roles: `admin`, `teacher`, `student`, and `parent`.
- **Teacher Activation**: Admins invite teachers by creating their profiles in the dashboard. The system generates a cryptographically secure token (`activationTokenHash`) and fires an email via Nodemailer. The teacher clicks the invitation link, goes to the `/activate/:token` route, and sets their password, which updates their status to active.
- **Session Interceptors**: The Axios instance automatically attaches a JWT token from `localStorage` to the headers. If a `401 Unauthorized` response is intercepted, it invalidates the session and redirects to the login screen.

### B. Student Profiles & Nested Fee Structure
- **Profiles**: Comprehensive student data including registration number, date of birth, contact information, class, and section mapping.
- **Nested Fee Tracking**: Unlike other models, fees are tracked directly within the `Student` schema under `feeInfo` to simplify lookup operations. It handles:
  - `amountDue` & `amountPaid`
  - `status` (`paid`, `pending`, `overdue`)
  - `history` array containing payment dates, amounts, and transaction methods.
- **Collection API**: Endpoints exist for recording payments (`POST /api/students/:id/fee-payment`) and defining fee bills (`PATCH /api/students/:id/fee-structure`).

### C. Academic Structure Mappings
- **Hierarchical Layout**: Models for `Class` (e.g., Grade 1), `Section` (linked to a `classTeacherId`), and `Subject`.
- **Assigned Faculty**: An `Assignment` model binds teachers to the class, section, and subject they teach, establishing clear ownership boundaries.

### D. Attendance Management
- **Student Attendance Logs**: The `Attendance` model logs a date and an array of student records with statuses (`present`, `absent`, `leave`, `late`).
- **Role Restrictions**: Teachers mark/edit attendance for their designated class section. Admins can search and audit attendance records school-wide.

### E. Financial Bookkeeping
- **Expenses**: Tracks general expenditures (utilities, rent, maintenance, stationery, assets) with filters and aggregate totals.
- **Faculty Payroll**: Tracks monthly salary payouts (`baseSalary`, `allowances`, `deductions`, `netSalary`) with constraints that prevent double payouts to the same teacher in a single month.

### F. Reports & Dashboard Metrics
- **Data aggregation**: The `/api/dashboard/summary` endpoint computes school statistics, Profit & Loss summaries, outstanding fees, and today's attendance percentages.
- **Visual Analytics**: The Reports view (`AdminReports.jsx`) renders interactive charts (using Recharts) of fee collection trends and lists fee defaulters.

---

## 3. What is Missing or Required? (Your Roadmap to Continue)

Here is a list of features that are either not yet connected to the backend database or completely unbuilt. You can pick any of these to start coding:

### Option 1: Dynamic Student & Parent Portal (Highest Priority)
* **Current State**: The `StudentDashboard.jsx` page is a frontend mockup filled with static arrays and names (e.g., "Zainab Fatima", "GPA 3.82"). The routes `/student/schedule`, `/student/grades`, and `/student/fees` do not exist in the routing table.
* **What to do**:
  1. Add new backend endpoints to fetch logged-in student profiles based on their User account email/ID.
  2. Implement backend routes for a student to view their own attendance rate, assigned subjects, and fee history.
  3. Register the missing pages `/student/fees`, `/student/schedule`, and `/student/grades` in `frontend/src/App.jsx`.
  4. Replace the static arrays in `StudentDashboard.jsx` with calls to `/api/students/me` or `/api/students/profile`.

### Option 2: Student Gradebook / Marksheet Management
* **Current State**: While the student dashboard references "GPA" and "Assessments", there are **no** backend models, controllers, or routes for exam results or academic grading.
* **What to do**:
  1. Create a `Grade` or `ExamResult` Mongoose model containing fields like `studentId`, `subjectId`, `examType` (midterm, final, monthly quiz), `marksObtained`, `totalMarks`, and `comments`.
  2. Write a `gradeController.js` and map its routes in `server.js` (e.g., `POST /api/grades` for teachers to upload grades, `GET /api/grades/student/:studentId` for viewing).
  3. Create an academic performance panel on the Admin and Teacher portals to record marks, and display them on the Student dashboard.

### Option 3: Syllabus and Class Resource Uploads
* **Current State**: There is no feature allowing teachers to upload course outlines, study materials, or weekly syllabus items.
* **What to do**:
  1. Create a `Resource` model referencing `classId`, `subjectId`, `title`, `description`, and a `fileUrl` (or web link).
  2. Build a frontend feature in the Teacher portal to add resources.
  3. Add a "Resources" tab in the Student portal where students can download PDFs or open links uploaded by their teachers.

### Option 4: Student Leave Requests (from Parents/Students)
* **Current State**: `LeaveRequest` currently only supports teachers requesting time off from the school Admin. Student leaves must be handled manually or marked directly in attendance.
* **What to do**:
  1. Extend the `LeaveRequest` schema or create a `StudentLeave` model to record student IDs, leave dates, reasons, and approval status.
  2. Connect the portal so parents/students can apply for leave.
  3. Allow class teachers to approve/reject student leaves, which can automatically mark their status in attendance logs.

---

## 4. How to Start the App Locally

To start working, run the backend and frontend in separate terminal windows:

### Setup Backend:
1. Navigate to `/backend`.
2. Check your `.env` configuration. You need a running MongoDB database. Ensure you configure:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/iqra_school_management
   JWT_SECRET=your_secret_jwt_key
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_APP_PASSWORD=your_app_specific_password
   ```
3. Run `npm install` and then `npm run dev` to boot the hot-reloading server.

### Setup Frontend:
1. Navigate to `/frontend`.
2. Check your `.env` configuration:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
3. Run `npm install` and then `npm run dev` to start the local Vite development server. Open `http://localhost:5173`.

### Auditing Database:
- Run `node backend/get_users.js` inside the `/backend` folder to print out all registered users, their roles, and automatically pre-generate valid JWT tokens that you can insert into your API requests (e.g., in Postman) for debugging.
- Run `node backend/check_db.js` to see a quick report of existing classes, sections, and assignments.

---

*Tip: To start coding right away, we suggest opening [App.jsx](file:///e:/projects/iqra-school-management-system/frontend/src/App.jsx) and tracing the student portal routes, then implementing Option 1!*
