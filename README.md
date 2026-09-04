# Iqra School Management System (CMS)

A full-stack, enterprise-ready School Management System built specifically for **Iqra Haddiqatul Atfal Model School**. This platform automates end-to-end academic, financial, administrative, and student lifecycle workflows with role-based access control (RBAC), PDF document generation, bulk Excel data operations, financial ledger management, occasional one-time fee billing, and dynamic customizable dashboards.

---

## 📑 Table of Contents

1. [System Architecture](#-system-architecture)
2. [Technology Stack: What, Where & Why](#-technology-stack-what-where--why)
   - [Backend Architecture & Dependencies](#backend-dependencies--rationale)
   - [Frontend Architecture & Dependencies](#frontend-dependencies--rationale)
3. [User Roles & Permissions Matrix](#-user-roles--permissions-matrix)
4. [Key Features & Modules](#-key-features--modules)
   - [1. Authentication & Security](#1-authentication--security)
   - [2. Student Information System (SIS) & Bulk Excel Import](#2-student-information-system-sis--bulk-excel-import)
   - [3. Family Accounts & Consolidated Vouchers](#3-family-accounts--consolidated-vouchers)
   - [4. Academics & Faculty Workload Management](#4-academics--faculty-workload-management)
   - [5. Fee Management, Student Ledgers & One-Time Charges](#5-fee-management-student-ledgers--one-time-charges)
   - [6. Financial Accounting: Expenses & Payroll](#6-financial-accounting-expenses--payroll)
   - [7. Daily Attendance & Analytics](#7-daily-attendance--analytics)
   - [8. Examination, Grading & Report Cards](#8-examination-grading--report-cards)
   - [9. Session Promotion Engine](#9-session-promotion-engine)
   - [10. Dynamic Drag-and-Drop Navigation](#10-dynamic-drag-and-drop-navigation)
   - [11. Automated PDF Generation](#11-automated-pdf-generation)
   - [12. Helpdesk & Support Tickets](#12-helpdesk--support-tickets)
   - [13. Dark Mode & High-Contrast Design System](#13-dark-mode--high-contrast-design-system)
   - [14. Collapsible Mini-Sidebar (Rail Navigation)](#14-collapsible-mini-sidebar-rail-navigation)
5. [Project Structure](#-project-structure)
6. [Database Models & Schema Design](#-database-models--schema-design)
7. [REST API Endpoints Guide](#-rest-api-endpoints-guide)
8. [Environment Configuration (.env)](#-environment-configuration-env)
9. [Installation & Quick Start](#-installation--quick-start)
10. [Database Seeding](#-database-seeding)
11. [Security & Architectural Best Practices](#-security--architectural-best-practices)

---

## 🏗 System Architecture

The Iqra School Management System is designed as a decoupled **Client-Server Architecture** operating over a secure RESTful API:

```
┌──────────────────────────────────────────────────────────────────┐
│                   React 19 Frontend (Vite)                       │
│  Tailwind CSS v3 │ React Router v7 │ Recharts │ @dnd-kit │ Axios │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ HTTP / JSON (Bearer JWT)
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Express.js / Node.js API                       │
│  Auth Middleware (RBAC) │ Validation Layer │ Centralized Error   │
│  PDFKit Generator       │ XLSX Processor   │ Nodemailer Engine   │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ Mongoose ODM
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                   MongoDB Database Engine                        │
│  Students │ Families │ Classes │ FeeRecords │ Payroll │ Users... │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Technology Stack: What, Where & Why

### Backend Dependencies & Rationale

| Technology / Package | Where It Is Used | Why We Used It (Technical Rationale) |
| :--- | :--- | :--- |
| **Node.js & Express.js** (`^4.19.2`) | Entire REST API server runtime (`server.js`, `/routes`, `/controllers`) | Provides a lightweight, high-performance, asynchronous event-driven environment ideal for I/O-intensive RESTful APIs and rapid schema-less data processing. |
| **MongoDB & Mongoose** (`^8.4.1`) | Database persistence layer & schema validation (`/models`, `config/db.js`) | Document database accommodates hierarchical school structures (e.g., student-parent relationships, fee breakdown arrays, historical attendance sub-documents) with schema enforcement and indexing. |
| **JSON Web Token (`jsonwebtoken`)** (`^9.0.2`) | Stateless session authentication (`middleware/authMiddleware.js`, `utils/tokenUtils.js`) | Enables secure, stateless authentication across Admin, Teacher, and Student portals without server-side session storage overhead. |
| **Bcrypt.js** (`^2.4.3`) | Password hashing in `User.js` pre-save hooks and `authController.js` | One-way cryptographic adaptive hashing with salt rounds ensures that sensitive user passwords are never stored in plain text. |
| **PDFKit** (`^0.19.1`) | PDF generator service (`services/studentPdfService.js`, `utils/pdfHelper.js`) | Programmatically renders custom, high-resolution student admission receipts, fee vouchers, and monthly invoices with school logos and custom styling. |
| **XLSX (SheetJS)** (`^0.18.5`) | Student import engine (`services/studentImportService.js`) | Parses and validates `.xlsx` / `.xls` spreadsheets uploaded by administrators, allowing bulk onboarding of hundreds of students in seconds. |
| **Multer** (`^2.2.0`) | Multipart form-data handling (`routes/studentRoutes.js`) | Safely handles in-memory buffer streaming for spreadsheet file uploads during bulk imports. |
| **Nodemailer** (`^9.0.3`) | Email delivery service (`utils/emailService.js`) | Dispatches automated account activation links, password recovery tokens, and transactional notifications via SMTP. |
| **Express-Validator & Zod** (`^7.1.0`, `^4.4.3`) | Incoming payload validation & sanitization (`middleware/validationMiddleware.js`) | Validates route params, queries, and request bodies before reaching controller logic, guarding against bad inputs and injection attacks. |
| **Morgan & Dotenv** (`^1.10.0`, `^16.4.5`) | HTTP logging and environment configuration | Provides clean request/response logging for debugging and isolates sensitive secrets (`JWT_SECRET`, `MONGO_URI`, SMTP keys). |

---

### Frontend Dependencies & Rationale

| Technology / Package | Where It Is Used | Why We Used It (Technical Rationale) |
| :--- | :--- | :--- |
| **React 19** (`^19.2.7`) | Core Single-Page Application (SPA) UI framework | Enables declarative, modular, and component-driven architecture with fast concurrent rendering and reactive state updates. |
| **Vite** (`^8.1.1`) | Next-generation frontend build tool & dev server | Provides near-instantaneous Hot Module Replacement (HMR) and optimized esbuild/rollup production bundles. |
| **Tailwind CSS v3** (`^3.4.3`) | Utility-first CSS styling across all pages and modals | Enables rapid, responsive, pixel-perfect UI design with dark mode styling, custom color palettes, and zero runtime CSS overhead. |
| **React Router v7** (`^7.18.1`) | Client-side routing and protected route wrappers (`App.jsx`, `ProtectedRoute.jsx`) | Declarative navigation, route guards by role (`admin`, `teacher`, `student`), and seamless deep-linking without page refreshes. |
| **Axios** (`^1.18.1`) | Centralized API client (`services/api.js`) | Configured with global interceptors to automatically attach Bearer JWT tokens and gracefully redirect upon `401 Unauthorized` token expiry. |
| **@dnd-kit (Core, Sortable, Utilities)** (`^6.3.1`, `^10.0.0`, `^3.2.2`) | Sidebar navigation customizer & Collapsible Mini-Rail (`components/shared/Sidebar.jsx`, `components/shared/DashboardLayout.jsx`, `AdminSettings.jsx`) | Modern, accessible drag-and-drop engine allowing school admins to customize and persist the order of their sidebar menu items, coupled with collapsible rail navigation. |
| **Recharts** (`^3.9.2`) | Analytical charts (`AttendanceTrendChart.jsx`, `AdminDashboard.jsx`) | Responsive SVG data visualization for student attendance trends, fee collection vs dues, and monthly revenue/expense comparisons. |
| **Lucide React** (`^1.24.0`) | UI icons across navigation, action buttons, and status indicators | Lightweight, modern, and tree-shakeable icon set matching contemporary design standards. |
| **React Hot Toast** (`^2.6.0`) | User notifications and feedback alerts | Non-intrusive, customizable toast messages for operations like payment creation, error handling, updates, and deletes. |

---

## 👥 User Roles & Permissions Matrix

| Feature / Module | Admin | Teacher | Student / Parent |
| :--- | :---: | :---: | :---: |
| **Dashboard Analytics & KPIs** | Full System Overview | Class-Specific Overview | Personal Academic & Fee Summary |
| **Student Management (CRUD & Profile)** | Full Access | View Assigned Students | View Own Profile |
| **Bulk Student Excel Import** | Yes | No | No |
| **Class & Section Setup** | Yes | View Only | View Assigned Class |
| **Teacher Subject Assignments** | Full Access | View Assigned | View Subject Teachers |
| **Fee Collection & Payment Records** | Full Access | No | View Own Ledger / Invoices |
| **Books Management & Dues Collection** | Issue, Collect, Receipts | No | View Own Book Dues |
| **One-Time Charges (Exam/Paper Fees)** | Issue, Manage, Collect | No | View Own Charges |
| **Family Tree & Multi-Child Invoicing** | Full Access | No | View Family Summary |
| **Expense Tracking & Categorization** | Full Access | No | No |
| **Staff Salary Payroll Processing** | Full Access | View Own Payslip | No |
| **Student Attendance Tracking** | Full Access & Analytics | Mark Assigned Classes | View Personal Attendance |
| **Marks Entry & Exam Grading** | Manage Scales & Review | Enter Class Subject Marks | View Grade Reports |
| **Session Promotion Engine** | Full Access | No | No |
| **PDF Receipt & Voucher Downloads** | Yes | No | Yes (Receipts & Invoices) |
| **Navigation Order Customization** | Yes | Default | Default |
| **Helpdesk & Support Tickets** | Manage & Resolve All | Submit & View Own | Submit & View Own |

---

## 🚀 Key Features & Modules

### 1. Authentication & Security
- **Multi-Role Login**: Unified login portal supporting email or registration number.
- **Account Activation Workflow**: Admins register teachers and students; users receive an activation token to set their password.
- **Password Recovery**: Secure, tokenized password reset flow with expiry checks.
- **Route Guards**: `ProtectedRoute` checks active tokens and restricts routes according to the user's role.

### 2. Student Information System (SIS) & Bulk Excel Import
- **Comprehensive Profiles**: Tracks personal info, guardian contacts, emergency details, blood group, admission date, and monthly fee amount.
- **Excel (.xlsx / .xls) Bulk Import**: Drag-and-drop spreadsheet upload with preview, header mapping, validation error reporting, and bulk creation.
- **Student Ledger & History**: View complete financial transaction history, dues, and payment breakdown per student.

### 3. Family Accounts & Consolidated Vouchers
- **Family Accounts**: Link multiple siblings under a single father/guardian record.
- **Consolidated Family Billing**: Sibling discount management and combined single-voucher billing.
- **Family Voucher PDF Generation**: Generate printable fee challans/vouchers covering all children in one slip.

### 4. Academics & Faculty Workload Management
- **2-Pane Enterprise Academic Workstation**: Unified Master-Detail interface combining Class listing with an expansive, dedicated Class Workspace for Sections, Faculty Leads, and Curriculum Subjects.
- **Hierarchical Structure**: Manage Academic Classes (e.g., Nursery to Class 10), Sections (e.g., Section A, Green), and Subjects (Science, Math, Urdu, etc.).
- **Class Default Fees**: Set and update class-level default monthly tuition fees with instant visibility and automatic billing inheritance.
- **Touch & Mobile-Friendly Reorder Mode**: Dedicated arrangement toggle allowing seamless reordering of classes, sections, and subjects on desktop, tablets, and mobile devices without visual button clutter.
- **Dedicated Academic Modals**: Modern dialogs for creating and editing classes (`ClassFormModal`), sections with faculty assignment (`SectionFormModal`), and subjects with single-click quick-suggestion tags (`SubjectFormModal`).
- **Explicit Gender Badging**: Clear, accessible status indicators for `Mixed (Co-Ed)`, `Boys Only`, and `Girls Only` classes with search and filtering.
- **Class Teacher Assignment**: Link faculty leads directly to sections with initials-based avatars and employee ID badges.
- **Subject Workload Matrix**: Map teachers to specific class-section subject combinations to establish teaching allocations.

### 5. Fee Management, Student Ledgers & One-Time Charges
- **Class Default Fee & Student Custom Override Architecture**:
  - **Class Default Fees**: Set monthly default tuition per class in Academic Structure (`AdminAcademics.jsx`). Automatically inherited by every student in that class who does not have an override.
  - **Student Custom Fee Overrides**: Set individualized tuition amounts and notes (e.g. "Scholarship", "Sibling Discount", "Staff Child") per student in Student Management (`AdminStudents.jsx`) or via the Student Ledger Drawer (`StudentLedgerDrawer.jsx`).
  - **Centralized Dynamic Fee Resolver**: All fee generation, analytics, and portal billing logic resolves fees through `resolveStudentMonthlyFee` with safe fallback hierarchy (`customFee` -> `classDoc.defaultFee (> 0)` -> `student.monthlyFeeAmount (legacy fallback)` -> `classDoc.defaultFee` -> `0`).
  - **Promotion Continuity**: Custom fees seamlessly persist when students are promoted to higher classes, while standard students automatically adopt the new class's default rate.
  - **Non-Retroactive Invariant**: Updating a class's default fee or student's custom fee only affects future generated billing cycles; previously generated `FeeRecord` amounts remain permanently intact.
- **Automated Monthly Billing**: Bulk generation of monthly fee dues for all active students.
- **Flexible Payment Collection**: Record full, half, or custom payments with payment modes (Cash, Bank, Online), and automatic receipt numbering.
- **Occasional / One-Time Charges System**: Issue exam fees, paper funds, activity kits, or special levies to an entire class, section, or specific hand-picked students with optional due dates.
- **Outstanding One-Time Charges Hub**: Dedicated reporting view and KPI dashboard tracking one-time billings, collections, and dues independently from monthly tuition.
- **Strict Financial Audit Locks**: Once any payment (`amountPaid > 0`) is recorded against a one-time charge, its title, amount, and delete actions are permanently locked.
- **Dynamic Ledger Drawer**: Comprehensive transaction ledger showing monthly tuition, admission dues, and one-time charges with status badges and PDF receipts.

### 6. Financial Accounting: Expenses & Payroll
- **Expense Tracker**: Log school operating costs by category (Utilities, Maintenance, Supplies, Events) with date filters and net balance analysis.
- **Staff Payroll System**: Manage base salaries, additions/bonuses, deductions, and payment statuses (Paid/Pending) per billing cycle.

### 7. Daily Attendance & Analytics
- **Fast Attendance Register**: Grid-based daily marking (Present, Absent, Late, Leave) for teachers and administrators.
- **Historical Analysis & Trend Charts**: Visualize 30-day attendance trends, average attendance percentages, and monthly student records.

### 8. Examination, Grading & Report Cards
- **Mark Sheet Management**: Teachers enter marks for assigned subjects per exam term (Midterm, Final, Monthly Test).
- **Automated Grading**: Calculation of percentages, letter grades (A+, A, B, C, F), and teacher remarks.
- **Student Portal Grade View**: Students can inspect published exam marks and term reports.

### 9. Session Promotion Engine
- **End-of-Year Batch Promotion**: Promotes eligible students to the next class and section in bulk.
- **Preview & Validation**: Admin previews the promotion mapping (e.g., Class 1 -> Class 2) before executing database transactions.

### 10. Dynamic Drag-and-Drop Navigation
- **Customizable Menu Layout**: Admins can re-order their 13 navigation sidebar items (Dashboard, Students, Family Tree, Faculty, Academics, Fees, Books Management, Expenses, Payroll, Attendance, Reports, Promotion, Settings) via `@dnd-kit` drag-and-drop.
- **Persistent & Resilient Preferences**: Layout order is saved to the MongoDB `User.navOrder` field. The system includes automatic merge logic on both backend and frontend to seamlessly append any newly introduced default items without resetting customized layouts.

### 11. Automated PDF Generation
- **Admission Receipt PDF**: Clean, branded admission receipt with school credentials, fee details, and terms.
- **Fee Collection Receipts**: Printable receipt with payment breakdown, discounts, and timestamp.
- **Family Challans**: Consolidated multi-student vouchers ready for bank deposit or counter payment.

### 12. Helpdesk & Support Tickets
- **Internal Ticket Desk**: Students and teachers can submit issue tickets with severity levels and categories.
- **Admin Ticket Resolution**: Admins can filter, reply to, and resolve or close tickets.

### 13. Dark Mode & High-Contrast Design System
- **Universal Slate & Gray Hierarchy**: Eliminates dark-on-dark text contrast loss by systematically transforming `text-slate-*` and `text-gray-*` classes:
  - **Primary headings & bold titles** (`text-slate-950/900/850/800`, `text-navy-950`, `text-[#00215E]`): Crisp `#f8fafc` (slate-50) and `#38bdf8` (sky-400).
  - **Secondary labels & table content** (`text-slate-700/650/600`, `text-gray-700/600`): High-visibility `#e2e8f0` (slate-200).
  - **Muted/supporting text** (`text-slate-500/400`, `text-gray-500/400`): Clean, readable `#94a3b8` (slate-400).
- **Vibrant Primary & High-Contrast Action Buttons**: Interactive table actions (`Pay`, `Collect Fee`, modal saves) with `bg-navy-900` or `bg-[#00215E]` automatically adapt to vibrant `#2563eb` (blue-600) with hover `#1d4ed8`, while preserving the dark navy sidebar branding.
- **Sleek Dark Preset Chips & Badges**: Secondary buttons and preset bundle pills (`bg-slate-100`) render as sleek `#334155` dark chips with light text `#f8fafc` and hover highlights, replacing glaring white boxes.
- **Form Controls & Date Pickers**: All inputs, `<select>` menus, `<option>` items, and textareas feature deep `#1e293b` surfaces, crisp white text, slate-700 borders, inverted calendar picker icons, and clear `#94a3b8` placeholder text.
- **Resilient Status Badges**: `StatusBadge` automatically derives and renders capitalized status labels (`Paid`, `Pending`, `Partial`, etc.) even if the optional `label` prop is omitted.

### 14. Collapsible Mini-Sidebar (Rail Navigation)
- **Compact Icon Rail by Default**: The sidebar defaults to a high-density 80px (`lg:w-20`) mini-rail showing centered module icons with left cyan glow active indicators, maximizing screen real estate for wide data tables (student registries, monthly fee ledgers, exam grades).
- **Multi-Way Toggle Controls**:
  - **Click-to-Expand Logo**: When collapsed, clicking the top school emblem logo smoothly expands the full sidebar.
  - **Sidebar Header Chevron**: Sleek `ChevronLeft` / `ChevronRight` button directly in the sidebar header allows instant collapse/expand.
  - **Top Navbar Menu Button**: The hamburger menu button toggles the mini-sidebar on desktop while toggling the drawer modal on mobile viewports.
- **Hover Floating Tooltips**: In collapsed mode, hovering over any navigation item, Support link, or Logout displays an instant high-contrast floating tooltip badge (`navy-950` with glassmorphic border) to ensure effortless discoverability.
- **Persistent Workspace Preference**: State is automatically remembered in `localStorage` (`ihass_sidebar_collapsed`), preserving the user's preferred layout across browser refreshes and page transitions.
- **Fluid Layout Transition**: Main content offset adjusts with synchronized 300ms cubic transitions (`lg:pl-20` vs `lg:pl-64`) without UI stutter or layout snapping.

---

## 📁 Project Structure

```
iqra-school-management-system/
├── backend/
│   ├── assets/                 # Static brand assets (school logo, etc.)
│   ├── config/
│   │   ├── db.js               # MongoDB Mongoose connection
│   │   └── defaultNavOrder.js  # Default sidebar navigation order configuration
│   ├── controllers/            # Route business logic handlers (Auth, Students, Fees, etc.)
│   ├── middleware/             # Auth, error handling, validation, and access guards
│   ├── models/                 # Mongoose schemas (Student, User, FeeRecord, Family, etc.)
│   ├── routes/                 # Express REST route definitions
│   ├── services/               # Reusable domain services (PDF generation, Excel parsing, etc.)
│   ├── utils/                  # Email service, PDF layout helpers, token utilities
│   ├── package.json
│   ├── seedAdmin.js            # Initial admin user seeder
│   └── server.js               # Express application entry point
│
├── frontend/
│   ├── public/                 # Static public assets
│   ├── src/
│   │   ├── assets/             # Images and design assets
│   │   ├── components/shared/  # Reusable UI (Sidebar, Navbar, Modals, StatusBadges, StatCards)
│   │   ├── context/            # React Contexts (AuthContext, ThemeContext)
│   │   ├── features/           # Domain-specific UI features, modals, and API service wrappers
│   │   ├── pages/              # Role-based route views (Admin, Teacher, Student pages)
│   │   ├── services/           # Axios instance & interceptor setup (api.js)
│   │   ├── utils/              # Formatting helpers, date formatters, and constants
│   │   ├── App.jsx             # React Router route registry
│   │   ├── index.css           # Tailwind base styles and custom scrollbars
│   │   └── main.jsx            # React root mount
│   ├── package.json
│   ├── tailwind.config.js      # Tailwind theme configuration
│   └── vite.config.js          # Vite build and plugin setup
│
└── README.md
```

---

## 🗄 Database Models & Schema Design

| Model Name | Description & Key Fields |
| :--- | :--- |
| **`User`** | Stores authentication credentials, `name`, `email`, `role` (`admin` / `teacher` / `student`), `password` (hashed), `isActivated`, `isActive`, `activationToken`. |
| **`Student`** | Student records: `registrationNumber`, `admissionNumber`, `fullName`, `guardianName`, `contactNumber`, `classId`, `sectionId`, `monthlyFeeAmount`, `familyId`, `status`. |
| **`Family`** | Groups multiple siblings under one guardian record: `familyName`, `fatherName`, `fatherCnic`, `contactNumber`, `students[]`, `discountPercentage`. |
| **`FamilyVoucher`** | Consolidated payment voucher receipt: `familyId`, `voucherNumber`, `voucherType` (`fee`/`book`/`combined`), `idempotencyKey`, `feeRecordIds[]`, `bookFeeRecordIds[]`, `lineItems[]`, `totalAmount`, `paymentMethod`, `paymentDate`, `createdBy`. |
| **`Teacher`** | Faculty information: `fullName`, `email`, `phone`, `qualification`, `designation`, `baseSalary`, `joiningDate`, `userId`. |
| **`Class` & `Section`** | Academic structure hierarchy: `name`, `code`, `order`, `numericValue`, sections assigned to classes. |
| **`Subject`** | Academic subjects: `name`, `code`, `type` (Core/Elective), `classId`. |
| **`Assignment`** | Maps `teacherId` to `classId`, `sectionId`, and `subjectId`. |
| **`FeeRecord`** | Financial dues & ledger records: `studentId`, `month` (`YYYY-MM`), `title` (for one-time charges), `dueDate`, `amountDue`, `amountPaid`, `status` (`paid`/`partial`/`pending`), `type` (`monthly`/`admission`/`one_time`), `payments[]`. Partial unique compound index on `{ studentId, month, type: 'monthly' }`. |
| **`BookFee`** | Course books and curriculum kit fees charged to students: `student`, `classId` (ref Class), `academicYear`, `items: [{ title, price, quantity }]`, `amount`, `amountPaid`, `dueDate`, `paid` (legacy boolean), `paidAt`, `paymentStatus` (`pending`/`partial`/`paid`), `deliveryStatus` (`pending`/`partial`/`delivered`), `payments: [{ receiptNumber, amount, method, paidOn, recordedBy, note }]`. |
| **`Expense`** | School operational expense records: `title`, `amount`, `category`, `paymentMode`, `date`, `receiptNumber`, `description`. |
| **`Payroll`** | Staff salary disbursement ledger: `teacherId`, `month`, `baseSalary`, `allowances`, `deductions`, `netSalary`, `status` (`paid`/`pending`). |
| **`Attendance`** | Daily student attendance records: `classId`, `sectionId`, `date`, `records: [{ studentId, status: present/absent/late/leave, remarks }]`. |
| **`Grade`** | Examination score entries: `studentId`, `classId`, `sectionId`, `subjectId`, `examTerm`, `totalMarks`, `obtainedMarks`, `grade`, `remarks`. |
| **`Settings`** | School metadata: `schoolName`, `address`, `contactNumber`, `logoUrl`, `currentSession`, `sidebarNavOrder`, `lateFeeAmount`. |
| **`SupportTicket`** | Helpdesk system: `ticketId`, `user`, `subject`, `description`, `priority`, `status` (`open`/`in_progress`/`resolved`/`closed`), `responses[]`. |

---

## 📡 REST API Endpoints Guide

### Auth & User Routes (`/api/auth`)
- `POST /api/auth/login` — Authenticate user and receive JWT.
- `POST /api/auth/register` — Admin creation of new user.
- `GET  /api/auth/me` — Retrieve profile of the currently logged-in user.
- `GET  /api/auth/activate/:token` — Validate account activation token.
- `POST /api/auth/activate/:token` — Complete activation and establish password.
- `POST /api/auth/forgot-password` — Generate and email password reset link.
- `POST /api/auth/reset-password/:token` — Update password using reset token.
- `PUT  /api/auth/change-password` — Change password for authenticated session.

### Students & Admissions (`/api/students`)
- `GET    /api/students` — List students with search, class, section, and status filters.
- `POST   /api/students` — Register a new student.
- `GET    /api/students/:id` — Fetch complete student profile.
- `PUT    /api/students/:id` — Update student details.
- `DELETE /api/students/:id` — Archive / delete student record.
- `PATCH  /api/students/:id/custom-fee` — Set or reset student custom monthly fee override and context note.
- `POST   /api/students/import` — Upload and process `.xlsx` bulk student file.
- `GET    /api/students/:id/admission-receipt-pdf` — Download admission receipt PDF.

### Family Tree & Group Billing (`/api/families`)
- `GET  /api/families` — List all family accounts.
- `POST /api/families` — Create new family.
- `POST /api/families/create-with-enrollment` — Create family and enroll children in one step.
- `GET  /api/families/:id/fee-summary` — Sibling consolidated fee overview.
- `GET  /api/families/:id/books-summary` — Sibling consolidated book fee & dues summary.
- `POST /api/families/:id/pay` — Record consolidated family fee payment.
- `POST /api/families/:id/pay-books` — Record consolidated family book fee payment with idempotency protection.
- `GET  /api/families/:familyId/vouchers/:voucherId/pdf` — Download family voucher PDF.

### Fees & Financial Ledgers (`/api/fees` & `/api/fee-records`)
- `GET    /api/fees/summary` — Global fee KPI summary (Total, Collected, Pending, Overdue).
- `GET    /api/fee-records/current-month` — Active monthly tuition records for the current billing cycle.
- `GET    /api/fee-records/student/:studentId` — Full transaction ledger for a student (monthly, admission, and one-time charges).
- `POST   /api/fee-records/:id/pay` — Submit full, half, or custom payment against any fee record.
- `GET    /api/fee-records/student/:studentId/receipt-pdf` — Download payment receipt PDF with branded headers.
- `POST   /api/fee-records/issue-charge` — Bulk issue one-time charges (e.g. Exam Fee, Paper Fee) to whole classes or individual students.
- `GET    /api/fee-records/one-time-charges` — Fetch outstanding one-time charges report with KPI metrics and multi-filter pagination.
- `PUT    /api/fee-records/:id/one-time` — Edit unpaid one-time charge (locked once payment is recorded).
- `DELETE /api/fee-records/:id/one-time` — Void/delete unpaid one-time charge (locked once payment is recorded).

### Books & Syllabus Management (`/api/books`)
- `GET  /api/books/summary` — Books KPI summary (Total Billed, Total Collected, Outstanding Dues, and status counts).
- `GET  /api/books/dues` — Paginated list of student book dues with Class, Section, Payment Status, and Search filters.
- `POST /api/books/:id/pay` — Record single student book fee payment with client UUID idempotencyKey protection.
- `GET  /api/books/:id/receipt-pdf` — Generate and download official branded PDF receipt for a book fee record.
- `POST /api/books/issue` — Issue book charges to an individual student or bulk assign to an entire class/section.

### Expenses & Payroll (`/api/expenses` & `/api/payroll`)
- `GET  /api/expenses` / `POST /api/expenses` — View and record school operating expenses.
- `GET  /api/payroll` / `POST /api/payroll/generate` — Generate monthly staff payroll sheets.
- `POST /api/payroll/:id/pay` — Mark staff salary as paid with payment mode details.

### Attendance (`/api/attendance`)
- `GET  /api/attendance` — View attendance by class, section, and date.
- `POST /api/attendance` — Save/submit daily attendance sheet.
- `GET  /api/attendance/analytics` — Fetch school-wide and class-level attendance statistics.

### Grades & Promotions (`/api/grades` & `/api/admin/promotion`)
- `GET  /api/grades` — Fetch subject marks and results.
- `POST /api/grades/batch` — Bulk save subject marks for a class/section.
- `GET  /api/admin/promotion/preview` — Preview student session promotion roster.
- `POST /api/admin/promotion/execute` — Commit bulk class promotions.

---

## ⚙️ Environment Configuration (.env)

### 1. Backend Configuration (`backend/.env`)

Create a file named `.env` in the `backend/` directory:

```env
# Server Port
PORT=5000

# Node Environment
NODE_ENV=development

# Frontend URL (for CORS allowance)
FRONTEND_URL=http://localhost:5173

# MongoDB Connection String
MONGO_URI=mongodb://localhost:27017/iqra_school_cms
# Or Atlas: mongodb+srv://<user>:<password>@cluster.mongodb.net/iqra_school_cms

# JWT Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters

# Email Service (SMTP) Configuration (for Activation & Password Reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
EMAIL_FROM=no-reply@iqraschool.edu

# Default Seeder Credentials (Optional)
SEED_ADMIN_EMAIL=admin@ihass.edu
SEED_ADMIN_PASSWORD=admin123456
```

### 2. Frontend Configuration (`frontend/.env`)

Create a file named `.env` in the `frontend/` directory:

```env
# Base URL for the Backend REST API
VITE_API_URL=http://localhost:5000/api
```

---

## 💻 Installation & Quick Start

### Prerequisites
- **Node.js** (v18.x or v20.x recommended)
- **npm** (v9.x or higher)
- **MongoDB** running locally or a MongoDB Atlas URI

### Step-by-Step Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Mudasiriqbal-developer/iqra-school-management-system.git
cd iqra-school-management-system
```

#### 2. Install Dependencies
Install dependencies for both backend and frontend:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

#### 3. Seed Initial System Admin
Initialize database tables and create the default administrator account:

```bash
cd ../backend
node seedAdmin.js
```

#### 4. Run Development Servers
Open two separate terminal windows or tabs:

**Terminal 1 — Start Backend Server:**
```bash
cd backend
npm run dev
```
*API will run on: `http://localhost:5000` (Health check: `http://localhost:5000/api/health`)*

**Terminal 2 — Start Frontend Application:**
```bash
cd frontend
npm run dev
```
*Frontend application will run on: `http://localhost:5173`*

---

## 🌱 Database Seeding

The backend includes automated helper seeders located in `backend/`:

- **`node seedAdmin.js`**: Checks if an administrator exists; if not, creates the default system admin with secure password hashing.
- **`node seedClasses.js`**: Populates standard school classes (Nursery, Prep, Class 1 through Class 10) and standard sections.
- **`node seedBulkTestData.js`**: Generates demo teachers, students, sample fee records, and expense entries for testing.
- **`node scripts/repairZeroFees.js`**: Maintenance script that migrates legacy student `monthlyFeeAmount` into `customFee`, establishes default class tuition rates, and recalibrates zero-amount fee records in active billing periods.

---

## 🔒 Security & Architectural Best Practices

- **Token Expiry & Auto-Logout**: JWT tokens are validated on each request. Axios response interceptors immediately wipe local tokens upon `401 Unauthorized` responses and route users to the login screen.
- **Password Protection**: Passwords are encrypted with Bcrypt.js salt hashing before being committed to MongoDB.
- **SQL / NoSQL Injection Prevention**: Request parameters and input bodies are sanitized using `express-validator` and typed Mongoose schemas.
- **Strict Role-Based Authorizations**: Sensitive endpoints (e.g., student deletion, fee collection, payroll disbursement, one-time fee issuance) strictly enforce `authorize('admin')` middleware checks.
- **Financial Audit Locks**: Charges that have received payments (`amountPaid > 0`) cannot have their amount/title altered or be deleted.
- **Clean Separation of Concerns**: Modular structure cleanly separating Routing (`routes/`), Controller Logic (`controllers/`), Business/Utility Services (`services/`, `utils/`), and Database Entities (`models/`).

---

## 🎨 UI/UX Design System & Token Standardization

The frontend adheres to a standardized **Linear / Stripe aesthetic design token system** engineered for crisp legibility and fast performance on low-end and mobile devices:

- **Brand & Primary Core Color**: Unified Navy (`#00215E` / `bg-navy-900` with `hover:bg-navy-800`). All primary CTAs, active table tabs, and modal headers strictly use this brand core.
- **Surface & Elevation Hierarchy**:
  - Surface Containers / Cards: `bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs rounded-2xl`
  - Modals & Slide-out Drawers: `shadow-xl rounded-2xl border border-slate-200/80`
  - Interactive Elements (Buttons, Inputs, Selects): `rounded-xl` (12px)
  - Micro-tags & Status Badges: `rounded-md` or `rounded-full` (with zero shadow overhead)
- **High-Performance Table Rendering**: No per-row or per-card shadows within repeating table lists, avoiding GPU overdraw and layout thrashing on mobile browsers.
- **Typography Scale**: Standardized `font-bold` headings (`text-2xl font-bold tracking-tight text-slate-900`), `text-xs sm:text-sm text-slate-500` subtitles, and `text-[11px] font-bold text-slate-500 uppercase tracking-wider` table column headers.

---

## 📄 License

This project is proprietary software developed for **Iqra Haddiqatul Atfal Model School**. All rights reserved.
