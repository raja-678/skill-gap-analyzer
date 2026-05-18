# 🌐 Deployment Guide - 100% Free Forever

This guide covers deploying the Skill Gap Analyzer to production using **100% free services** with no hidden costs.

## 📋 Overview

```
┌────────────────────────────────────────────────┐
│  VERCEL (Next.js Frontend) - FREE UNLIMITED    │
│  URL: skill-gap.vercel.app                     │
└────────────────────────────────────────────────┘
              ↓ API calls
┌────────────────────────────────────────────────┐
│  CLOUDFLARE WORKERS (Backend API) - FREE       │
│  100K requests/day included                    │
│  URL: api.skill-gap.workers.dev                │
└────────────────────────────────────────────────┘
              ↓ Database
┌────────────────────────────────────────────────┐
│  NEON POSTGRESQL (Database) - FREE             │
│  5GB storage included                          │
│  URL: project.neon.tech                        │
└────────────────────────────────────────────────┘
```

## 🚀 Step 1: Deploy Frontend (Vercel)

### Prerequisites
- GitHub account
- Vercel account (free at vercel.com)

### Steps

1. **Push code to GitHub**
```bash
git remote add origin https://github.com/yourusername/skill-gap-analyzer.git
git branch -M main
git push -u origin main
```

2. **Connect to Vercel**
- Go to https://vercel.com/new
- Select your GitHub repository
- Click "Import"

3. **Configure Environment**
In Vercel dashboard, set:
```
NEXT_PUBLIC_API_URL=https://your-api-url.workers.dev
```

4. **Deploy**
- Click "Deploy"
- Vercel auto-deploys on every git push

✅ Frontend is live at: `https://yourapp.vercel.app`

---

## 🌐 Step 2: Deploy Backend (Cloudflare Workers)

### Prerequisites
- Cloudflare account (free at cloudflare.com)
- Wrangler CLI: `npm install -g wrangler`

### Steps

1. **Create Cloudflare Project**
```bash
# Inside backend directory
cd backend

# Install Wrangler if not already
npm install -D wrangler

# Create wrangler.toml
cat > wrangler.toml << EOF
name = "skill-gap-api"
type = "javascript"
account_id = "your_account_id"
workers_dev = true
route = ""
zone_id = ""

[env.production]
routes = [{ pattern = "api.yourdomain.com/*", zone_id = "" }]

[[kv_namespaces]]
binding = "STORAGE"
id = "your_kv_namespace_id"
EOF
```

2. **Convert Express to Cloudflare Workers**

Create `src/worker.js`:
```javascript
import app from './server.js';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Route to Express
    return app(request, env);
  }
};
```

3. **Configure Database Connection**
```bash
# Set environment variables in Cloudflare
wrangler secret put DATABASE_URL
# Paste your Neon PostgreSQL URL

wrangler secret put JWT_SECRET
# Enter your JWT secret
```

4. **Deploy**
```bash
wrangler publish
```

✅ Backend API is live at: `https://skill-gap-api.workers.dev`

---

## 🗄️ Step 3: Deploy Database (Neon PostgreSQL)

### Prerequisites
- Neon account (free at neon.tech)

### Steps

1. **Create Neon Project**
- Go to https://neon.tech
- Click "Create new project"
- Select "PostgreSQL 15"

2. **Get Connection String**
- Copy database connection URL
- Format: `postgresql://user:password@host/database`

3. **Run Migrations**
```bash
# Set connection string
export DATABASE_URL="postgresql://user:password@host/database"

# Run migrations
psql $DATABASE_URL < backend/schema.sql
```

4. **Seed Initial Data** (Optional)
```bash
# Create seed file: backend/seed.sql
psql $DATABASE_URL < backend/seed.sql
```

✅ Database is ready at Neon

---

## 📦 Step 4: Update Environment Variables

### Backend (Cloudflare)
```bash
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET
wrangler secret put CORS_ORIGIN
```

### Frontend (Vercel)
In Vercel dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL=https://skill-gap-api.workers.dev
```

---

## ✅ Verification Checklist

- [ ] Frontend deployed and accessible
- [ ] Backend API responding to health check
- [ ] Database connected successfully
- [ ] User registration working
- [ ] Resume upload working
- [ ] API calls from frontend successful
- [ ] Emails/notifications working (if applicable)

### Test Commands

```bash
# Test frontend
curl https://yourapp.vercel.app

# Test backend health
curl https://skill-gap-api.workers.dev/api/health

# Test auth
curl -X POST https://skill-gap-api.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser"
  }'
```

---

## 🔒 Security Checklist

- [ ] JWT secret is strong and unique
- [ ] Database password is secure
- [ ] CORS is restricted to your domain
- [ ] Rate limiting enabled
- [ ] SQL injection protections in place
- [ ] Environment variables not in git
- [ ] HTTPS enabled everywhere
- [ ] Database backups configured

---

## 📈 Monitoring & Maintenance

### Vercel Monitoring
- Go to Vercel Dashboard
- Monitor deployments and build logs
- Check analytics and performance

### Cloudflare Monitoring
- Go to Cloudflare Dashboard
- View API requests and errors
- Monitor worker performance

### Database Monitoring
- Neon Dashboard shows storage usage
- Set alerts for quota limits
- Monitor connection count

---

## 💰 Cost Breakdown (Free Tier)

| Service | Free Tier | Limit |
|---------|-----------|-------|
| **Vercel** | ✅ Unlimited | Deployments, bandwidth |
| **Cloudflare Workers** | ✅ 100,000 req/day | Requests per day |
| **Neon PostgreSQL** | ✅ 5GB storage | Storage & compute |
| **GitHub** | ✅ Unlimited | Repos, actions |
| **Total Cost** | **$0/month** | Forever free |

---

## 🆘 Troubleshooting

### API Connection Errors
```
Error: Cannot connect to database
→ Check DATABASE_URL in Cloudflare secrets
→ Verify Neon connection is active
→ Check firewall rules
```

### CORS Errors
```
Error: CORS policy
→ Check CORS_ORIGIN in backend
→ Verify frontend URL matches
→ Test with curl first
```

### Deploy Failures
```
Vercel: Check build logs
→ npm run build might be failing
→ Check environment variables

Cloudflare: Check worker logs
→ wrangler tail
→ Check secret configuration
```

---

## 🚀 Scaling (If Needed Later)

When free tier isn't enough:

- **Frontend**: Upgrade Vercel Pro ($20/mo)
- **Backend**: Move to Railway ($5/mo) or Fly.io
- **Database**: Upgrade Neon Pro ($15/mo)
- **Storage**: Add AWS S3 ($1-3/mo)

**Total: ~$20-40/month for production scale**

---

## 📚 References

- [Vercel Docs](https://vercel.com/docs)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Neon PostgreSQL](https://neon.tech/docs)
- [Express → Workers Migration](https://github.com/cloudflare/workers-rs)

---

## 🎉 Congratulations!

Your Skill Gap Analyzer is now live! 🚀

- **Frontend**: https://yourapp.vercel.app
- **API**: https://skill-gap-api.workers.dev
- **Database**: Neon PostgreSQL

**Cost: $0/month forever!** 💰
