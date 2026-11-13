import { Emitter } from '../core/events.js';
import { mergeSaves, sameSave } from '../core/merge.js';
import { normalizeSave, store } from '../core/storage.js';
import type { SaveData } from '../core/types.js';
import { FIREBASE_CONFIG, FIREBASE_SDK } from './config.js';
import { cleanNickname, randomNickname } from '../core/names.js';

export type CloudStatus = 'off' | 'loading' | 'signed-out' | 'syncing' | 'synced' | 'error';

export interface ScoreEntry {
  uid: string;
  name: string;
  score: number;
  combo: number;
}

const PUSH_DELAY_MS = 1500;

/**
 * Optional Google sign-in, save sync and leaderboards on Firebase.
 *
 * Firestore layout (see firestore.rules):
 *   saves/{uid}                          { data: <SaveData as JSON>, updatedAt }
 *   leaderboards/{levelId}/scores/{uid}  { name, score, combo, at }
 *
 * The Firebase SDK is loaded from Google's CDN only when a config is present, so the game
 * runs fully offline/local without it.
 */
class Cloud extends Emitter<{ change: void }> {
  status: CloudStatus = FIREBASE_CONFIG ? 'loading' : 'off';
  /** Only the uid is kept; nothing else from the Google account is stored or shown. */
  user: { uid: string } | null = null;
  lastError = '';

  private fb: any = null; // { auth, db, authMod, fsMod }
  private pushTimer = 0;
  private applyingRemote = false;

  get enabled(): boolean {
    return FIREBASE_CONFIG !== null;
  }

  async init(): Promise<void> {
    if (!FIREBASE_CONFIG || this.fb) return;
    try {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK}`;
      const appUrl = `${base}/firebase-app.js`;
      const authUrl = `${base}/firebase-auth.js`;
      const fsUrl = `${base}/firebase-firestore.js`;
      const [appMod, authMod, fsMod] = await Promise.all([import(appUrl), import(authUrl), import(fsUrl)]);
      const app = appMod.initializeApp(FIREBASE_CONFIG);
      this.fb = { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
      authMod.onAuthStateChanged(this.fb.auth, (u: any) => void this.onAuth(u));
      store.on('change', () => this.schedulePush());
    } catch (e) {
      this.fail(e);
    }
  }

  async signIn(): Promise<void> {
    if (!this.fb) return;
    const { authMod, auth } = this.fb;
    try {
      await authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider());
    } catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') this.fail(e);
    }
  }

  async signOut(): Promise<void> {
    if (!this.fb) return;
    await this.flush();
    await this.fb.authMod.signOut(this.fb.auth);
  }

  /** The player's leaderboard nickname, picking a random one the first time. */
  get nickname(): string {
    let n = cleanNickname(store.data.settings.playerName);
    if (!n) {
      n = randomNickname();
      store.update((d) => (d.settings.playerName = n));
    }
    return n;
  }

  /** After a nickname change, update the name on every leaderboard entry this player has. */
  async renameEntries(): Promise<void> {
    if (!this.fb || !this.user) return;
    const { fsMod, db } = this.fb;
    const name = this.nickname;
    const ids = [...Object.keys(store.data.progress)];
    await Promise.all(
      ids.map(async (id) => {
        const ref = fsMod.doc(db, 'leaderboards', id, 'scores', this.user!.uid);
        try {
          const snap = await fsMod.getDoc(ref);
          if (!snap.exists() || snap.data().name === name) return;
          const d = snap.data();
          await fsMod.setDoc(ref, { name, score: d.score, combo: d.combo, at: fsMod.serverTimestamp() });
        } catch (e) {
          this.fail(e);
        }
      }),
    );
  }

  /** Post a score if it beats this player's best on the level. */
  async submitScore(levelId: string, score: number, combo: number): Promise<void> {
    if (!this.fb || !this.user || score <= 0) return;
    const { fsMod, db } = this.fb;
    const ref = fsMod.doc(db, 'leaderboards', levelId, 'scores', this.user.uid);
    try {
      const prev = await fsMod.getDoc(ref);
      if (prev.exists() && (prev.data().score ?? 0) >= score) return;
      await fsMod.setDoc(ref, { name: this.nickname, score: Math.round(score), combo: Math.round(combo), at: fsMod.serverTimestamp() });
    } catch (e) {
      this.fail(e);
    }
  }

  async topScores(levelId: string, n = 5): Promise<ScoreEntry[]> {
    if (!this.fb) return [];
    const { fsMod, db } = this.fb;
    try {
      const q = fsMod.query(fsMod.collection(db, 'leaderboards', levelId, 'scores'), fsMod.orderBy('score', 'desc'), fsMod.limit(n));
      const snap = await fsMod.getDocs(q);
      return snap.docs.map((d: any) => ({ uid: d.id, name: String(d.data().name ?? '?'), score: d.data().score ?? 0, combo: d.data().combo ?? 0 }));
    } catch (e) {
      this.fail(e);
      return [];
    }
  }

  // ---- sync ----------------------------------------------------------------
  private async onAuth(u: any): Promise<void> {
    if (!u) {
      this.user = null;
      this.set('signed-out');
      return;
    }
    this.user = { uid: u.uid };
    await this.pull();
    // entries posted before nicknames existed carried the Google first name: replace it
    void this.renameEntries();
  }

  /** Fetch the cloud save, merge it with this device's, and push the result back. */
  private async pull(): Promise<void> {
    if (!this.fb || !this.user) return;
    const { fsMod, db } = this.fb;
    this.set('syncing');
    try {
      const snap = await fsMod.getDoc(fsMod.doc(db, 'saves', this.user.uid));
      const local = store.data;
      if (snap.exists()) {
        const remote = normalizeSave(JSON.parse(snap.data().data));
        const merged = mergeSaves(local, remote);
        this.applyingRemote = true;
        if (!sameSave(merged, local)) store.replace(merged);
        this.applyingRemote = false;
        if (!sameSave(merged, remote)) await this.push();
      } else {
        await this.push();
      }
      this.set('synced');
    } catch (e) {
      this.applyingRemote = false;
      this.fail(e);
    }
  }

  private schedulePush(): void {
    if (!this.user || this.applyingRemote) return;
    clearTimeout(this.pushTimer);
    this.set('syncing');
    this.pushTimer = window.setTimeout(() => void this.flush(), PUSH_DELAY_MS);
  }

  private async flush(): Promise<void> {
    if (!this.pushTimer) return;
    clearTimeout(this.pushTimer);
    this.pushTimer = 0;
    try {
      await this.push();
      this.set('synced');
    } catch (e) {
      this.fail(e);
    }
  }

  private async push(): Promise<void> {
    if (!this.fb || !this.user) return;
    const { fsMod, db } = this.fb;
    const data = store.data;
    await fsMod.setDoc(fsMod.doc(db, 'saves', this.user.uid), { data: JSON.stringify(data), updatedAt: data.updatedAt });
  }

  private set(s: CloudStatus): void {
    this.status = s;
    this.emit('change');
  }

  private fail(e: unknown): void {
    this.lastError = e instanceof Error ? e.message : String(e);
    console.warn('[purrtype cloud]', e);
    this.set('error');
  }
}

export const cloud = new Cloud();
