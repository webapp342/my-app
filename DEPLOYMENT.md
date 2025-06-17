# Deployment Guide

## 🚀 Quick Start

1. **Clone and Setup**
   ```bash
   cd wallet-app
   npm install
   ```

2. **Environment Configuration**
   - Create `.env.local` file (copy from `.env.example`)
   - Fill in your Supabase credentials

3. **Database Setup**
   - Run the SQL migration in `supabase-migration.sql` in your Supabase SQL editor

4. **Development**
   ```bash
   npm run dev
   ```

## 🌐 Production Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms
- **Netlify**: Works with same build commands
- **Railway**: Node.js deployment
- **AWS Amplify**: Static site hosting

## ⚙️ Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BSC_RPC_URL=https://bsc-dataseed.binance.org/
```

## 🔐 Security Checklist for Production

- [ ] Use HTTPS only
- [ ] Implement proper AES encryption for private keys
- [ ] Add rate limiting to API routes
- [ ] Enable Supabase RLS policies
- [ ] Add input validation and sanitization
- [ ] Implement audit logging
- [ ] Regular security audits

## 📝 Post-Deployment

1. Test wallet creation flow
2. Test wallet import flow
3. Verify database connections
4. Monitor error logs
5. Set up monitoring/alerts 