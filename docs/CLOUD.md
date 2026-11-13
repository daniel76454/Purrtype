# Publishing and cloud saves

Purrtype is a static site, so GitHub Pages can host it. Saves always live in the player's browser
(`localStorage`). Signing in with Google is optional: it backs progress up to Firebase, syncs it
between devices, and enables the per-level leaderboards.

Without a Firebase config the game works exactly the same, minus the sign-in button and leaderboards.

## 1. GitHub Pages

1. Push the repo to GitHub (default branch `main`).
2. In the repo, open **Settings → Pages**, and under **Build and deployment → Source**, choose **GitHub Actions**.
3. Every push to `main` now runs `.github/workflows/pages.yml`, which runs the tests, builds with `tsc`, and publishes `index.html`, `styles.css` and `dist/`.
   Each deploy puts the code in its own folder (`dist-<commit>/`) and writes `version.json`; a small loader in `index.html` reads it without caching, so browsers never mix files from two versions after an update.

The site will be at `https://<your-user>.github.io/<repo>/`.

## 2. Firebase (free Spark plan)

1. Go to <https://console.firebase.google.com>, choose **Add project**, and skip Google Analytics.
2. **Authentication → Get started → Sign-in method → Google**: enable it, pick a support email, and save.
3. **Authentication → Settings → Authorized domains**: add `<your-user>.github.io`. `localhost` is there by default for testing.
4. **Firestore Database → Create database**: pick a location, then **Start in production mode**.
5. **Firestore Database → Rules**: replace everything with the contents of [`firestore.rules`](../firestore.rules), then **Publish**.
6. **Project settings (gear) → Your apps → Web (`</>`)**: register an app (no hosting needed) and copy the `firebaseConfig` object.
7. Paste it into [`src/cloud/config.ts`](../src/cloud/config.ts):

   ```ts
   export const FIREBASE_CONFIG: FirebaseConfig | null = {
     apiKey: '…',
     authDomain: '<project>.firebaseapp.com',
     projectId: '<project>',
     appId: '…',
   };
   ```

   These values are not secrets. Access is controlled by the security rules, so they're safe to commit.
8. Build and push. A **Sign in with Google** button now appears at the top right of the menu.

## How syncing works

- **On sign-in:** the cloud save and this browser's save are merged (`src/core/merge.ts`):
  - the best stars, score and combo for each level;
  - every item bought on either device;
  - yarn, outfit and settings from whichever save changed most recently.
  - The audio offset never syncs, because it depends on each device's speakers or headphones.
- **While signed in:** every change is uploaded about 1.5 seconds after it happens.
- **Leaderboards:** finishing a level posts your score if it beats your previous best. Only a nickname the player chooses in Settings is shown (a random cozy one by default); nothing from the Google account is ever displayed or stored.

Firestore layout:

```
saves/{uid}                          { data: "<save JSON>", updatedAt }
leaderboards/{levelId}/scores/{uid}  { name, score, combo, at }
```

## Limits worth knowing

- **Cheating:** scores are reported by the browser. The rules reject impossible values, but a determined player could post a fake score within the limits. That's acceptable for a cozy game. You can delete an entry in the Firestore console.
- **Cost:** the free Spark plan includes 50k document reads and 20k writes per day, which is plenty for a hobby game.
