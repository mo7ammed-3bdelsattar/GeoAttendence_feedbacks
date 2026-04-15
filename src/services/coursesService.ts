import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Course } from '../types/index.ts';

const COURSES_COLLECTION = 'courses';

export interface CourseInput {
  name: string;
  code: string;
  departmentId: string;
  departmentName: string;
  facultyName?: string;
}

export const coursesService = {
  async getCourses(): Promise<Course[]> {
    const snapshot = await getDocs(collection(db, COURSES_COLLECTION));

    return snapshot.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        name: data.name ?? '',
        code: data.code ?? '',
        departmentId: data.departmentId ?? '',
        departmentName: data.departmentName ?? '',
        facultyId: data.facultyId,
        facultyName: data.facultyName,
        enrolledCount: typeof data.enrolledCount === 'number' ? data.enrolledCount : 0,
      } as Course;
    });
  },

  async createCourse(input: CourseInput): Promise<Course> {
    const payload: Record<string, unknown> = {
      name: input.name,
      code: input.code,
      departmentId: input.departmentId,
      departmentName: input.departmentName,
      enrolledCount: 0,
    };
    if (input.facultyName != null && input.facultyName.trim() !== '') {
      payload.facultyName = input.facultyName.trim();
    }

    const ref = await addDoc(collection(db, COURSES_COLLECTION), payload);

    return {
      id: ref.id,
      ...payload,
    } as Course;
  },

  async updateCourse(id: string, payload: Partial<Course>): Promise<Course> {
    const ref = doc(db, COURSES_COLLECTION, id);
    const filtered = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;
    await updateDoc(ref, filtered);

    const snap = await getDoc(ref);
    const data = snap.data() as any;

    return {
      id: snap.id,
      name: data?.name ?? '',
      code: data?.code ?? '',
      departmentId: data?.departmentId ?? '',
      departmentName: data?.departmentName ?? '',
      facultyId: data?.facultyId,
      facultyName: data?.facultyName,
      enrolledCount: typeof data?.enrolledCount === 'number' ? data.enrolledCount : 0,
    } as Course;
  },

  async deleteCourse(id: string): Promise<void> {
    const ref = doc(db, COURSES_COLLECTION, id);
    await deleteDoc(ref);
  },
};

