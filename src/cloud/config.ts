/**
 * Firebase project settings for cloud saves and leaderboards.
 *
 * Leave this as `null` to play without the cloud (saves stay in this browser).
 * To turn it on, follow docs/CLOUD.md and paste the `firebaseConfig` object from
 * Firebase console → Project settings → Your apps → Web app.
 *
 * These values are not secrets: they identify the project, and access is controlled by the
 * security rules in firestore.rules. It is safe to commit them to a public repo.
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export const FIREBASE_CONFIG: FirebaseConfig | null = {
  apiKey: 'AIzaSyAgWsjqk6tQWuJLf26ILZqkahMYTuzFuSI',
  authDomain: 'purrtype-669f7.firebaseapp.com',
  projectId: 'purrtype-669f7',
  storageBucket: 'purrtype-669f7.firebasestorage.app',
  messagingSenderId: '664274781250',
  appId: '1:664274781250:web:bd7c7a8c57ff8c2f2b19db',
};

/** Firebase JS SDK version loaded from Google's CDN (no bundler needed). */
export const FIREBASE_SDK = '10.12.2';
