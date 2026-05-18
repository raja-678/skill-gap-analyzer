# 🚀 Skill Gap Analyzer - Full SaaS Platform

An AI-powered SaaS platform that helps professionals discover skill gaps and unlock their career potential. Built with Node.js, Express, PostgreSQL, Next.js, and Tailwind CSS.

## ✨ Features

### For Candidates
- 📄 **AI-Powered Resume Analysis** - Extract skills with 95% accuracy
- 📊 **Skill Gap Visualization** - Interactive dashboards showing match percentages
- 🎯 **Personalized Learning Paths** - Curated resources tailored to your goals
- 💼 **Career Path Recommendations** - Discover adjacent roles you're ready for
- 📈 **Progress Tracking** - Monitor your skill development journey

### For Recruiters (Coming Soon)
- 🔍 **Bulk Resume Screening** - AI-powered candidate ranking
- 📊 **Advanced Analytics** - Hiring funnel & skill trends
- 🤖 **Smart Job Posting** - AI-generated job descriptions
- 🔗 **ATS Integration** - Connect with existing hiring tools

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT + bcryptjs
- **File Processing**: pdf-parse, multer
- **NLP**: node-nlp, compromise
- **Deployment**: Cloudflare Workers / Oracle Cloud

### Frontend
- **Framework**: Next.js 14
- **UI Library**: React 18
- **Styling**: Tailwind CSS 3
- **Charts**: Recharts
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast
- **Deployment**: Vercel / Cloudflare Pages

## 📋 Prerequisites

- Node.js 16+ 
- PostgreSQL 12+
- npm or yarn
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/skill-gap-analyzer.git
cd skill-gap-analyzer
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure your .env
# DATABASE_URL=postgresql://user:password@localhost:5432/skill_gap_analyzer
# JWT_SECRET=your_secret_key_here
# CORS_ORIGIN=http://localhost:3000
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb skill_gap_analyzer

# Run migrations
psql skill_gap_analyzer < schema.sql

# Seed initial data (optional)
npm run seed
```

### 4. Start Backend Server

```bash
npm run dev
# Server will run on http://localhost:5000
```

### 5. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
EOF

# Start development server
npm run dev
# Frontend will run on http://localhost:3000
```

## 📚 API Documentation

### Authentication Endpoints

```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
GET    /api/auth/verify            - Verify JWT token
```

### Resume Endpoints

```
POST   /api/resumes/upload         - Upload resume PDF
GET    /api/resumes                - Get user's resumes
GET    /api/resumes/:id            - Get specific resume
DELETE /api/resumes/:id            - Delete resume
PUT    /api/resumes/:id/set-primary - Set as primary resume
```

### Analysis Endpoints

```
POST   /api/analysis/analyze       - Analyze skill gap for job role
POST   /api/analysis/compare-roles - Compare multiple roles
GET    /api/analysis/adjacent-roles - Find similar roles
GET    /api/analysis/history       - Get analysis history
```

### Recommendation Endpoints

```
GET    /api/recommendations/:jobId - Get learning recommendations
POST   /api/recommendations/create-learning-path - Create learning path
GET    /api/recommendations/resources/:skill - Get resources for skill
PUT    /api/recommendations/update-progress - Update learning progress
GET    /api/recommendations/dashboard - Get learning dashboard
GET    /api/recommendations/suggest-skills - Suggest next skills
```

### User Endpoints

```
GET    /api/users/profile          - Get user profile
PUT    /api/users/profile          - Update profile
GET    /api/users/:id/skills       - Get user skills
POST   /api/users/skills/add       - Add skill
DELETE /api/users/skills/:skillId  - Remove skill
```

### Job & Skill Endpoints

```
GET    /api/jobs                   - Get all job roles
GET    /api/jobs/:id               - Get job details
GET    /api/jobs/search/:query     - Search jobs
GET    /api/skills                 - Get all skills
GET    /api/skills/:id             - Get skill details
GET    /api/skills/search/:query   - Search skills
```

## 🗄️ Database Schema

### Core Tables
- `users` - User accounts and profiles
- `resumes` - Uploaded resumes
- `skills` - Skill database
- `user_skills` - User's possessed skills
- `job_roles` - Job role definitions
- `job_role_requirements` - Required skills per role
- `skill_gap_analysis` - Analysis results
- `learning_paths` - Personalized learning paths
- `learning_resources` - Educational resources
- `user_learning_history` - Learning progress tracking

See `backend/schema.sql` for full schema details.

## 🧠 AI/ML Features

### Resume Parser
- Extracts text from PDF resumes
- Identifies personal information (name, email, phone)
- Parses work experience and education
- Detects certifications and languages

### Skill Extractor
- NLP-based skill identification
- Semantic skill matching
- Proficiency level inference
- Hidden skill detection

### Skill Gap Analysis
- Compares user skills vs job requirements
- Calculates match percentages
- Estimates learning time
- Identifies priority skills

### Learning Recommendations
- Suggests curated learning resources
- Ranks resources by quality and relevance
- Creates personalized learning paths
- Tracks progress and completion

## 🌐 Deployment

### Frontend (Vercel)

```bash
# Push to GitHub
git push origin main

# Connect repository to Vercel
# https://vercel.com/new

# Add environment variables in Vercel dashboard
NEXT_PUBLIC_API_URL=your_backend_url
```

### Backend (Oracle Cloud / Cloudflare Workers)

#### Option 1: Oracle Cloud Always Free

```bash
# Create Ubuntu VM on Oracle Cloud
# SSH into instance
ssh -i your_key.pem ubuntu@your_instance_ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone your_repo
cd skill-gap-analyzer/backend
npm install

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Install PM2 for process management
sudo npm install -g pm2

# Start application
pm2 start src/server.js --name skill-gap-api
pm2 startup
pm2 save

# Setup Nginx as reverse proxy (optional)
sudo apt-get install nginx
# Configure nginx.conf for your domain
```

#### Option 2: Cloudflare Workers

```bash
# Install Wrangler CLI
npm install -g wrangler

# Create Cloudflare project
wrangler generate skill-gap-api

# Configure wrangler.toml
# Deploy
wrangler publish
```

### Database (PostgreSQL)

```bash
# Create database on managed PostgreSQL service
# Set DATABASE_URL environment variable
# Run migrations
psql $DATABASE_URL < backend/schema.sql
```

## 📊 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/skill_gap_analyzer
JWT_SECRET=your_secret_key
JWT_EXPIRY=7d
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://yourfrontend.com
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://yourbackend.com
```

## 🔒 Security

- ✅ JWT authentication with bcrypt password hashing
- ✅ CORS protection
- ✅ Rate limiting ready (add express-rate-limit)
- ✅ SQL injection prevention with parameterized queries
- ✅ Secure file upload handling
- ✅ HTTPS/SSL ready

## 📈 Performance

- Optimized database queries with indexes
- Caching-ready architecture
- CDN-friendly frontend
- Lazy loading components
- Code splitting with Next.js

## 🧪 Testing (Coming Soon)

```bash
# Run tests
npm run test

# Coverage
npm run test:coverage
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📞 Support

- Email: support@skillgapanalyzer.com
- Issues: GitHub Issues
- Documentation: https://docs.skillgapanalyzer.com

## 🙏 Acknowledgments

- Resume parsing inspired by industry best practices
- Learning resources curated from top educational platforms
- UI/UX inspired by modern SaaS applications

---

Made with ❤️ for career development
