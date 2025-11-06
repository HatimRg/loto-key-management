# Quick Release Guide

## 🚀 **Release New Version (Step-by-Step)**

### **Before First Release Only:**

```bash
# 1. Create GitHub repo (one-time)
https://github.com/new

# 2. Get GitHub token (one-time)
https://github.com/settings/tokens
# Select: repo scope
# Copy token

# 3. Set token permanently (one-time)
Win+R → sysdm.cpl → Advanced → Environment Variables
Variable: GH_TOKEN
Value: ghp_your_token_here

# 4. Update package.json (one-time)
"publish": [{
  "owner": "YOUR_GITHUB_USERNAME"  ← Change this!
}]
```

---

## 📦 **Every Release:**

### **1. Update Version**
```json
// package.json
"version": "1.7.0"  // Increment this
```

### **2. Commit Changes**
```bash
git add .
git commit -m "Release v1.7.0"
git push
```

### **3. Build & Publish**
```bash
npm run release
```

### **4. Wait & Verify**
- Wait for build to complete (5-10 minutes)
- Check GitHub: `https://github.com/YOUR_USERNAME/loto-key-management/releases`
- Verify installer uploaded

---

## ✅ **That's It!**

Users will automatically see:
```
🔔 Update Available!
Version 1.7.0 is available
[Download Update]
```

---

## 🐛 **Quick Fixes**

### **Token Error:**
```bash
set GH_TOKEN=your_token
npm run release
```

### **Build Failed:**
```bash
npm run build
# Check for errors
npm run dist
```

### **Wrong Username:**
```json
// package.json → publish → owner
"owner": "your_actual_username"
```

---

## 📋 **Version Guidelines**

```
Bug fix:       1.6.9 → 1.6.10
New feature:   1.6.10 → 1.7.0
Major change:  1.7.0 → 2.0.0
```

---

## 🎯 **Release Checklist**

```
□ Version updated in package.json
□ Code tested locally
□ Changes committed & pushed
□ GH_TOKEN set
□ Run: npm run release
□ Verify GitHub release
□ Test update on another machine
```

---

**That's all you need to remember!** 🎉
