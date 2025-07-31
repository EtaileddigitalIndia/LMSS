#!/usr/bin/env node

/**
 * Netlify + Render Deployment Script
 * This script prepares your application for deployment to Netlify (frontend) and Render (backend)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🚀 Starting Netlify + Render deployment preparation...\n");

// Step 1: Run URL replacement
console.log("📝 Step 1: Replacing hardcoded URLs...");
try {
  execSync("node scripts/replace-urls.js", { stdio: "inherit" });
  console.log("✅ URL replacement completed\n");
} catch (error) {
  console.error("❌ URL replacement failed:", error.message);
  process.exit(1);
}

// Step 2: Generate deployment instructions
console.log("📋 Step 2: Generating deployment instructions...");

const deploymentGuide = `
# 🚀 Netlify + Render Deployment Guide

## 📋 Prerequisites
- GitHub repository with your code
- Netlify account
- Render account
- MongoDB Atlas database

## 🔧 Step 1: Deploy Backend to Render

### 1.1 Go to Render.com
- Visit [https://render.com](https://render.com)
- Sign up/login with your GitHub account

### 1.2 Create Web Service
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Configure the service:

**Basic Settings:**
- **Name**: \`global-lms-backend\`
- **Environment**: \`Node\`
- **Region**: Choose closest to your users
- **Branch**: \`main\` (or your default branch)
- **Build Command**: \`npm install\`
- **Start Command**: \`npm start\`
- **Plan**: Free

### 1.3 Environment Variables
Add these environment variables in Render:

\`\`\`env
NODE_ENV=production
PORT=10000
MONGODB_URI_PROD=mongodb+srv://iiecmintern2:mKaI1T3F5K3I95uu@cluster0.sidgh14.mongodb.net/global_lms
JWT_SECRET=acbfa4ffe8fa75af9eeb0564598052f230f3a74fdcaa83ede6187c44a4b9fb1f
JWT_EXPIRES_IN=7d
MAIL_USER=amancloud0201@gmail.com
MAIL_PASS=oarcihtolskdfurr
ADMIN_EMAIL=amancloud0201@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=amancloud0201@gmail.com
SMTP_PASS=oarcihtolskdfurr
SMTP_FROM=noreply@globallms.com
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,video/webm,application/pdf
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
\`\`\`

### 1.4 Deploy
- Click "Create Web Service"
- Wait for deployment to complete
- Note your backend URL: \`https://your-app-name.onrender.com\`

## 🌐 Step 2: Deploy Frontend to Netlify

### 2.1 Go to Netlify.com
- Visit [https://netlify.com](https://netlify.com)
- Sign up/login with your GitHub account

### 2.2 Create New Site
- Click "New site from Git"
- Connect your GitHub repository
- Configure the build settings:

**Build Settings:**
- **Base directory**: \`frontend\`
- **Build command**: \`npm run build\`
- **Publish directory**: \`dist/spa\`

### 2.3 Environment Variables
Add these environment variables in Netlify:

\`\`\`env
VITE_API_URL=https://YOUR_RENDER_BACKEND_URL.onrender.com
VITE_API_TIMEOUT=30000
VITE_APP_NAME=Global LMS
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_CERTIFICATES=true
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,video/webm,application/pdf
VITE_JWT_STORAGE_KEY=token
VITE_USER_STORAGE_KEY=user
VITE_DEFAULT_PAGE_SIZE=10
VITE_MAX_PAGE_SIZE=100
VITE_THEME=light
VITE_LANGUAGE=en
\`\`\`

**Important**: Replace \`YOUR_RENDER_BACKEND_URL\` with your actual Render backend URL.

### 2.4 Deploy
- Click "Deploy site"
- Wait for deployment to complete
- Your site will be available at: \`https://your-site-name.netlify.app\`

## 🔗 Step 3: Update Backend CORS

After getting your Netlify URL, update the \`FRONTEND_URL\` environment variable in Render:

\`\`\`env
FRONTEND_URL=https://your-site-name.netlify.app
\`\`\`

## ✅ Step 4: Test Your Application

1. **Test Backend API:**
   \`\`\`bash
   curl https://your-backend.onrender.com/health
   curl https://your-backend.onrender.com/api/courses
   \`\`\`

2. **Test Frontend:**
   - Visit your Netlify URL
   - Try logging in
   - Test course creation and other features

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Ensure \`FRONTEND_URL\` is set correctly in Render
   - Check that the URL matches exactly (including https://)

2. **Build Failures**
   - Check build logs in Netlify/Render
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

3. **API Connection Issues**
   - Verify \`VITE_API_URL\` is set correctly in Netlify
   - Check that backend is accessible
   - Test API endpoints directly

4. **Environment Variables**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify variable values are correct

## 📞 Support

If you encounter issues:
1. Check deployment logs in both platforms
2. Verify environment variables are set correctly
3. Test API endpoints individually
4. Check browser console for errors
5. Review the centralized URL configuration

## 🔗 Useful URLs

- **Render Dashboard**: https://dashboard.render.com
- **Netlify Dashboard**: https://app.netlify.com
- **MongoDB Atlas**: https://cloud.mongodb.com

---

**Note**: Always test your deployment thoroughly before going live!
`;

// Write deployment guide
const guidePath = path.join(__dirname, "..", "NETLIFY_RENDER_DEPLOYMENT.md");
fs.writeFileSync(guidePath, deploymentGuide);
console.log("✅ Deployment guide saved to NETLIFY_RENDER_DEPLOYMENT.md");

// Step 3: Create environment variable templates
console.log("\n📝 Step 3: Creating environment variable templates...");

const renderEnvTemplate = `# Render Environment Variables Template
# Copy these to your Render environment variables

NODE_ENV=production
PORT=10000
MONGODB_URI_PROD=mongodb+srv://iiecmintern2:mKaI1T3F5K3I95uu@cluster0.sidgh14.mongodb.net/global_lms
JWT_SECRET=acbfa4ffe8fa75af9eeb0564598052f230f3a74fdcaa83ede6187c44a4b9fb1f
JWT_EXPIRES_IN=7d
MAIL_USER=amancloud0201@gmail.com
MAIL_PASS=oarcihtolskdfurr
ADMIN_EMAIL=amancloud0201@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=amancloud0201@gmail.com
SMTP_PASS=oarcihtolskdfurr
SMTP_FROM=noreply@globallms.com
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,video/webm,application/pdf
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
FRONTEND_URL=https://YOUR_NETLIFY_URL.netlify.app
`;

const netlifyEnvTemplate = `# Netlify Environment Variables Template
# Copy these to your Netlify environment variables
# Replace YOUR_RENDER_BACKEND_URL with your actual Render backend URL

VITE_API_URL=https://YOUR_RENDER_BACKEND_URL.onrender.com
VITE_API_TIMEOUT=30000
VITE_APP_NAME=Global LMS
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_CERTIFICATES=true
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,video/webm,application/pdf
VITE_JWT_STORAGE_KEY=token
VITE_USER_STORAGE_KEY=user
VITE_DEFAULT_PAGE_SIZE=10
VITE_MAX_PAGE_SIZE=100
VITE_THEME=light
VITE_LANGUAGE=en
`;

// Write templates
fs.writeFileSync(
  path.join(__dirname, "..", "RENDER_ENV_TEMPLATE.env"),
  renderEnvTemplate
);
fs.writeFileSync(
  path.join(__dirname, "..", "NETLIFY_ENV_TEMPLATE.env"),
  netlifyEnvTemplate
);

console.log("✅ Environment variable templates created:");
console.log("   - RENDER_ENV_TEMPLATE.env");
console.log("   - NETLIFY_ENV_TEMPLATE.env");

// Step 4: Test build
console.log("\n🔨 Step 4: Testing frontend build...");
try {
  process.chdir(path.join(__dirname, "..", "frontend"));
  execSync("npm run build", { stdio: "pipe" });
  console.log("✅ Frontend build test passed");
  process.chdir(path.join(__dirname, ".."));
} catch (error) {
  console.error("❌ Frontend build failed:", error.message);
  process.exit(1);
}

console.log("\n🎉 Netlify + Render deployment preparation completed!");
console.log("\n📋 Next steps:");
console.log("1. Follow the guide in NETLIFY_RENDER_DEPLOYMENT.md");
console.log("2. Deploy backend to Render first");
console.log("3. Deploy frontend to Netlify");
console.log("4. Update environment variables with actual URLs");
console.log("5. Test your application");

console.log("\n🔗 Useful files:");
console.log("- NETLIFY_RENDER_DEPLOYMENT.md - Complete deployment guide");
console.log("- RENDER_ENV_TEMPLATE.env - Backend environment variables");
console.log("- NETLIFY_ENV_TEMPLATE.env - Frontend environment variables");
console.log("- render.yaml - Render configuration");
console.log("- frontend/netlify.toml - Netlify configuration");
