import { 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User, UserRole } from '../types/index.ts';



export const authApi = {
  async login(email: string, password: string, role: UserRole): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Fetch user role from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
      throw new Error('User profile not found in database');
    }

    const userData = userDoc.data() as User;
    if (userData.role !== role) {
      throw new Error(`Unauthorized: You are not registered as a ${role}`);
    }

    return {
      id: firebaseUser.uid,
      name: userData.name || firebaseUser.displayName || email.split('@')[0],
      email: firebaseUser.email || email,
      role: userData.role
    };
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }
};

export const adminApi = {
  async getUsers(role?: UserRole): Promise<User[]> {
    const usersCol = collection(db, 'users');
    let q = query(usersCol);
    
    if (role) {
      q = query(usersCol, where('role', '==', role));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        if (!data) return null;
        return {
          id: doc.id,
          ...data,
        } as User;
      })
      .filter((u): u is User => u !== null);
  },

  async createUser(payload: Partial<User> & { password?: string }): Promise<User> {
    // Note: Creating auth users for others from the frontend is restricted in Firebase.
    // Usually this is done via a backend or Firebase Admin SDK.
    // For this demonstration, we'll create a Firestore entry.
    // If the user wants to sign up themselves, they'd use a signup page.
    
    const id = payload.id || `u-${Date.now()}`;
    const newUser: User = {
      id,
      name: payload.name ?? '',
      email: payload.email ?? '',
      role: payload.role ?? 'student',
    };

    await setDoc(doc(db, 'users', id), newUser);
    return newUser;
  },

  async updateUser(id: string, payload: Partial<User>): Promise<User> {
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, payload);
    const updated = await getDoc(userRef);
    return { id: updated.id, ...updated.data() } as User;
  },

  async deleteUser(id: string): Promise<void> {
    await deleteDoc(doc(db, 'users', id));
  }
};
