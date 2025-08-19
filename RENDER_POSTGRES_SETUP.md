# 🐘 Render.com PostgreSQL Database Setup

Since Supabase is having IPv6 connectivity issues on Render.com, let's use Render.com's managed PostgreSQL instead.

## 🔧 **Step 1: Create PostgreSQL Database on Render.com**

1. **Go to your Render.com dashboard**
2. **Click "New +"**
3. **Select "PostgreSQL"**
4. **Configure:**
   - **Name**: `mentorpro-database`
   - **Database**: `mentorpro`
   - **User**: `mentorpro_user`
   - **Region**: Same as your web service
   - **PostgreSQL Version**: 15 (recommended)
   - **Plan**: Free

5. **Click "Create Database"**

## 🔗 **Step 2: Get Connection Details**

After creation, you'll get:
- **Internal Database URL** (for connecting from your Render services)
- **External Database URL** (for external connections)

**Use the INTERNAL URL for your Render.com web service!**

## ⚙️ **Step 3: Update Environment Variables**

In your MentorPro web service environment:

1. **Remove or comment out:**
   ```
   SUPABASE_URL=postgresql://postgres:Nw4M-9VE-wXc%2ADA@db.hhbdzdzfdreyxqpjvijo.supabase.co:5432/postgres
   ```

2. **Add the new variable:**
   ```
   DATABASE_URL=postgresql://mentorpro_user:YOUR_PASSWORD@dpg-xxxxxxxx-xxxx.oregon-postgres.render.com/mentorpro
   ```
   (Replace with your actual internal database URL from Render)

## ✅ **Benefits of Render PostgreSQL**

- ✅ **Perfect connectivity** (same infrastructure)
- ✅ **Free tier available**
- ✅ **Automatic backups**
- ✅ **No IPv6 issues**
- ✅ **Optimized for Render.com services**

## 🔄 **Migration Steps**

1. Create the PostgreSQL database on Render
2. Update the environment variable
3. Deploy (automatic with git push)
4. Your app will automatically create the tables on first run

## 📊 **Verification**

After deployment, check:
- Health endpoint: `https://your-app.onrender.com/health`
- Should show: `"database": "connected"` and `"dbType": "postgres"`

---

**This solution eliminates the IPv6 connectivity issues we've been experiencing with Supabase!**
