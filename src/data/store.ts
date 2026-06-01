/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, isFirebaseSupported, handleFirestoreError, OperationType, auth } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Student, Teacher, SchoolSettings, UserProfile } from '../types';
import { INITIAL_STUDENTS, INITIAL_TEACHERS, DEFAULT_SCHOOL_SETTINGS, DEFAULT_USER_PROFILES } from './mockData';

// Safe Local Storage Load Helpers
export function loadLocalStudents(): Student[] {
  const local = localStorage.getItem('sms_students');
  if (local) {
    try { return JSON.parse(local); } catch (e) { /* ignore */ }
  }
  localStorage.setItem('sms_students', JSON.stringify(INITIAL_STUDENTS));
  return INITIAL_STUDENTS;
}

export function saveLocalStudents(list: Student[]) {
  localStorage.setItem('sms_students', JSON.stringify(list));
}

export function loadLocalTeachers(): Teacher[] {
  const local = localStorage.getItem('sms_teachers');
  if (local) {
    try { return JSON.parse(local); } catch (e) { /* ignore */ }
  }
  localStorage.setItem('sms_teachers', JSON.stringify(INITIAL_TEACHERS));
  return INITIAL_TEACHERS;
}

export function saveLocalTeachers(list: Teacher[]) {
  localStorage.setItem('sms_teachers', JSON.stringify(list));
}

export function loadLocalSettings(): SchoolSettings {
  const local = localStorage.getItem('sms_school_settings');
  if (local) {
    try { return JSON.parse(local); } catch (e) { /* ignore */ }
  }
  localStorage.setItem('sms_school_settings', JSON.stringify(DEFAULT_SCHOOL_SETTINGS));
  return DEFAULT_SCHOOL_SETTINGS;
}

export function saveLocalSettings(settings: SchoolSettings) {
  localStorage.setItem('sms_school_settings', JSON.stringify(settings));
}

export function loadLocalProfiles(): Record<string, UserProfile> {
  const local = localStorage.getItem('sms_user_profiles');
  if (local) {
    try { return JSON.parse(local); } catch (e) { /* ignore */ }
  }
  localStorage.setItem('sms_user_profiles', JSON.stringify(DEFAULT_USER_PROFILES));
  return DEFAULT_USER_PROFILES;
}

export function saveLocalProfiles(profiles: Record<string, UserProfile>) {
  localStorage.setItem('sms_user_profiles', JSON.stringify(profiles));
}

// -------------------------------------------------------------
// LOCAL REPLICA REAL-TIME SYNCHRONIZATION SYSTEM
// -------------------------------------------------------------
type PubSubCallback<T> = (data: T) => void;

class LocalPubSub<T> {
  private listeners = new Set<PubSubCallback<T>>();

  subscribe(callback: PubSubCallback<T>): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notify(data: T) {
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error('PubSub callback error:', err);
      }
    });
  }
}

const studentsPubSub = new LocalPubSub<Student[]>();
const teachersPubSub = new LocalPubSub<Teacher[]>();
const settingsPubSub = new LocalPubSub<SchoolSettings>();
const profilesPubSub = new LocalPubSub<Record<string, UserProfile>>();

// Passive synchronization across browser tabs and iframe windows
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    try {
      if (e.key === 'sms_students') {
        studentsPubSub.notify(loadLocalStudents());
      } else if (e.key === 'sms_teachers') {
        teachersPubSub.notify(loadLocalTeachers());
      } else if (e.key === 'sms_school_settings') {
        settingsPubSub.notify(loadLocalSettings());
      } else if (e.key === 'sms_user_profiles') {
        profilesPubSub.notify(loadLocalProfiles());
      }
    } catch (err) {
      console.warn('Cross-tab live synchronization failed:', err);
    }
  });
}

// -------------------------------------------------------------
// SECURE DATA SYNCHRONIZATION OPERATIONS
// -------------------------------------------------------------

// Listeners
export function subscribeToStudents(onUpdate: (students: Student[]) => void): () => void {
  let unsubFirestore: (() => void) | null = null;
  let unsubLocal: (() => void) | null = null;

  const runLocalFallback = () => {
    if (unsubLocal) return; // already listening locally
    const localInit = loadLocalStudents();
    onUpdate(localInit);
    unsubLocal = studentsPubSub.subscribe(onUpdate);
  };

  if (isFirebaseSupported && db && auth?.currentUser) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'students'),
        (snapshot) => {
          if (snapshot.empty) {
            const alreadySeeded = localStorage.getItem('sms_students_seeded') === 'true';
            if (!alreadySeeded) {
              INITIAL_STUDENTS.forEach((student) => {
                setDoc(doc(db, 'students', student.id), student).catch(() => {});
              });
              localStorage.setItem('sms_students_seeded', 'true');
              onUpdate(INITIAL_STUDENTS);
              saveLocalStudents(INITIAL_STUDENTS);
            } else {
              onUpdate([]);
              saveLocalStudents([]);
            }
          } else {
            const list: Student[] = [];
            snapshot.forEach((d) => {
              list.push(d.data() as Student);
            });
            // Mark as seeded since snapshot contains student documents
            localStorage.setItem('sms_students_seeded', 'true');
            onUpdate(list);
            saveLocalStudents(list); // maintain local replica cache
          }
        },
        (error) => {
          console.error('Firestore students subscription error, falling back locally:', error);
          runLocalFallback();
        }
      );
    } catch (e) {
      console.warn('Firestore subscription failed, using local database mode:', e);
      runLocalFallback();
    }
  } else {
    runLocalFallback();
  }

  return () => {
    if (unsubFirestore) unsubFirestore();
    if (unsubLocal) unsubLocal();
  };
}

export function subscribeToTeachers(onUpdate: (teachers: Teacher[]) => void): () => void {
  let unsubFirestore: (() => void) | null = null;
  let unsubLocal: (() => void) | null = null;

  const runLocalFallback = () => {
    if (unsubLocal) return;
    const localInit = loadLocalTeachers();
    onUpdate(localInit);
    unsubLocal = teachersPubSub.subscribe(onUpdate);
  };

  if (isFirebaseSupported && db && auth?.currentUser) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'teachers'),
        (snapshot) => {
          if (snapshot.empty) {
            const alreadySeeded = localStorage.getItem('sms_teachers_seeded') === 'true';
            if (!alreadySeeded) {
              INITIAL_TEACHERS.forEach((teacher) => {
                setDoc(doc(db, 'teachers', teacher.id), teacher).catch(() => {});
              });
              localStorage.setItem('sms_teachers_seeded', 'true');
              onUpdate(INITIAL_TEACHERS);
              saveLocalTeachers(INITIAL_TEACHERS);
            } else {
              onUpdate([]);
              saveLocalTeachers([]);
            }
          } else {
            const list: Teacher[] = [];
            snapshot.forEach((d) => {
              list.push(d.data() as Teacher);
            });
            // Mark as seeded since snapshot contains teacher documents
            localStorage.setItem('sms_teachers_seeded', 'true');
            onUpdate(list);
            saveLocalTeachers(list);
          }
        },
        (error) => {
          console.error('Firestore teachers subscription error, falling back locally:', error);
          runLocalFallback();
        }
      );
    } catch (e) {
      console.warn('Firestore subscription failed, using local database mode:', e);
      runLocalFallback();
    }
  } else {
    runLocalFallback();
  }

  return () => {
    if (unsubFirestore) unsubFirestore();
    if (unsubLocal) unsubLocal();
  };
}

export function subscribeToSettings(onUpdate: (settings: SchoolSettings) => void): () => void {
  let unsubFirestore: (() => void) | null = null;
  let unsubLocal: (() => void) | null = null;

  const runLocalFallback = () => {
    if (unsubLocal) return;
    const localInit = loadLocalSettings();
    onUpdate(localInit);
    unsubLocal = settingsPubSub.subscribe(onUpdate);
  };

  if (isFirebaseSupported && db) {
    try {
      unsubFirestore = onSnapshot(
        doc(db, 'settings', 'school'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as SchoolSettings;
            onUpdate(data);
            saveLocalSettings(data);
          } else {
            const alreadySeeded = localStorage.getItem('sms_settings_seeded') === 'true';
            if (!alreadySeeded) {
              const defaults = loadLocalSettings();
              setDoc(doc(db, 'settings', 'school'), defaults).catch(() => {});
              localStorage.setItem('sms_settings_seeded', 'true');
              onUpdate(defaults);
            }
          }
        },
        (error) => {
          console.error('Firestore settings subscription error, falling back locally:', error);
          runLocalFallback();
        }
      );
    } catch (e) {
      console.warn('Firestore subscription failed, using local database mode:', e);
      runLocalFallback();
    }
  } else {
    runLocalFallback();
  }

  return () => {
    if (unsubFirestore) unsubFirestore();
    if (unsubLocal) unsubLocal();
  };
}

export function subscribeToProfiles(onUpdate: (profiles: Record<string, UserProfile>) => void): () => void {
  let unsubFirestore: (() => void) | null = null;
  let unsubLocal: (() => void) | null = null;

  const runLocalFallback = () => {
    if (unsubLocal) return;
    const localInit = loadLocalProfiles();
    onUpdate(localInit);
    unsubLocal = profilesPubSub.subscribe(onUpdate);
  };

  if (isFirebaseSupported && db) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          if (snapshot.empty) {
            const alreadySeeded = localStorage.getItem('sms_profiles_seeded') === 'true';
            if (!alreadySeeded) {
              Object.entries(DEFAULT_USER_PROFILES).forEach(([role, profile]) => {
                setDoc(doc(db, 'users', role), profile).catch(() => {});
              });
              localStorage.setItem('sms_profiles_seeded', 'true');
              onUpdate(DEFAULT_USER_PROFILES);
              saveLocalProfiles(DEFAULT_USER_PROFILES);
            } else {
              onUpdate({});
              saveLocalProfiles({});
            }
          } else {
            const dict: Record<string, UserProfile> = {};
            snapshot.forEach((d) => {
              dict[d.id] = d.data() as UserProfile;
            });
            // Mark as seeded since snapshot contains profile documents
            localStorage.setItem('sms_profiles_seeded', 'true');
            // merge with defaults if anything is missing
            const merged = { ...loadLocalProfiles(), ...dict };
            onUpdate(merged);
            saveLocalProfiles(merged);
          }
        },
        (error) => {
          console.error('Firestore users subscription error, falling back locally:', error);
          runLocalFallback();
        }
      );
    } catch (e) {
      console.warn('Firestore subscription failed, using local database mode:', e);
      runLocalFallback();
    }
  } else {
    runLocalFallback();
  }

  return () => {
    if (unsubFirestore) unsubFirestore();
    if (unsubLocal) unsubLocal();
  };
}

// Write API proxies
export async function writeStudent(student: Student, allStudentsList: Student[]) {
  if (isFirebaseSupported && db && auth?.currentUser) {
    try {
      await setDoc(doc(db, 'students', student.id), student);
      return;
    } catch (error) {
      console.warn('Firestore writeStudent error, falling back locally:', error);
      handleFirestoreError(error, OperationType.WRITE, 'students/' + student.id);
    }
  }
  const updated = allStudentsList.filter(s => s.id !== student.id);
  updated.push(student);
  saveLocalStudents(updated);
  studentsPubSub.notify(updated);
}

export async function writeBulkStudents(studentsList: Student[]) {
  if (isFirebaseSupported && db && auth?.currentUser) {
    try {
      for (const s of studentsList) {
        await setDoc(doc(db, 'students', s.id), s);
      }
      return;
    } catch (error) {
      console.warn('Firestore writeBulkStudents error, falling back locally:', error);
      handleFirestoreError(error, OperationType.WRITE, 'students');
    }
  }
  saveLocalStudents(studentsList);
  studentsPubSub.notify(studentsList);
}

export async function removeStudent(id: string, allStudentsList: Student[]) {
  if (isFirebaseSupported && db && auth?.currentUser) {
    try {
      await deleteDoc(doc(db, 'students', id));
      return;
    } catch (error) {
      console.warn('Firestore removeStudent error, falling back locally:', error);
      handleFirestoreError(error, OperationType.DELETE, 'students/' + id);
    }
  }
  const updated = allStudentsList.filter(s => s.id !== id);
  saveLocalStudents(updated);
  studentsPubSub.notify(updated);
}

export async function removeBulkStudents(ids: string[], allStudentsList: Student[]) {
  if (isFirebaseSupported && db && auth?.currentUser) {
    try {
      for (const id of ids) {
        await deleteDoc(doc(db, 'students', id));
      }
      return;
    } catch (error) {
      console.warn('Firestore removeBulkStudents error, falling back locally:', error);
      handleFirestoreError(error, OperationType.DELETE, 'students');
    }
  }
  const updated = allStudentsList.filter(s => !ids.includes(s.id));
  saveLocalStudents(updated);
  studentsPubSub.notify(updated);
}

export async function writeTeacher(teacher: Teacher, allTeachersList: Teacher[]) {
  if (isFirebaseSupported && db && auth?.currentUser) {
    try {
      await setDoc(doc(db, 'teachers', teacher.id), teacher);
      return;
    } catch (error) {
      console.warn('Firestore writeTeacher error, falling back locally:', error);
      handleFirestoreError(error, OperationType.WRITE, 'teachers/' + teacher.id);
    }
  }
  const updated = allTeachersList.filter(t => t.id !== teacher.id);
  updated.push(teacher);
  saveLocalTeachers(updated);
  teachersPubSub.notify(updated);
}

export async function removeTeacher(id: string, allTeachersList: Teacher[]) {
  if (isFirebaseSupported && db && auth?.currentUser) {
    try {
      await deleteDoc(doc(db, 'teachers', id));
      return;
    } catch (error) {
      console.warn('Firestore removeTeacher error, falling back locally:', error);
      handleFirestoreError(error, OperationType.DELETE, 'teachers/' + id);
    }
  }
  const updated = allTeachersList.filter(t => t.id !== id);
  saveLocalTeachers(updated);
  teachersPubSub.notify(updated);
}

export async function writeSettings(settings: SchoolSettings) {
  if (isFirebaseSupported && db && auth?.currentUser) {
    try {
      await setDoc(doc(db, 'settings', 'school'), settings);
      return;
    } catch (error) {
      console.warn('Firestore writeSettings error, falling back locally:', error);
      handleFirestoreError(error, OperationType.WRITE, 'settings/school');
    }
  }
  saveLocalSettings(settings);
  settingsPubSub.notify(settings);
}

export async function writeUserProfile(role: string, profile: UserProfile, allProfiles: Record<string, UserProfile>) {
  if (isFirebaseSupported && db && auth?.currentUser) {
    try {
      await setDoc(doc(db, 'users', role), profile);
      return;
    } catch (error) {
      console.warn('Firestore writeUserProfile error, falling back locally:', error);
      handleFirestoreError(error, OperationType.WRITE, 'users/' + role);
    }
  }
  const clone = { ...allProfiles };
  clone[role] = profile;
  saveLocalProfiles(clone);
  profilesPubSub.notify(clone);
}

export async function importBackupData(
  students: Student[],
  teachers: Teacher[],
  schoolSettings: SchoolSettings,
  userProfiles: Record<string, UserProfile>,
  passwords?: Record<string, string>
) {
  // Update local storage
  saveLocalStudents(students);
  saveLocalTeachers(teachers);
  saveLocalSettings(schoolSettings);
  saveLocalProfiles(userProfiles);
  if (passwords) {
    Object.entries(passwords).forEach(([role, pwd]) => {
      localStorage.setItem(`sms_pwd_${role}`, pwd);
    });
  }

  // Notify pub/sub channels
  studentsPubSub.notify(students);
  teachersPubSub.notify(teachers);
  settingsPubSub.notify(schoolSettings);
  profilesPubSub.notify(userProfiles);

  // Sync to Firestore if authenticated & supported
  if (isFirebaseSupported && db && auth?.currentUser) {
    try {
      // Overwrite/write settings
      await setDoc(doc(db, 'settings', 'school'), schoolSettings);

      // Overwrite/write students
      for (const s of students) {
        await setDoc(doc(db, 'students', s.id), s);
      }

      // Overwrite/write teachers
      for (const t of teachers) {
        await setDoc(doc(db, 'teachers', t.id), t);
      }

      // Overwrite/write user profiles
      for (const [role, profile] of Object.entries(userProfiles)) {
        await setDoc(doc(db, 'users', role), profile);
      }
    } catch (e) {
      console.warn("Firebase backup sync errored:", e);
    }
  }
}

