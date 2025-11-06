# PowerShell Script to Upload to Git
# Run this script step by step, or copy commands to PowerShell

Write-Host "=== Git Upload Guide ===" -ForegroundColor Green
Write-Host ""

# Step 1: Check if Git is installed
Write-Host "Step 1: Checking if Git is installed..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✓ Git is installed: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Git is NOT installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Git first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://git-scm.com/download/win" -ForegroundColor Cyan
    Write-Host "2. Run the installer" -ForegroundColor Cyan
    Write-Host "3. Restart PowerShell" -ForegroundColor Cyan
    Write-Host "4. Run this script again" -ForegroundColor Cyan
    exit
}

Write-Host ""
Write-Host "Step 2: Initialize Git repository..." -ForegroundColor Yellow
Write-Host "Run: git init" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 3: Add all files..." -ForegroundColor Yellow
Write-Host "Run: git add ." -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 4: Check what will be uploaded..." -ForegroundColor Yellow
Write-Host "Run: git status" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 5: Create commit..." -ForegroundColor Yellow
Write-Host 'Run: git commit -m "Initial commit - Star Voting System"' -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 6: Add GitHub remote (replace with your URL)..." -ForegroundColor Yellow
Write-Host 'Run: git remote add origin https://github.com/yourusername/your-repo.git' -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 7: Push to GitHub..." -ForegroundColor Yellow
Write-Host "Run: git push -u origin main" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== Complete Command Sequence ===" -ForegroundColor Green
Write-Host ""
Write-Host "Copy and paste these commands one by one:" -ForegroundColor Yellow
Write-Host ""
Write-Host "git init" -ForegroundColor White
Write-Host "git add ." -ForegroundColor White
Write-Host "git status" -ForegroundColor White
Write-Host 'git commit -m "Initial commit - Star Voting System"' -ForegroundColor White
Write-Host 'git remote add origin https://github.com/yourusername/your-repo.git' -ForegroundColor White
Write-Host "git push -u origin main" -ForegroundColor White
Write-Host ""

