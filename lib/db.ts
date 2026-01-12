import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebaseClient';

// Types
export interface User {
  displayName: string;
  email: string;
  createdAt: Timestamp;
}

export interface Subject {
  id: string;
  uid: string;
  title: string;
  createdAt: Timestamp;
}

export interface Note {
  id: string;
  uid: string;
  subjectId: string;
  title: string;
  content: string;
  createdAt: Timestamp;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Timestamp;
}

export interface Quiz {
  id: string;
  uid: string;
  subjectId: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: Timestamp;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

// Subjects
export async function getSubjects(uid: string): Promise<Subject[]> {
  const q = query(
    collection(db, 'subjects'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Subject[];
}

export async function createSubject(uid: string, title: string): Promise<string> {
  const docRef = await addDoc(collection(db, 'subjects'), {
    uid,
    title,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function deleteSubject(subjectId: string): Promise<void> {
  await deleteDoc(doc(db, 'subjects', subjectId));
}

// Notes
export async function getNotes(subjectId: string, uid: string): Promise<Note[]> {
  const q = query(
    collection(db, 'notes'),
    where('subjectId', '==', subjectId),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Note[];
}

export async function getLatestNotes(subjectId: string, uid: string, count: number = 5): Promise<Note[]> {
  const q = query(
    collection(db, 'notes'),
    where('subjectId', '==', subjectId),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Note[];
}

export async function createNote(uid: string, subjectId: string, title: string, content: string): Promise<string> {
  const docRef = await addDoc(collection(db, 'notes'), {
    uid,
    subjectId,
    title,
    content,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function deleteNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db, 'notes', noteId));
}

// Chats
export async function getChat(subjectId: string, uid: string): Promise<string | null> {
  const q = query(
    collection(db, 'chats'),
    where('subjectId', '==', subjectId),
    where('uid', '==', uid),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].id;
}

export async function createChat(subjectId: string, uid: string): Promise<string> {
  const docRef = await addDoc(collection(db, 'chats'), {
    uid,
    subjectId,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getOrCreateChat(subjectId: string, uid: string): Promise<string> {
  const existingChat = await getChat(subjectId, uid);
  if (existingChat) return existingChat;
  return createChat(subjectId, uid);
}

// Chat Messages
export async function getChatMessages(chatId: string, count: number = 50): Promise<ChatMessage[]> {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChatMessage[];
}

export async function addChatMessage(
  chatId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
    role,
    content,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

// Quizzes
export async function getQuizzes(subjectId: string, uid: string): Promise<Quiz[]> {
  const q = query(
    collection(db, 'quizzes'),
    where('subjectId', '==', subjectId),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Quiz[];
}

export async function createQuiz(
  uid: string,
  subjectId: string,
  title: string,
  questions: QuizQuestion[]
): Promise<string> {
  const docRef = await addDoc(collection(db, 'quizzes'), {
    uid,
    subjectId,
    title,
    questions,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

// Users
export async function getUser(uid: string): Promise<User | null> {
  const docSnap = await getDoc(doc(db, 'users', uid));
  if (!docSnap.exists()) return null;
  return docSnap.data() as User;
}
