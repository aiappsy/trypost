# PostPro - Multiuser SaaS with Firebase/Firestore Backend

<p align="center">
  <img src="public/images/postpro/logo-dark.png" alt="PostPro" width="200">
</p>

<p align="center">
  <strong>Open-source social media scheduling for teams and creators</strong><br/>
  Now with Firebase/Firestore backend for real-time multiuser collaboration
</p>

## 🚀 Features

### Multiuser SaaS Architecture
- **Workspace-based isolation** - Each team/brand has isolated data
- **Role-based access control** - Owner, Admin, Member roles per workspace
- **Real-time synchronization** - Firestore-powered live updates
- **Firebase Authentication** - Google Sign-In, Email/Password support

### Backend: Firebase/Firestore
- **Serverless architecture** - No database server management
- **Real-time database** - Automatic sync across all connected clients
- **Offline support** - Works offline, syncs when back online
- **Automatic scaling** - Handles any number of concurrent users

### Security
- **Firestore Security Rules** - Data access controlled at database level
- **Workspace-level permissions** - Users only see their workspace data
- **Account isolation** - Complete data separation between accounts

## 📁 Project Structure

```
postpro/
├── app/                      # Laravel backend (API layer)
│   ├── Models/              # Eloquent models (synced with Firestore)
│   ├── Http/Controllers/    # API controllers
│   └── Services/            # Business logic services
├── resources/js/
│   ├── composables/         # Vue composables
│   │   └── useFirebaseAuth.ts    # Firebase authentication
│   ├── services/            # API services
│   │   └── firestore.ts     # Firestore CRUD operations
│   ├── lib/
│   │   └── firebase.ts      # Firebase initialization
│   └── pages/               # Vue pages
├── firebase.json            # Firebase configuration
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Database indexes
└── Dockerfile               # Production deployment
```

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project named "PostPro"
3. Enable the following services:
   - **Authentication** → Enable Google and Email/Password providers
   - **Firestore Database** → Create database in production mode
   - **Storage** (optional for media files)

### 2. Get Firebase Configuration

In Firebase Console:
1. Go to Project Settings → General
2. Scroll to "Your apps" → Add web app
3. Copy the `firebaseConfig` object

### 3. Configure Environment Variables

Create `.env` file with your Firebase credentials:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

### 4. Deploy Firestore Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

## 🏃 Local Development

### Prerequisites
- Node.js 20+
- PHP 8.4+
- PostgreSQL or MySQL
- Redis
- Firebase project (see above)

### Installation

```bash
# Install PHP dependencies
composer install

# Install Node dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate app key
php artisan key:generate

# Configure database and run migrations
php artisan migrate

# Build frontend assets
npm run dev

# Start development servers
composer dev
```

### Firebase Emulator (Optional)

For local testing without hitting production Firebase:

```bash
# Start Firebase emulators
firebase emulators:start

# Update firebase.ts to use emulator
# Uncomment emulator config in resources/js/lib/firebase.ts
```

## 🚢 Production Deployment

### Option 1: Docker Deployment

```bash
# Build Docker image
docker build -t postpro-app .

# Run container
docker run -d \
  -p 80:80 \
  -e APP_ENV=production \
  -e APP_DEBUG=false \
  -e VITE_FIREBASE_API_KEY=your-key \
  --name postpro \
  postpro-app
```

### Option 2: Firebase Hosting + Cloud Run

```bash
# Build for production
npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Or deploy backend to Cloud Run
gcloud run deploy postpro-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

### Option 3: Traditional Server

```bash
# Clone repository
git clone https://github.com/postpro-it/postpro.git
cd postpro

# Install dependencies
composer install --no-dev --optimize-autoloader
npm install && npm run build

# Set up environment
cp .env.example .env
php artisan key:generate

# Configure database
php artisan migrate --force

# Set permissions
chown -R www-data:www-data storage bootstrap/cache

# Configure web server (Apache/Nginx) to serve public/
```

## 🔐 Security Rules

The Firestore security rules enforce:

1. **Authentication required** - All operations require signed-in user
2. **Workspace isolation** - Users can only access their workspaces
3. **Account ownership** - Users can only modify their own account data
4. **Role-based access** - Different permissions for owners vs members

See `firestore.rules` for complete rule definitions.

## 📊 Firestore Collections

```
accounts/{accountId}
  ├── owner_id
  ├── name
  ├── billing_email
  └── plan_id

workspaces/{workspaceId}
  ├── account_id
  ├── owner_id
  ├── members[]
  ├── name
  └── brand_settings

workspaces/{workspaceId}/posts/{postId}
  ├── workspace_id
  ├── content
  ├── scheduled_at
  ├── status
  └── platforms[]

users/{userId}
  ├── email
  ├── name
  ├── photo_url
  └── current_workspace_id

notifications/{notificationId}
  ├── user_id
  ├── type
  ├── message
  └── read_at
```

## 🧪 Testing

```bash
# Run PHPUnit tests
php artisan test

# Run frontend tests
npm run test

# Test Firestore rules
firebase emulators:exec "npm test"
```

## 📝 License

AGPL-3.0-only - See [LICENSE.md](LICENSE.md) for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

- Documentation: https://postpro.it/docs
- Issues: https://github.com/postpro-it/postpro/issues
- Discussions: https://github.com/postpro-it/postpro/discussions

---

Built with ❤️ using Laravel, Vue.js, and Firebase
