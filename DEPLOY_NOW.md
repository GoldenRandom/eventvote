# 🚀 Deploy to Cloudflare Pages - Step by Step

## Your Repository is Ready!
✅ Repository: `https://github.com/GoldenRandom/eventvote.git`  
✅ Branch: `main`  
✅ All files uploaded

## Deployment Steps

### Step 1: Go to Cloudflare Dashboard

1. Open your browser
2. Go to: **https://dash.cloudflare.com**
3. Log in to your Cloudflare account
4. If you don't have an account, create one (it's free)

### Step 2: Navigate to Pages

1. In the left sidebar, click **"Workers & Pages"**
2. Click **"Pages"** (or "Create application" → "Pages")
3. Click **"Create a project"**

### Step 3: Connect Your GitHub Repository

1. Click **"Connect to Git"**
2. You'll see a list of Git providers
3. Click **"GitHub"** (or the provider you used)
4. **Authorize Cloudflare** to access your GitHub account
   - Click "Authorize Cloudflare"
   - You may need to enter your GitHub password
   - Approve the permissions

### Step 4: Select Your Repository

1. After authorization, you'll see a list of your repositories
2. Find and select: **`GoldenRandom/eventvote`**
3. Click **"Begin setup"**

### Step 5: Configure Build Settings

Fill in these settings:

- **Project name**: `star-voting-system` (or any name you like)
- **Production branch**: `main` (should be selected automatically)
- **Build command**: **LEAVE EMPTY** (no build needed)
- **Build output directory**: Type `public`
- **Root directory**: Leave as `/` (root)

**Important**: 
- ✅ Build command must be **EMPTY**
- ✅ Output directory must be exactly `public`

### Step 6: Configure D1 Database Binding ⚠️ CRITICAL!

**This is the most important step!**

1. Scroll down to the **"Functions"** section
2. Find **"D1 database bindings"**
3. Click **"Add binding"** or **"Add D1 database binding"**
4. Fill in:
   - **Variable name**: Type exactly `DB` (case-sensitive, must be uppercase DB)
   - **D1 database**: Click dropdown and select `voting-db`
5. Click **"Save"** or the checkmark

**⚠️ Warning**: If you skip this step, your API will fail with database errors!

### Step 7: Deploy!

1. Review your settings
2. Click **"Save and Deploy"** (or "Deploy site")
3. Wait for the deployment to complete (usually 1-2 minutes)
4. You'll see a success message with your deployment URL

### Step 8: Your Site is Live! 🎉

Your site will be available at:
- **Production URL**: `https://star-voting-system.pages.dev` (or similar)
- You can also add a custom domain later

## Visual Guide

```
Cloudflare Dashboard
  └── Workers & Pages
      └── Pages
          └── Create a project
              └── Connect to Git
                  └── Select: GoldenRandom/eventvote
                      └── Build Settings:
                          ├── Build command: (empty)
                          ├── Output directory: public
                          └── Functions:
                              └── D1 database bindings:
                                  └── Add: DB → voting-db
                                      └── Save and Deploy
```

## After Deployment

### Test Your Site

1. Visit your deployment URL
2. Test the home page
3. Try creating an event
4. Test uploading images
5. Test voting functionality

### Check for Errors

1. Go to your Pages project dashboard
2. Click on **"Functions"** tab
3. Check for any error messages
4. Check **"Deployments"** tab for build logs

## Troubleshooting

### Problem: "Database binding not found"
**Solution**: 
- Go to Settings → Functions → D1 database bindings
- Make sure `DB` binding exists and points to `voting-db`
- Redeploy

### Problem: "404 on /api/* routes"
**Solution**:
- Check that `functions/api/[[path]].js` exists in your repository
- Verify Functions are enabled in Pages settings
- Check Functions tab for errors

### Problem: "CORS errors"
**Solution**:
- Check that `functions/_middleware.js` exists
- Verify middleware is running (check Functions logs)

### Problem: "Build failed"
**Solution**:
- Make sure Build command is **EMPTY**
- Verify Output directory is exactly `public`
- Check deployment logs for specific errors

## Quick Checklist

Before deploying, make sure:
- [x] Repository is on GitHub ✅
- [x] All files are committed ✅
- [ ] Cloudflare account created
- [ ] Repository connected to Pages
- [ ] Build settings configured (empty command, `public` output)
- [ ] D1 binding configured (`DB` → `voting-db`)
- [ ] Deployed successfully

## Need Help?

If you encounter any issues:
1. Check the **Deployments** tab for error logs
2. Check the **Functions** tab for runtime errors
3. Verify D1 binding is configured correctly
4. Make sure all files are in the repository

## Your Deployment URL

After successful deployment, your site will be at:
```
https://[your-project-name].pages.dev
```

You can find this URL in:
- Pages dashboard → Your project → Deployments → Latest deployment

---

**Ready to deploy?** Follow the steps above and your voting system will be live in minutes! 🚀

