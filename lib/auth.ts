'use client';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from 'firebase/auth';
import { auth, db } from './firebaseClient';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Update display name
  await setDoc(doc(db, 'users', user.uid), {
    displayName,
    email: user.email,
    createdAt: Timestamp.now(),
  }, { merge: true });
  
  return userCredential;
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  
  // Create user document if it doesn't exist
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', user.uid), {
      displayName: user.displayName || user.email,
      email: user.email,
      createdAt: Timestamp.now(),
    });
  }
  
  return result;
}

export async function logout() {
  return signOut(auth);
}
