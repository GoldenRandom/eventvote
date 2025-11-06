# ⚡ Quick Deploy Guide

## 5-Minute Deployment

### 1. Go to Cloudflare Pages
👉 **https://dash.cloudflare.com** → Workers & Pages → Pages → Create a project

### 2. Connect GitHub
- Click "Connect to Git"
- Authorize Cloudflare
- Select: **`GoldenRandom/eventvote`**

### 3. Build Settings
```
Build command: (EMPTY - leave blank)
Output directory: public
Root directory: /
```

### 4. D1 Database Binding ⚠️
- Scroll to **Functions** → **D1 database bindings**
- Click **Add binding**
- Variable name: `DB`
- Database: `voting-db`
- Save

### 5. Deploy
- Click **"Save and Deploy"**
- Wait 1-2 minutes
- Done! 🎉

## Your Site URL
After deployment: `https://[project-name].pages.dev`

## Verify It Works
1. Visit your site URL
2. Click "Admin Panel"
3. Create an event
4. Upload images
5. Test voting

---

**That's it!** Your voting system is now live on the internet! 🌐

