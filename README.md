# 🎬 Film Finder

AI-powered film recommendations with a bohemian pink & green theme.

## Run locally

### Step 1 — Get your free Groq API key
1. Go to https://console.groq.com
2. Sign up → API Keys → Create Key (starts with gsk_...)

### Step 2 — Set up
```bash
npm install
echo "GROQ_API_KEY=gsk_your_key_here" > .env.local
npm run dev
```
Open http://localhost:3000

## Deploy to Vercel
1. Push to GitHub
2. Go to vercel.com → New Project → import repo
3. Add env var: GROQ_API_KEY = your key
4. Deploy → get your free public URL!
