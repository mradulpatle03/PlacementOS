# PlacementOS

> End-to-End Placement Management System for Colleges & Universities

PlacementOS is a comprehensive placement management platform designed to digitize and automate the entire campus recruitment lifecycle—from company onboarding to final offer acceptance.

The system eliminates fragmented spreadsheets, emails, and manual workflows by providing a unified platform for Students, Recruiters, Placement Coordinators, TPOs, and Administrators.

---

## Features

### Student Portal
- Profile Management
- Resume Versioning
- Drive Discovery & Applications
- Application Status Tracking
- Interview Scheduling
- Offer Management
- Placement Dashboard

### Recruiter Portal
- Company Recruitment Drives
- Candidate Pipeline Management
- Online Assessment Creation
- Interview Scheduling
- Offer Letter Upload
- Recruitment Analytics

### Training & Placement Officer (TPO)
- Company Management
- Drive Creation & Publishing
- Eligibility Configuration
- Student Monitoring
- Placement Analytics
- Report Generation

### Admin Panel
- User Management
- Role-Based Access Control (RBAC)
- Audit Logs
- System Configuration
- Announcements Management

---

## Key Highlights

### Smart Eligibility Engine
Automatically evaluates students against drive requirements:

- CGPA Criteria
- Branch Eligibility
- Backlog Restrictions
- Graduation Year
- Placement Policies
- Dream Company Rules

### Recruitment Pipeline
Visual Kanban-based recruitment workflow:

```text
Registered
    ↓
Applied
    ↓
Shortlisted
    ↓
Online Assessment
    ↓
Interview Round 1
    ↓
Interview Round 2
    ↓
HR Round
    ↓
Offered
    ↓
Accepted
```

### Online Assessment Platform
- MCQ Tests
- Coding Challenges
- Auto Evaluation
- Anti-Cheat Measures
- Judge0/Piston Integration
- Detailed Reports

### Analytics Dashboard
- Placement Percentage
- Highest Package
- Average Package
- Median Package
- Branch-wise Analytics
- Recruitment Funnel
- Offer Acceptance Rate

---

# Tech Stack

## Frontend

- React 18
- Redux Toolkit
- RTK Query
- React Router v6
- Tailwind CSS
- ShadCN UI
- React Hook Form
- Zod
- Recharts
- DnD Kit

## Backend

- Node.js
- Express.js
- JWT Authentication
- Bcrypt
- Multer

## Database

- MongoDB
- Mongoose ODM

## Cache & Queue

- Redis
- BullMQ

## Real-Time Communication

- Socket.IO

## Cloud Services

- Cloudinary
- Nodemailer
- SendGrid / Resend
- Twilio

## Testing

- Jest
- Supertest
- React Testing Library

---

# Architecture

```text
Frontend (React)
       │
       ▼
Express REST API
       │
 ┌─────┼───────────────┐
 ▼     ▼               ▼
MongoDB Redis      Socket.IO
       │
       ▼
    BullMQ
       │
 ┌─────┼──────────┐
 ▼     ▼          ▼
Email SMS      Reports
```

---

# User Roles

| Role | Responsibilities |
|--------|------------------|
| Student | Apply to drives, manage profile, track offers |
| Placement Coordinator | Assist TPO operations |
| Recruiter | Manage candidates and recruitment process |
| TPO | Manage companies, drives, analytics |
| Admin | Complete system administration |

---

# Project Structure

```bash
placementos/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── services/
│   │   ├── queues/
│   │   ├── sockets/
│   │   └── utils/
│   │
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── features/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── store/
│   │   └── hooks/
│
└── README.md
```

---

# Core Modules

- Authentication & Authorization
- User Profiles
- Resume Management
- Company Management
- Placement Drives
- Eligibility Engine
- Applications Management
- Recruitment Pipeline
- Online Assessments
- Interview Scheduler
- Notification System
- Offer Management
- Placement Analytics
- Reports & Exports
- Audit Logs
- Policy Engine
- Public Placement Portal

---

# Database Collections

```text
users
students
recruiters
companies
drives
applications
resumes
assessments
assessmentSubmissions
interviews
offers
notifications
auditLogs
policies
announcements
reports
successStories
```

---

# Getting Started

## Clone Repository

```bash
git clone https://github.com/yourusername/placementos.git
cd placementos
```

## Backend Setup

```bash
cd backend

npm install

npm run dev
```

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

---

# Environment Variables

### Backend

```env
PORT=5000

MONGO_URI=

REDIS_URL=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SMTP_HOST=
SMTP_USER=
SMTP_PASS=

FRONTEND_URL=http://localhost:5173
```

### Frontend

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

---

# Testing

```bash
# Backend

npm run test

# Frontend

npm run test
```

### Test Coverage

- Unit Testing
- Integration Testing
- API Testing
- UI Testing
- End-to-End Testing

---

# Future Enhancements

- AI Resume Analysis
- Placement Prediction Engine
- Interview Preparation Module
- Mobile Application
- Video Interview Platform
- Advanced Reporting Dashboard

---

# Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a Pull Request

---

# Author

**Mradul Patle**

Software Developer | MERN Stack Developer

If you found this project useful, consider giving it a ⭐ on GitHub.