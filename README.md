# Geo-Attendance & Course Feedback System

React web frontend for university geo-attendance and course feedback. **Mobile-first**, role-based (Student / Faculty / Admin), with mock API and realistic data.

## Tech Stack

- React 18+ · TypeScript · Vite
- **Tailwind CSS** · Lucide Icons
- React Router v6 · **Zustand** (auth state)
- **Leaflet** / react-leaflet (maps)
- **Recharts** (charts)
- React Hook Form · React Hot Toast · date-fns

## Colors

- Primary: `#1e3a8a`
- Secondary: `#f59e0b`
- Success: `#10b981`
- Danger: `#f43f5e`
- Background: `#f8fafc`

## Setup

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Login (mock)

Use any email that exists in mock data with the **matching role**:

- **Student:** e.g. `alice@uni.edu` / role: Student
- **Faculty:** `j.foster@uni.edu` or `s.green@uni.edu` / role: Faculty
- **Admin:** `admin@uni.edu` / role: Admin  

Password is ignored in mock; role must match the user’s role in `src/data/mockUsers.ts`.

## Routes

| Role    | Paths |
|--------|--------|
| Student | `/student` (Home), `/student/feedback`, `/student/history`, `/student/profile` |
| Faculty | `/faculty/sessions`, `/faculty/live`, `/faculty/analytics`, `/faculty/feedback` |
| Admin   | `/admin`, `/admin/users`, `/admin/departments`, `/admin/courses`, `/admin/classrooms`, `/admin/reports` |
| Auth    | `/login`, `/forgot-password` |

## Features

- **Auth:** Login (email, password show/hide, role dropdown), Forgot password.
- **Student:** Home (active session, countdown, mini map, check-in, geofence status, recent check-ins), Feedback (4 star ratings + comment 500 char), History (stats + course filter + timeline), Profile (info, enrolled courses, logout).
- **Faculty:** Create Session (course, classroom + map, date/time, check-in window, topic), Live Session (counter, map, student table, override, close), Attendance Analytics (date range, KPIs, line/bar charts, students &lt;75%, export), Feedback Dashboard (session selector, score cards, trend, anonymous comments with blur until 5+).
- **Admin:** Overview (stat cards, Firebase usage bars, activity log), Users (tabs, search, add modal), Departments (table + edit modal), Courses (table), Classrooms (table + GPS + geofence editor + map), Reports (charts, export center).

## Project structure

```
src/
  pages/          auth, student, faculty, admin
  components/     layout (AppShell, Header), ui (StatCard, SessionCard, GeofenceMap, StarRating, DataTable, AttendanceBadge, LoadingSkeleton, EmptyState), forms (FormInput, FormSelect, FormDateTime, FormMapPicker)
  stores/         authStore (Zustand + persist)
  services/       mockApi (auth, student, faculty, admin)
  data/           mockUsers, mockCourses, mockClassrooms, mockSessions, mockDepartments
  types/          auth, session, course, attendance, feedback
  routes/         ProtectedRoute by role, router
```

## Mock API

All data is in-memory. See `src/services/mockApi.ts` for:

- **Auth:** login, logout, resetPassword  
- **Student:** getActiveSessions, checkIn, getAttendanceHistory, submitFeedback  
- **Faculty:** createSession, getSessionDetails, getLiveAttendance, overrideAttendance, closeSession, getAttendanceAnalytics, getFeedbackSummary, generateReport  
- **Admin:** getUsers, createUser, updateUser, getDepartments, updateDepartment, getCourses, getClassrooms, updateClassroom, generateReport  

Replace with real API by swapping these modules or adding a thin HTTP layer.
