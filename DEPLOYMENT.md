# 🚀 MentorPro Production Deployment Guide

## Summary
MentorPro now supports **dual-mode database operation**:
- **Local Development**: SQLite (no setup required)
- **Production**: PostgreSQL via Supabase (persistent, free)

This solves the database reset issue on Render.com's free tier.

---

## 🗄️ Database Strategy

### Local Development (SQLite)
- **File**: `quiz.db` (already existing)
- **No changes required** - your local development continues working exactly as before
- **Automatic**: Detects local environment and uses SQLite

### Production (PostgreSQL via Supabase)
- **Service**: Supabase (free tier: 500MB storage, 2GB bandwidth/month)
- **Persistent**: Database survives app restarts/sleeps
- **Automatic**: Detects production environment and uses PostgreSQL

---

## 📋 Deployment Steps

### Step 1: Create Supabase Account (Free)
1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub (or email)
3. Create a new project:
   - **Name**: `mentorpro-db`
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users

### Step 2: Get Database Connection String
1. In your Supabase project, go to:
   - **Settings** → **Database**
2. Copy the **Connection string** under "Connection parameters"
3. It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### Step 3: Configure Render.com Environment Variables
1. In your Render.com dashboard → **mentorpro** service
2. Go to **Environment** tab
3. Add new environment variable:
   - **Key**: `SUPABASE_URL`
   - **Value**: Your Supabase connection string from Step 2

### Step 4: Deploy
1. Push your updated code to GitHub:
   ```bash
   git add .
   git commit -m "Add persistent database support with Supabase"
   git push origin main
   ```
2. Render.com will automatically deploy (takes ~2-3 minutes)

---

## ✅ Verification

### Test Local Development
```bash
npm start
# Should show: "🗄️ Using SQLite (Development)"
```

### Test Production
1. Check Render.com logs after deployment
2. Should show: "🗄️ Using PostgreSQL (Supabase)"
3. Visit your app URL - all functions should work
4. Database will persist through app restarts

---

## 🔧 Technical Details

### Environment Detection
- **Local**: No `SUPABASE_URL` → Uses SQLite
- **Production**: Has `SUPABASE_URL` → Uses PostgreSQL

### Database Manager Features
- **Auto-migration**: Creates tables automatically
- **Dual compatibility**: Same API for both databases
- **Error handling**: Graceful fallbacks and detailed logging

### Files Changed
- ✅ `database.js` - New dual-mode database manager
- ✅ `server.js` - Updated to use DatabaseManager
- ✅ `package.json` - Added PostgreSQL dependency
- ✅ `.env.example` - Added Supabase configuration
- ✅ `render.yaml` - Added SUPABASE_URL environment variable

---

## 💰 Cost Breakdown

### Local Development: **$0/month**
- SQLite database (existing setup)

### Production: **$0/month**
- Render.com Free Tier: $0
- Supabase Free Tier: $0 (500MB storage, 2GB bandwidth)
- Total: **$0/month** 🎉

---

## 🆘 Troubleshooting

### "Database initialization error"
- Check SUPABASE_URL format in Render.com environment variables
- Ensure Supabase project is active

### "Connection refused"
- Verify Supabase project isn't paused
- Check connection string has correct password

### Questions not persisting
- Verify SUPABASE_URL is set in production
- Check Render.com logs for database connection messages

---

## 📝 Notes

1. **Migration**: Existing questions in SQLite won't automatically transfer to PostgreSQL
2. **Development**: Your local development remains unchanged
3. **Backup**: Consider exporting important questions before deployment
4. **Monitoring**: Use the `/monitor` endpoint to check database status

---

## 🎯 Next Steps

After successful deployment:
1. Test question generation in production
2. Verify questions persist after app restart
3. Monitor Supabase usage in dashboard
4. Consider data backup strategy for production
