import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase.ts';
import type { Department } from '../types/index.ts';

const DEPARTMENTS_COLLECTION = 'departments';

export interface DepartmentInput {
  name: string;
  code: string;
  facultyName?: string;
}

export const departmentsService = {
  async getDepartments(): Promise<Department[]> {
    const snapshot = await getDocs(collection(db, DEPARTMENTS_COLLECTION));
    return snapshot.docs.map((d) => {
      const data = d.data() as { name?: string; code?: string; facultyName?: string };
      return {
        id: d.id,
        name: data.name ?? '',
        code: data.code ?? '',
        facultyName: data.facultyName,
      } as Department;
    });
  },

  async createDepartment(input: DepartmentInput): Promise<Department> {
    const payload: Record<string, string> = {
      name: input.name.trim(),
      code: input.code.trim(),
    };
    if (input.facultyName != null && input.facultyName.trim() !== '') {
      payload.facultyName = input.facultyName.trim();
    }
    const ref = await addDoc(collection(db, DEPARTMENTS_COLLECTION), payload);
    return { id: ref.id, ...payload } as Department;
  },

  async updateDepartment(
    id: string,
    payload: Partial<DepartmentInput>
  ): Promise<Department> {
    const ref = doc(db, DEPARTMENTS_COLLECTION, id);
    const toSend = { ...payload } as Record<string, string>;
    if (payload.facultyName === undefined) delete toSend.facultyName;
    await updateDoc(ref, toSend);
    const snap = await getDoc(ref);
    const data = snap.data() as { name?: string; code?: string; facultyName?: string };
    return {
      id: snap.id,
      name: data?.name ?? '',
      code: data?.code ?? '',
      facultyName: data?.facultyName,
    } as Department;
  },

  async deleteDepartment(id: string): Promise<void> {
    const ref = doc(db, DEPARTMENTS_COLLECTION, id);
    await deleteDoc(ref);
  },
};
