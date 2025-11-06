# ✅ Cloudflare Pages Deployment Checklist

## Pre-Deployment

- [x] Database created (`voting-db`)
- [x] Migrations applied (local and remote)
- [x] Project structure configured for Pages
- [x] Functions directory set up correctly
- [x] Static files in `public/` directory
- [x] CORS middleware configured

## Deployment Steps

### 1. Git Repository
- [ ] Initialize git repository
- [ ] Add all files
- [ ] Commit changes
- [ ] Push to GitHub/GitLab

### 2. Cloudflare Pages Setup
- [ ] Go to Cloudflare Dashboard → Pages
- [ ] Create new project
- [ ] Connect Git repository
- [ ] Select branch (usually `main`)

### 3. Build Configuration
- [ ] Build command: **(leave EMPTY)**
- [ ] Build output directory: `public`
- [ ] Root directory: `/` (root)

### 4. D1 Database Binding ⚠️ CRITICAL
- [ ] Go to Settings → Functions
- [ ] Scroll to "D1 database bindings"
- [ ] Click "Add binding"
- [ ] Variable name: `DB` (exactly, case-sensitive)
- [ ] D1 database: Select `voting-db`
- [ ] Click "Save"

### 5. Deploy
- [ ] Click "Save and Deploy"
- [ ] Wait for build to complete
- [ ] Note your deployment URL

## Post-Deployment Testing

### API Endpoints
- [ ] `POST /api/events` - Create event
- [ ] `GET /api/events/:id` - Get event
- [ ] `GET /api/events/qr/:qrCode` - Get by QR code
- [ ] `POST /api/images` - Upload image
- [ ] `POST /api/votes` - Submit vote

### Frontend
- [ ] Home page loads
- [ ] Admin panel accessible
- [ ] Can create events
- [ ] Can upload images
- [ ] QR codes display correctly
- [ ] Voting interface works
- [ ] Star ratings submit successfully

## Troubleshooting

If something doesn't work:

1. **Check Functions Logs**
   - Pages dashboard → Functions tab
   - Look for error messages

2. **Verify D1 Binding**
   - Settings → Functions → D1 database bindings
   - Ensure `DB` binding exists and points to `voting-db`

3. **Check Build Logs**
   - Pages dashboard → Deployments
   - Click on deployment to see logs

4. **Test API Directly**
   - Use browser DevTools → Network tab
   - Or use curl/Postman to test endpoints

## Files Structure (Should Match)

```
VOTE/
├── functions/
│   ├── _middleware.js          ✅ CORS middleware
│   └── api/
│       └── [[path]].js          ✅ API routes handler
├── public/
│   ├── index.html              ✅ Main HTML
│   ├── app.js                  ✅ Frontend JS
│   ├── styles.css              ✅ Styles
│   └── _redirects              ✅ SPA routing
├── src/
│   └── api-handler.js          ✅ API logic
├── migrations/
│   └── 0001_initial.sql        ✅ Database schema
├── package.json                ✅ Dependencies
└── wrangler.toml               ✅ D1 config
```

## Quick Commands

```bash
# Local development
npm run dev

# Check database
npm run db:execute:local -- --command "SELECT COUNT(*) FROM events;"

# Deploy via CLI (alternative to dashboard)
npm run deploy
```

## Success Indicators

✅ Deployment URL is accessible  
✅ Home page loads without errors  
✅ Can create events via API  
✅ Database queries work  
✅ No CORS errors in console  
✅ Functions execute without errors  

---

**Your deployment URL will be**: `https://your-project.pages.dev`

