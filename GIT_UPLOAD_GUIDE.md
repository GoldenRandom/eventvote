# 📤 Git Upload Guide for PowerShell

## Step-by-Step Commands

### 1. Check if Git is Installed

```powershell
git --version
```

If you see an error, install Git from: https://git-scm.com/download/win

### 2. Initialize Git Repository

```powershell
git init
```

This creates a `.git` folder in your project.

### 3. Add All Files

```powershell
git add .
```

This adds all files (`.gitignore` will automatically exclude `node_modules/`, etc.)

### 4. Check What Will Be Committed

```powershell
git status
```

This shows you which files will be uploaded.

### 5. Create Your First Commit

```powershell
git commit -m "Initial commit - Star Voting System"
```

### 6. Create a GitHub Repository (if you don't have one)

1. Go to https://github.com
2. Click "+" → "New repository"
3. Name it: `star-voting-system` (or any name)
4. **Don't** initialize with README
5. Click "Create repository"
6. Copy the repository URL (e.g., `https://github.com/yourusername/star-voting-system.git`)

### 7. Connect to Remote Repository

Replace `<your-repo-url>` with your actual GitHub repository URL:

```powershell
git remote add origin https://github.com/yourusername/star-voting-system.git
```

### 8. Push to GitHub

```powershell
git push -u origin main
```

If you get an error about branch name, try:

```powershell
git push -u origin master
```

Or rename your branch:

```powershell
git branch -M main
git push -u origin main
```

## Complete Command Sequence (Copy & Paste)

```powershell
# 1. Initialize
git init

# 2. Add all files
git add .

# 3. Check status
git status

# 4. Commit
git commit -m "Initial commit - Star Voting System"

# 5. Add remote (replace with your URL)
git remote add origin https://github.com/yourusername/star-voting-system.git

# 6. Push
git push -u origin main
```

## Authentication

If you're asked for credentials:

### Option 1: Personal Access Token (Recommended)
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo` (full control)
4. Copy the token
5. Use token as password when pushing

### Option 2: GitHub CLI
```powershell
# Install GitHub CLI
winget install GitHub.cli

# Authenticate
gh auth login
```

## Troubleshooting

### Error: "fatal: not a git repository"
**Solution**: Make sure you're in the project folder:
```powershell
cd C:\Users\Anass\Documents\VOTE
git init
```

### Error: "remote origin already exists"
**Solution**: Remove and re-add:
```powershell
git remote remove origin
git remote add origin https://github.com/yourusername/star-voting-system.git
```

### Error: "failed to push some refs"
**Solution**: Pull first, then push:
```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### Error: "branch 'main' does not exist"
**Solution**: Create and switch to main:
```powershell
git branch -M main
git push -u origin main
```

## Verify Upload

After pushing, check GitHub:
1. Go to your repository on GitHub
2. You should see all your files
3. Files in `.gitignore` (like `node_modules/`) should NOT appear

## Next Steps After Upload

1. **Go to Cloudflare Pages**
2. **Connect your GitHub repository**
3. **Configure D1 binding** (Settings → Functions → D1 database bindings)
4. **Deploy!**

## Updating Files Later

When you make changes:

```powershell
# Add changed files
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push
```

That's it! Your changes will automatically deploy to Cloudflare Pages.

