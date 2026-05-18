# Development Environment Setup Guide

## Prerequisites
- Node.js 16+ installed
- PostgreSQL 12+ installed and running
- npm or yarn

## Step 1: Database Setup

### Create Database
```bash
# On Windows
psql -U postgres
CREATE DATABASE skill_gap_analyzer;

# On Mac/Linux
createdb skill_gap_analyzer
```

### Create User (Optional but Recommended)
```sql
CREATE USER skillgap_user WITH PASSWORD 'secure_password';
ALTER ROLE skillgap_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE skill_gap_analyzer TO skillgap_user;
```

### Run Migrations
```bash
psql skill_gap_analyzer < backend/schema.sql
```

## Step 2: Environment Configuration

### Backend
```bash
cd backend
cp .env.example .env

# Edit .env with your values:
DATABASE_URL=postgresql://skillgap_user:secure_password@localhost:5432/skill_gap_analyzer
JWT_SECRET=your_super_secret_key_change_this
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend
```bash
cd frontend
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
EOF
```

## Step 3: Install Dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Step 4: Start Development Servers

### Terminal 1 - Backend
```bash
cd backend
npm run dev
# Server running on http://localhost:5000
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
# Frontend running on http://localhost:3000
```

### Terminal 3 (Optional) - Database Admin
```bash
# Monitor database (pgAdmin or similar)
# or use psql for manual queries
psql skill_gap_analyzer
```

## Testing

### Create Test User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Upload Test Resume
1. Go to http://localhost:3000
2. Sign up / Login
3. Go to Dashboard
4. Upload a PDF resume
5. Select a job role to analyze

## Troubleshooting

### Port Already in Use
```bash
# Find process on port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or change PORT in .env
PORT=5001
```

### Database Connection Error
```bash
# Test connection
psql -U skillgap_user -d skill_gap_analyzer -h localhost

# Or check credentials in .env
# DATABASE_URL=postgresql://user:password@localhost:5432/skill_gap_analyzer
```

### CORS Errors
- Check CORS_ORIGIN in backend .env
- Make sure frontend API_URL matches backend URL
- Clear browser cache and restart servers

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development Tips

### Hot Reload
- Backend: Automatically reloads with nodemon
- Frontend: Automatically reloads with Next.js

### Debug Backend
```bash
# Add console.logs or use debugger
node --inspect src/server.js
```

### Check API Responses
```bash
# Use curl or Postman
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/users/profile
```

### Database Queries
```bash
# Connect to database
psql skill_gap_analyzer

# List tables
\dt

# View schema
\d users

# Sample query
SELECT * FROM users LIMIT 5;
```

## Next Steps

1. ✅ Setup complete
2. Create sample data (resumes, job roles)
3. Test upload and analysis features
4. Customize job roles in database
5. Add more learning resources
6. Deploy to production

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
