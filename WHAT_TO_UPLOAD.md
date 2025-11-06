# 📦 What Files to Upload to Cloudflare Pages

## ✅ Files You MUST Include (Upload These)

### Core Application Files
- ✅ `functions/` - **ENTIRE directory** (API routes)
  - `functions/_middleware.js`
  - `functions/api/[[path]].js`
- ✅ `public/` - **ENTIRE directory** (static files)
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `public/_redirects`
- ✅ `src/` - **ENTIRE directory** (shared code)
  - `src/api-handler.js`
  - `src/index.js` (optional, but good to include)
- ✅ `migrations/` - **ENTIRE directory** (database schema)
  - `migrations/0001_initial.sql`
- ✅ `package.json` - Dependencies list
- ✅ `wrangler.toml` - D1 database configuration
- ✅ `README.md` - Documentation (optional but recommended)

### Documentation Files (Optional but Recommended)
- ✅ `DEPLOY.md`
- ✅ `DEPLOYMENT_CHECKLIST.md`
- ✅ `D1_SETUP.md`

## ❌ Files You MUST NOT Upload (Excluded by .gitignore)

- ❌ `node_modules/` - **NEVER upload** (will be ignored)
- ❌ `.wrangler/` - Local build cache (will be ignored)
- ❌ `.env` - Environment variables (will be ignored)
- ❌ `*.log` - Log files (will be ignored)
- ❌ `.DS_Store` - macOS system files (will be ignored)

## 📋 Complete File List to Upload

When you push to Git, these files will be included:

```
VOTE/
├── functions/                    ✅ UPLOAD
│   ├── _middleware.js
│   └── api/
│       └── [[path]].js
├── public/                       ✅ UPLOAD
│   ├── _redirects
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── src/                         ✅ UPLOAD
│   ├── api-handler.js
│   └── index.js
├── migrations/                  ✅ UPLOAD
│   └── 0001_initial.sql
├── .gitignore                   ✅ UPLOAD (important!)
├── package.json                 ✅ UPLOAD
├── wrangler.toml                ✅ UPLOAD
└── README.md                    ✅ UPLOAD (optional)
```

## 🚀 How to Upload (Git Method - Recommended)

### Option 1: Using Git (Recommended)

1. **Initialize Git** (if not already done):
   ```bash
   git init
   ```

2. **Add all files** (`.gitignore` will automatically exclude unwanted files):
   ```bash
   git add .
   ```

3. **Commit**:
   ```bash
   git commit -m "Initial commit - Star Voting System"
   ```

4. **Push to GitHub/GitLab**:
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

5. **Connect to Cloudflare Pages**:
   - Go to Cloudflare Dashboard → Pages
   - Connect your Git repository
   - Cloudflare will automatically deploy from your repo

### Option 2: Direct Upload (Alternative)

If you don't want to use Git, you can use Wrangler CLI:

```bash
npm run deploy
```

This will upload your `public/` directory directly to Cloudflare Pages.

**Note**: Direct upload via CLI only uploads the `public/` folder. For full functionality with Functions, you need to use Git.

## ⚠️ Important Notes

1. **`.gitignore` is your friend** - It automatically excludes:
   - `node_modules/` (too large, not needed)
   - `.wrangler/` (local cache)
   - `.env` (sensitive data)

2. **You DON'T need to upload**:
   - `node_modules/` - Cloudflare Pages doesn't need this
   - Build artifacts - No build step needed
   - Local development files

3. **You DO need to upload**:
   - All source code (`functions/`, `src/`, `public/`)
   - Configuration files (`package.json`, `wrangler.toml`)
   - Database migrations

## ✅ Quick Checklist

Before pushing to Git, verify:

- [ ] `functions/` directory exists with API routes
- [ ] `public/` directory has all frontend files
- [ ] `src/api-handler.js` exists
- [ ] `migrations/0001_initial.sql` exists
- [ ] `.gitignore` is present
- [ ] `package.json` is present
- [ ] `wrangler.toml` has your database ID

## 🎯 Summary

**Upload everything EXCEPT what's in `.gitignore`**

The `.gitignore` file will automatically exclude:
- `node_modules/`
- `.wrangler/`
- `.env`
- Log files

Everything else should be committed and pushed to your Git repository, which Cloudflare Pages will then deploy automatically.

