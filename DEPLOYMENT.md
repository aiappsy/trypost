# PostPro Deployment Guide

This guide covers deploying PostPro as a multiuser SaaS with Firebase/Firestore backend.

## Quick Start

### 1. Firebase Project Setup

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Create new Firebase project (or use existing)
firebase projects:create postpro-saas --display-name "PostPro"

# Set as active project
firebase use postpro-saas
```

### 2. Enable Firebase Services

In [Firebase Console](https://console.firebase.google.com):

1. **Authentication** → Get Started → Enable:
   - Email/Password
   - Google Sign-In

2. **Firestore Database** → Create Database:
   - Start in production mode
   - Location: `us-central1` (recommended)

3. **Storage** → Get Started:
   - Start in production mode
   - Use same location as Firestore

4. **Functions** (optional for cloud functions):
   - Upgrade to Blaze plan (pay-as-you-go)

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in Firebase credentials:

```env
# Get these from Firebase Console → Project Settings → General → Your apps
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=postpro-saas.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=postpro-saas
VITE_FIREBASE_STORAGE_BUCKET=postpro-saas.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Laravel configuration
APP_NAME=PostPro
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

# Database (still needed for Laravel session/cache)
DB_CONNECTION=pgsql
DB_HOST=your-db-host
DB_DATABASE=postpro
DB_USERNAME=postgres
DB_PASSWORD=your-password

# Redis (for cache/queue)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# File storage (use Firebase Storage or keep local/s3)
FILESYSTEM_DISK=local
```

### 4. Deploy Firestore Rules & Indexes

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

### 5. Deploy Storage Rules

```bash
firebase deploy --only storage
```

### 6. Build & Deploy Application

#### Option A: Docker Deployment (Recommended)

```bash
# Build Docker image
docker build -t postpro-app .

# Push to registry (Docker Hub, GCR, etc.)
docker tag postpro-app gcr.io/your-project/postpro-app:latest
docker push gcr.io/your-project/postpro-app:latest

# Deploy to Cloud Run
gcloud run deploy postpro \
  --image gcr.io/your-project/postpro-app:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars APP_ENV=production,VITE_FIREBASE_PROJECT_ID=postpro-saas
```

#### Option B: Firebase Hosting + Cloud Functions

```bash
# Build frontend
npm run build

# Build backend
composer install --no-dev --optimize-autoloader

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

#### Option C: Traditional VPS

```bash
# SSH to server
ssh user@your-server

# Clone repository
git clone https://github.com/postpro-it/postpro.git
cd postpro

# Install dependencies
composer install --no-dev --optimize-autoloader
npm install && npm run build

# Setup environment
cp .env.example .env
php artisan key:generate

# Run migrations
php artisan migrate --force

# Configure web server (Nginx/Apache)
# Point document root to /public

# Set up supervisor for queue workers
sudo nano /etc/supervisor/conf.d/postpro-worker.conf
```

Example supervisor config:

```ini
[program:postpro-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/postpro/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/path/to/postpro/storage/logs/worker.log
stopwaitsecs=3600
```

```bash
# Reload supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start postpro-worker:*
```

## Post-Deployment Checklist

### Security

- [ ] Verify Firestore rules are deployed
- [ ] Verify Storage rules are deployed
- [ ] Enable Firebase App Check (optional but recommended)
- [ ] Set up CORS for your domain
- [ ] Rotate API keys if exposed

### Performance

- [ ] Enable CDN for static assets
- [ ] Configure caching headers
- [ ] Set up database indexes for common queries
- [ ] Enable gzip/brotli compression

### Monitoring

- [ ] Enable Firebase Performance Monitoring
- [ ] Set up error tracking (Sentry, Bugsnag)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation

### Backup

- [ ] Export Firestore data regularly
- [ ] Backup Firebase Storage files
- [ ] Backup SQL database (if using)
- [ ] Test restore procedures

## Scaling Considerations

### Firestore Limits (Free Tier)

- **Reads**: 50,000/day
- **Writes**: 20,000/day
- **Deletes**: 20,000/day
- **Storage**: 1 GB

### Scaling Strategies

1. **Optimize Queries**: Use composite indexes, limit result sets
2. **Cache Frequently Accessed Data**: Use Redis or Cloud Memorystore
3. **Batch Operations**: Use batch writes for multiple operations
4. **Shard High-Write Collections**: Split by workspace/account

### Cost Optimization

- Use Firestore compound queries instead of multiple simple queries
- Implement client-side caching
- Use Cloud Functions sparingly (consider HTTP endpoints)
- Monitor usage in Firebase Console

## Troubleshooting

### Common Issues

**Issue**: "Permission denied" errors in Firestore

**Solution**: Check that security rules are deployed and user is authenticated

```bash
firebase deploy --only firestore:rules
```

**Issue**: Images not uploading

**Solution**: Verify Storage rules and bucket permissions

```bash
firebase deploy --only storage
```

**Issue**: Functions timeout

**Solution**: Increase timeout in function config or optimize code

```javascript
// In functions/index.js
exports.myFunction = functions
  .runWith({ timeoutSeconds: 540, memory: '2GB' })
  .https.onCall(...)
```

## Support

- Documentation: https://postpro.it/docs
- Firebase Docs: https://firebase.google.com/docs
- Issues: https://github.com/postpro-it/postpro/issues
