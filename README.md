# CodeSync — LeetCode to GitHub

**CodeSync** is a Manifest V3 Chrome Extension and companion Next.js platform that automatically synchronizes verified `Accepted` LeetCode submissions directly to your GitHub repository in clean, single atomic commits.

---

## Key Features

- **Strict Accepted-Only Gate**: Non-accepted verdicts (`Wrong Answer`, `TLE`, `MLE`, `Runtime Error`, `Compile Error`) are filtered out at interception time and never pushed to GitHub.
- **Single Atomic Commits**: Uses GitHub's Git Data API (`Blobs` -> `Tree` -> `Commit` -> `Ref Update`) to push both your formatted solution file and generated `README.md` in one clean commit.
- **Rich Problem `README.md`**: Automatically converts LeetCode HTML descriptions into GitHub-flavored Markdown with difficulty shields, topic tags, and runtime/memory percentile benchmarks.
- **Syntax-Aware Solution Headers**: Prepends metadata comment blocks (`#` for Python/Ruby, `--` for SQL, `/* ... */` for C++/Java/JS/TS/Go/Rust) with de-duplication on re-sync.
- **Interactive Repository & Branch Management**: Browse repositories, verify write access, select target branches, or create a brand-new repository directly inside the extension.
- **Overwrite & Deduplication Policies**: Choose between `Always Overwrite`, `Overwrite Only if Improved` (compares runtime), or `Never Overwrite`.
- **Audit Log & Retry Engine**: Inspect past syncs, view failure diagnostics, export logs to JSON, and retry failed commits with one click.

---

## Monorepo Architecture

```
├── apps/
│   ├── extension/     # Chrome Extension (Manifest V3, React 19, Vite, CRXJS, Tailwind v4)
│   └── web/           # Companion Next.js 16 Platform & Better Auth GitHub OAuth Exchange
└── packages/
    └── shared/        # Shared TypeScript models, language mappings, & code/README formatters
```

---

## Local Development

### Prerequisites
- **Node.js** 20+
- **pnpm** 10+

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
- **`apps/web/.env.local`**:
  ```env
  GITHUB_CLIENT_ID=your_github_oauth_client_id
  GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
  BETTER_AUTH_SECRET=your_random_32_byte_secret
  BETTER_AUTH_URL=http://localhost:3000
  ```
- **`apps/extension/.env.local`**:
  ```env
  VITE_GITHUB_CLIENT_ID=your_github_oauth_client_id
  VITE_BACKEND_URL=http://localhost:3000
  ```

### 3. Build & Test
```bash
# Run all unit tests
pnpm run test

# Typecheck across the entire monorepo
pnpm run typecheck

# Build Chrome Extension into apps/extension/dist
pnpm --filter @leetsync/extension build

# Package Chrome Web Store zip (apps/extension/codesync-extension.zip)
pnpm --filter @leetsync/extension package:zip
```

### 4. Load in Chrome
1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select `apps/extension/dist`.

---

## Deploying the OAuth Backend (`apps/web`) to Production

To allow users to sign in with GitHub without running a local server:

1. **Deploy `apps/web` to Vercel**:
   - Set **Root Directory** to `apps/web`.
   - Set **Build Command** to `pnpm --filter web build` (or run from monorepo root).
   - Add Environment Variables in Vercel:
     - `GITHUB_CLIENT_ID`
     - `GITHUB_CLIENT_SECRET`
     - `BETTER_AUTH_SECRET`
     - `BETTER_AUTH_URL` = `https://<your-vercel-domain>`
2. **Update GitHub OAuth App**:
   - In GitHub Developer Settings $\rightarrow$ OAuth Apps, set **Authorization callback URL** to:
     `https://<your-vercel-domain>/api/auth/callback/github`
3. **Build Extension for Production**:
   - Update `apps/extension/.env.local` with `VITE_BACKEND_URL=https://<your-vercel-domain>`.
   - Run `pnpm --filter @leetsync/extension package:zip`.

---

## Privacy

CodeSync stores all GitHub access tokens, repository selections, and sync logs strictly on your local device via `chrome.storage.local`. See [PRIVACY.md](./PRIVACY.md) for full details.
