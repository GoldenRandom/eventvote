# ⚡ Quick Start - Upload Your Files

## Simple Answer: **Upload Everything Except node_modules**

The `.gitignore` file will automatically exclude files you don't need.

## Step-by-Step Upload Process

### 1. Check What Will Be Uploaded

Your `.gitignore` already excludes:
- ❌ `node_modules/` (not needed)
- ❌ `.wrangler/` (local cache)
- ❌ `.env` (sensitive files)

Everything else will be uploaded.

### 2. Upload via Git (Easiest Method)

```bash
# If Git is installed:
git init
git add .
git commit -m "Star Voting System"
git remote add origin <your-github-repo-url>
git push -u origin main
```

Then connect your GitHub repo to Cloudflare Pages.

### 3. Or Use Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Click "Create a project"
3. Choose "Upload assets" (if available)
4. Upload these folders:
   - `functions/`
   - `public/`
   - `src/`
   - `migrations/`
5. Upload these files:
   - `package.json`
   - `wrangler.toml`
   - `.gitignore`

**Skip**: `node_modules/` (don't upload this!)

## What Cloudflare Pages Needs

✅ **Required Files:**
- `functions/` - Your API code
- `public/` - Your website files
- `src/api-handler.js` - Shared API logic

✅ **Configuration:**
- `package.json` - Project info
- `wrangler.toml` - D1 database config

✅ **Optional but Good:**
- `migrations/` - Database schema
- `README.md` - Documentation

## After Upload

1. **Configure D1 Binding** in Cloudflare Pages:
   - Settings → Functions → D1 database bindings
   - Add: `DB` → `voting-db`

2. **Deploy!**

That's it! 🎉

