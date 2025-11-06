# 🚀 Cloudflare Pages Deployment Guide

## Quick Start

### 1. Prepare Your Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Ready for Cloudflare Pages deployment"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy to Cloudflare Pages

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com
   - Navigate to **Workers & Pages** → **Pages**
   - Click **"Create a project"**

2. **Connect Your Repository**
   - Click **"Connect to Git"**
   - Authorize Cloudflare to access your repository
   - Select your repository and branch (usually `main`)

3. **Configure Build Settings**
   - **Project name**: `star-voting-system` (or your choice)
   - **Production branch**: `main`
   - **Build command**: (leave **EMPTY** - no build needed)
   - **Build output directory**: `public`
   - **Root directory**: `/` (root)

4. **Configure D1 Database Binding** ⚠️ **MOST IMPORTANT STEP**
   
   **Before deploying**, you MUST configure the D1 binding:
   
   - In the build settings, scroll down to **"Functions"** section
   - Find **"D1 database bindings"**
   - Click **"Add binding"**
   - **Variable name**: Type exactly `DB` (case-sensitive, must match)
   - **D1 database**: Select `voting-db` from the dropdown
   - Click **"Save"**

   > ⚠️ **Warning**: If you skip this step, your API will fail with database errors!

5. **Deploy**
   - Click **"Save and Deploy"**
   - Wait for the build to complete
   - Your site will be live at `https://your-project.pages.dev`

## Project Structure

```
VOTE/
├── functions/              # Cloudflare Pages Functions (API)
│   ├── api/
│   │   └── [[path]].js     # Handles all /api/* routes
│   └── _middleware.js      # CORS and request middleware
├── public/                 # Static files (served directly)
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── _redirects          # SPA routing rules
├── src/                    # Shared code
│   └── api-handler.js      # API business logic
├── migrations/             # Database migrations
│   └── 0001_initial.sql
└── package.json
```

## How It Works

1. **Static Files**: Files in `public/` are served directly by Cloudflare Pages
2. **API Routes**: Requests to `/api/*` are handled by `functions/api/[[path]].js`
3. **Database**: D1 database is accessed via `env.DB` binding
4. **CORS**: Handled automatically by `functions/_middleware.js`

## Local Development

Test locally before deploying:

```bash
# Install dependencies
npm install

# Run local Pages dev server with D1
npm run dev

# Or with explicit D1 binding
npx wrangler pages dev public --d1=DB=voting-db
```

The app will be available at `http://localhost:8788`

## API Endpoints

Once deployed, these endpoints will be available:

- `POST /api/events` - Create a new event
- `GET /api/events/:id` - Get event with images and stats
- `GET /api/events/qr/:qrCode` - Get event by QR code
- `PUT /api/events/:id/status` - Update event status
- `POST /api/images` - Upload image (multipart/form-data)
- `POST /api/votes` - Submit a vote
- `GET /api/images/:id/votes` - Get votes for an image

## Troubleshooting

### Database Binding Not Working

**Symptoms**: API returns errors about database not found

**Solution**:
1. Go to Pages project → Settings → Functions
2. Check D1 database bindings
3. Ensure variable name is exactly `DB` (not `db` or `database`)
4. Ensure `voting-db` database is selected
5. Redeploy

### Functions Not Executing

**Symptoms**: 404 errors on `/api/*` routes

**Solution**:
1. Check that `functions/api/[[path]].js` exists
2. Verify file structure matches exactly
3. Check Functions tab in Pages dashboard for errors
4. Ensure import paths are correct

### CORS Errors

**Symptoms**: Browser console shows CORS errors

**Solution**:
- Middleware should handle this automatically
- Check that `functions/_middleware.js` exists
- Verify CORS headers are being set

### Import Errors

**Symptoms**: Functions fail with module not found

**Solution**:
- Ensure `src/api-handler.js` exists
- Check import path in `functions/api/[[path]].js` is correct: `../../src/api-handler.js`
- All files must be committed to git

## Environment Variables

If you need environment variables:

1. Go to Pages project → Settings → Environment variables
2. Add variables for production, preview, or both
3. Access via `env.VARIABLE_NAME` in functions

## Custom Domain

To add a custom domain:

1. Go to Pages project → Custom domains
2. Click "Set up a custom domain"
3. Follow the DNS configuration instructions

## Monitoring

- **Analytics**: View in Pages dashboard → Analytics
- **Functions Logs**: View in Pages dashboard → Functions tab
- **D1 Queries**: Monitor in D1 dashboard

## Next Steps

After deployment:

1. ✅ Test creating an event
2. ✅ Test uploading images
3. ✅ Test voting functionality
4. ✅ Test QR code scanning
5. ✅ Monitor for any errors

Your voting system is now live! 🎉

