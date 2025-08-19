# 🚀 Environment Variables for Render.com Deployment

Copy and paste these environment variables into your Render.com dashboard:

## 📝 **Required Environment Variables**

### **Basic Configuration**
```
NODE_ENV=production
PORT=10000
```

### **Database Configuration (Supabase)**
```
SUPABASE_URL=postgresql://postgres:Nw4M-9VE-wXc*DA@db.hhbdzdzfdreyxqpjvijo.supabase.co:5432/postgres
```
**✅ READY**: This is your actual connection string with password included

### **AI Services Configuration**
```
OPENAI_API_KEY=your_openai_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
```
**⚠️ IMPORTANT**: Replace with your actual API keys

### **Security Configuration**
```
ACCESS_CODE=your_admin_password_here
SESSION_SECRET=your_random_session_secret_here
```
**⚠️ IMPORTANT**: Choose strong, unique values for security

### **Optional: Supabase API (for future features)**
```
SUPABASE_PROJECT_URL=https://hhbdzdzfdreyxqpjvijo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoYmR6ZHpmZHJleXhxcGp2aWpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1Njg3NDMsImV4cCI6MjA3MTE0NDc0M30.mQa32or6-js1c1UGFhq13fZR1pVJYoqYO36PXW6x-Zo
```

---

## 🔧 **How to Add to Render.com**

1. **Go to your Render.com dashboard**
2. **Select your MentorPro service**
3. **Click "Environment" in the sidebar**
4. **Click "Add Environment Variable"**
5. **Add each variable one by one:**
   - Key: `NODE_ENV` → Value: `production`
   - Key: `SUPABASE_URL` → Value: `postgresql://postgres:[YOUR-PASSWORD]@db.hhbdzdzfdreyxqpjvijo.supabase.co:5432/postgres`
   - Key: `OPENAI_API_KEY` → Value: `your_openai_api_key_here`
   - etc.

6. **Click "Save Changes"** (triggers automatic redeploy)

---

## 🔐 **Security Reminders**

- ✅ Never commit actual API keys to GitHub
- ✅ Use strong passwords for ACCESS_CODE and SESSION_SECRET
- ✅ Keep your Supabase database password secure
- ✅ Rotate API keys periodically for security

---

## 📊 **Verification After Deployment**

1. **Check health endpoint**: `https://your-app.onrender.com/health`
2. **Expected response**:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "openai": "configured",
     "environment": {
       "dbType": "postgres"
     }
   }
   ```

3. **Test question generation** to ensure everything works
4. **Verify persistence** by generating questions, waiting for app to sleep, and checking they're still there

---

## 🎯 **Complete Environment Variables Template**

For easy copy-paste, here's the complete set with placeholders:

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=postgresql://postgres:Nw4M-9VE-wXc*DA@db.hhbdzdzfdreyxqpjvijo.supabase.co:5432/postgres
OPENAI_API_KEY=your_openai_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
ACCESS_CODE=your_admin_password_here
SESSION_SECRET=your_random_session_secret_here
SUPABASE_PROJECT_URL=https://hhbdzdzfdreyxqpjvijo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoYmR6ZHpmZHJleXhxcGp2aWpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1Njg3NDMsImV4cCI6MjA3MTE0NDc0M30.mQa32or6-js1c1UGFhq13fZR1pVJYoqYO36PXW6x-Zo
```

**Remember to replace the placeholder values with your actual credentials!**
