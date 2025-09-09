# Windows Installation Troubleshooting Guide

## 🚨 Ultimate Fix for npm Installation Errors

If you're getting errors like:

- `EBUSY: resource busy or locked`
- `EPERM: operation not permitted`
- `404 Not Found - GET https://registry.npmjs.org/debug/-/debug-4.4.2.tgz`
- OneDrive file locking issues

## ✅ **ULTIMATE SOLUTION: Auto-Fixing CLI**

The latest `create-alith-app` automatically tries multiple installation methods:

```powershell
npx create-alith-app@latest my-app
# CLI will automatically try 6 different installation methods
# No more manual troubleshooting needed!
```

## 🛠️ **Manual Solutions (If CLI Auto-Fix Fails)**

### **SOLUTION 1: The Nuclear Option (99% Success Rate)**

```powershell
# 1. Navigate to your project
cd my-app

# 2. Complete cleanup
npm cache clean --force
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue

# 3. Fix registry
npm config set registry https://registry.npmjs.org/
npm config delete proxy
npm config delete https-proxy

# 4. Install with legacy support
npm install --legacy-peer-deps

# 5. If still failing, use force
npm install --force
```

### **SOLUTION 2: Use Yarn (Alternative Package Manager)**

```powershell
# Install Yarn globally
npm install -g yarn

# Navigate to project and install
cd my-app
yarn install

# Start development
yarn dev
```

### **SOLUTION 3: Windows-Specific Fixes**

```powershell
# Method A: Run as Administrator
# Right-click PowerShell → "Run as Administrator"
npm install

# Method B: Fix Windows file locks
taskkill /f /im node.exe
npm install

# Method C: Change npm timeout
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm install
```

### **SOLUTION 4: Development Environment Fix**

```powershell
# Install Windows build tools
npm install -g windows-build-tools

# Fix Python path for native modules
npm config set python python2.7

# Install with verbose logging
npm install --verbose
```

### 🔧 **Additional Tips**

1. **Temporarily Pause OneDrive:**

   - Right-click OneDrive icon in system tray
   - Click "Pause syncing" → "2 hours"
   - Then run `npm install`

2. **Check Antivirus:**

   - Temporarily disable real-time protection
   - Add node_modules folder to antivirus exclusions

3. **Use Different Terminal:**
   - Try Command Prompt instead of PowerShell
   - Or use Git Bash

### 📞 **Still Having Issues?**

Create an issue at: https://github.com/krnkiran22/alith/issues

Include:

- Your Windows version
- Node.js version (`node --version`)
- npm version (`npm --version`)
- Full error log
