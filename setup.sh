#!/bin/bash

# Skill Gap Analyzer - Development Setup Script

echo "🚀 Setting up Skill Gap Analyzer..."

# Backend setup
echo "📦 Setting up backend..."
cd backend
npm install
cp .env.example .env
echo "✅ Backend dependencies installed"

# Frontend setup
echo "📦 Setting up frontend..."
cd ../frontend
npm install
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
EOF
echo "✅ Frontend dependencies installed"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start development:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000"
