# GeoAttendance Backend API - Implementation Summary

## Session Lifecycle & QR-Based Check-in System

### New Endpoints Added

#### 1. Start Session
**Endpoint:** `POST /api/sessions/start`  
**Auth:** Faculty role required (Bearer token)  
**Request Body:**
```json
{
  "courseId": "string",
  "roomId": "string"
}
```
**Response:**
```json
{
  "sessionId": "string"
}
```
**Logic:**
- Creates a new session with status "active"
- Sets check-in deadline to 15 minutes from session start
- Generates initial QR secret and rotation timestamp
- Returns the session ID for faculty to display QR code

#### 2. End Session
**Endpoint:** `POST /api/sessions/end`  
**Auth:** Faculty role required (Bearer token)  
**Request Body:**
```json
{
  "sessionId": "string"
}
```
**Response:**
```json
{
  "success": true
}
```
**Logic:**
- Updates session status to "ended"
- Automatically generates attendance summary
- Populates attendance records for all enrolled students (marks absents)

#### 3. Get Session QR Token
**Endpoint:** `GET /api/sessions/:sessionId/qr`  
**Auth:** Faculty role required (Bearer token)  
**Response:**
```json
{
  "token": "jwt_token",
  "expiresAt": "ISO8601_timestamp"
}
```
**Logic:**
- Fetches or rotates QR secret if older than 30 minutes
- Generates JWT QR token signed with the session's secret
- Token expires in 30 minutes (matches rotation window)
- Faculty can continuously request new QR without affecting active code

#### 4. Student Check-in with QR
**Endpoint:** `POST /api/sessions/checkin`  
**Auth:** Student role required (Bearer token)  
**Request Body:**
```json
{
  "qrToken": "jwt_token_from_qr",
  "gpsCoords": {
    "lat": number,
    "lng": number
  }
}
```
**Response:**
```json
{
  "studentId": "string",
  "checkInAt": "ISO8601_timestamp",
  "gpsCoords": { "lat": number, "lng": number },
  "deviceId": "string",
  "status": "PRESENT"
}
```
**Validation Checks:**
1. QR token format and signature verification
2. QR token expiration (30-minute window)
3. Check-in deadline (15-minute window after session start)
4. Student enrollment in course
5. Geofence validation (within classroom geo-radius using Haversine formula)
6. Prevents duplicate check-ins
- Creates attendance record in session subcollection

#### 5. Student Check-out with QR
**Endpoint:** `POST /api/sessions/checkout`  
**Auth:** Student role required (Bearer token)  
**Request Body:**
```json
{
  "qrToken": "jwt_token_from_qr"
}
```
**Response:**
```json
{
  "success": true
}
```
**Validation Checks:**
1. QR token validity and signature
2. Student must have previously checked in (mandatory)
- Updates attendance record with checkOutAt timestamp

#### 6. Get Attendance Summary
**Endpoint:** `GET /api/sessions/:sessionId/summary`  
**Auth:** Faculty role required (Bearer token)  
**Response:**
```json
{
  "totalEnrolled": number,
  "totalPresent": number,
  "totalAbsent": number,
  "checkedInOnly": number,
  "checkedInAndOut": number,
  "students": [
    {
      "studentId": "string",
      "studentName": "string",
      "checkInAt": "ISO8601_timestamp | null",
      "checkOutAt": "ISO8601_timestamp | null",
      "status": "PRESENT_FULL | PRESENT_NO_CHECKOUT | ABSENT"
    }
  ]
}
```
**Logic:**
- Fetches all enrolled students in the course
- Maps check-in/check-out records from attendance collection
- Auto-generates records for students not present (ABSENT status)
- Calculated automatically when session ends

---

## Technical Details

### Geofence Validation
Uses **Haversine formula** to calculate great-circle distance between student's GPS coordinates and classroom location:
```typescript
distance = 2 * R * atan2(√a, √(1-a))
```
- R = 6,371,000 meters (Earth radius)
- Default allowed radius: 50 meters (configurable per classroom)
- Prevents remote check-ins

### QR Token Rotation
- Tokens issued with 30-minute TTL
- Faculty can request new token without affecting current one
- QR secrets automatically rotate after 30 minutes of inactivity
- Old QR codes become invalid after rotation

### Role-Based Access Control
All endpoints enforce role validation via `requireRole` middleware:
- Session start/end/QR: Faculty only
- Check-in/checkout: Student only
- Summary: Faculty only

### Error HTTP Status Codes
| Code | Condition |
|------|-----------|
| 400  | Missing/invalid payload fields |
| 401  | Missing or invalid auth token |
| 403  | Role mismatch, expired QR, geofence violation, checks-in deadline passed |
| 404  | Session/classroom/enrollment not found |
| 409  | Student already checked in to same session |
| 500  | Server errors |

---

## Database Schema

### Firestore Collections Used

**sessions/{sessionId}**
```
{
  courseId: string,
  classroomId: string,
  facultyId: string,
  status: "active" | "ended",
  startedAt: ISO8601,
  checkInDeadline: ISO8601,
  qrSecret: UUID,
  qrRotatedAt: ISO8601,
  endedAt?: ISO8601
}
```

**sessions/{sessionId}/attendanceRecords/{studentId}**
```
{
  studentId: string,
  checkInAt?: ISO8601,
  checkOutAt?: ISO8601,
  gpsCoords: { lat: number, lng: number },
  deviceId: string,
  status: "PRESENT" | "ABSENT"
}
```

**sessions/{sessionId}/attendanceSummary/summary**
```
{
  totalEnrolled: number,
  totalPresent: number,
  totalAbsent: number,
  checkedInOnly: number,
  checkedInAndOut: number,
  students: array
}
```

---

## Mobile/Web Client Integration Points

### Mobile (React Native)
The `geo-attendance-mobile/src/services/api.ts` includes:
- `sessionApi.startSession(courseId, classroomId)`
- `sessionApi.endSession(sessionId)`
- `sessionApi.getSessionQr(sessionId)`
- `attendanceApi.studentCheckin({ qrToken, gpsCoords })`
- `attendanceApi.studentCheckout({ qrToken })`

### Web (React)
The `src/services/api.ts` includes the same APIs plus:
- `sessionApi.getSessionSummary(sessionId)`

### Required Bearer Token Headers
All requests must include:
```
Authorization: Bearer <firebase_id_token>
```

---

## Error Messages (Localized for Arabic/English)

| Error | Message (EN) | Message (AR) |
|-------|--------------|--------------|
| `qr_expired` | QR token expired. Ask instructor to refresh. | الـ QR انتهت صلاحيته، اطلب من الدكتور يجدده |
| `checkin_window_closed` | Check-in window closed. Lecture started >15 mins ago. | انتهت فترة التسجيل. المحاضرة بدأت من أكتر من ربع ساعة |
| `not_enrolled` | You are not enrolled in this course. | أنت مش مسجل في الكورس |
| `geofence_violation` | You are not within classroom boundaries. | أنت مش في نطاق الفصل |
| `already_checked_in` | You already checked in to this session. | سجلت حضورك قبل كده |
| `not_checked_in` | You must check in before checking out. | يجب عليك التسجيل قبل المغادرة |

---

## Configuration

Set these environment variables on the backend:
```
FIREBASE_PROJECT_ID=geo-attendance-6e1a4
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
QR_TOKEN_SECRET=<optional_custom_secret>
PORT=5000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081
```

---

## Testing Checklist

- [ ] Faculty can start a session (creates session doc)
- [ ] Faculty can request QR token (generates JWT)
- [ ] Student can check-in with valid QR within 15-min window
- [ ] Student check-in fails if outside geofence
- [ ] Student check-out updates record with checkOutAt
- [ ] Attendance summary auto-generates on session end
- [ ] All absents are recorded for enrolled students
- [ ] Role-based access enforced (403 for mismatches)
- [ ] QR secrets rotate after 30 minutes
- [ ] Old tokens fail verification after rotation
