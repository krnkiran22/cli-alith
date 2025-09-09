# Quick Fix for Your Friend

## The Problem

Your friend is experiencing common Windows npm issues:

- File locking (EBUSY/EPERM errors)
- Registry corruption (404 errors)
- Permission problems

## The Solution

### Option 1: Use Latest CLI (RECOMMENDED)

```powershell
# Delete the problematic project
Remove-Item my-app -Recurse -Force

# Use the new bulletproof CLI
npx create-alith-app@latest my-app

# The CLI will automatically try 6 different installation methods
# It handles all the errors automatically!
```

### Option 2: Fix Current Project

```powershell
cd my-app

# Nuclear reset
npm cache clean --force
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue

# Fix registry
npm config set registry https://registry.npmjs.org/

# Install with legacy support
npm install --legacy-peer-deps
```

### Option 3: Use Yarn Instead

```powershell
npm install -g yarn
cd my-app
yarn install
```

## Why This Happens

- Windows file locking
- npm registry issues
- Antivirus interference
- Corporate firewall/proxy

## The New CLI Fixes Everything

Version 1.3.0 automatically:

1. Tries standard install
2. Clears cache and retries
3. Resets registry and retries
4. Uses npm ci
5. Uses legacy peer deps
6. Forces installation

**Tell your friend to use: `npx create-alith-app@latest my-app`**
