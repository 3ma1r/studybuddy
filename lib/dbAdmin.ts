import { getFirestore, Timestamp, Firestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

export interface QuizQuestion {
  q: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

let adminDb: Firestore | null = null;

function getAdminDb(): Firestore {
  if (adminDb) {
    return adminDb;
  }
  
  if (getApps().length > 0) {
    adminDb = getFirestore(getApps()[0]);
    return adminDb;
  }
  
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      // Handle private key format - replace literal \n with actual newlines
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      // Remove quotes if present
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      // Replace \n with actual newlines
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      const app = initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      adminDb = getFirestore(app);
      return adminDb;
    } catch (error: any) {
      console.error('Failed to initialize Firebase Admin DB:', error.message);
      throw new Error(`Firebase Admin initialization failed: ${error.message}`);
    }
  }
  
  throw new Error('Firebase Admin not initialized. Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.');
}

export async function getLatestNotesAdmin(subjectId: string, uid: string, count: number = 5) {
  const db = getAdminDb();
  
  const snapshot = await db
    .collection('notes')
    .where('subjectId', '==', subjectId)
    .where('uid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(count)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt,
  }));
}

export async function getOrCreateChatAdmin(subjectId: string, uid: string): Promise<string> {
  const db = getAdminDb();

  const snapshot = await db
    .collection('chats')
    .where('subjectId', '==', subjectId)
    .where('uid', '==', uid)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  const docRef = await db.collection('chats').add({
    uid,
    subjectId,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
}

export async function getChatMessagesAdmin(chatId: string, count: number = 50) {
  const db = getAdminDb();

  const snapshot = await db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .limit(count)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt,
  }));
}

export async function addChatMessageAdmin(chatId: string, role: 'user' | 'assistant', content: string) {
  const db = getAdminDb();

  await db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .add({
      role,
      content,
      createdAt: Timestamp.now(),
    });
}

export async function createQuizAdmin(
  uid: string,
  subjectId: string,
  title: string,
  questions: QuizQuestion[]
) {
  const db = getAdminDb();

  const docRef = await db.collection('quizzes').add({
    uid,
    subjectId,
    title,
    questions,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
}
