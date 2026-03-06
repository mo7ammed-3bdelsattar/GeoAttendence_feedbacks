export * from './auth.ts';
export * from './course.ts';
export * from './enrollment.ts';
export * from './attendance.ts';
export * from './feedback.ts';
export * from './session.ts';

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Classroom {
  id: string;
  name: string;
  building: string;
  lat: number;
  lng: number;
  geofenceRadiusMeters: number;
}
