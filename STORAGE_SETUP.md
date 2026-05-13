# Firebase Storage Configuration for PostPro

## Bucket Structure

```
your-firebase-storage-bucket/
├── avatars/
│   └── {userId}/
│       └── profile.jpg
├── logos/
│   └── {workspaceId}/
│       └── logo.png
├── posts/
│   └── {workspaceId}/
│       ├── image1.jpg
│       └── video1.mp4
└── media/
    └── {workspaceId}/
        └── uploads/
```

## Setup Instructions

### 1. Enable Firebase Storage

1. Go to Firebase Console → Storage
2. Click "Get Started"
3. Start in production mode (security rules will handle access control)
4. Choose your storage location (match Firestore location: us-central1)

### 2. Deploy Storage Rules

```bash
firebase deploy --only storage
```

### 3. Configure Upload Service

Update your media upload service to use Firebase Storage:

```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '@/lib/firebase';

const storage = getStorage();

export async function uploadFile(
  file: File,
  path: string,
  workspaceId?: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const storagePath = workspaceId 
    ? `media/${workspaceId}/${path}`
    : `avatars/${user.uid}/${path}`;
  
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  
  return await getDownloadURL(storageRef);
}
```

## Security Rules Summary

| Path | Read Access | Write Access |
|------|-------------|--------------|
| `/avatars/{userId}/*` | Anyone | Only the user |
| `/logos/{workspaceId}/*` | Authenticated users | Workspace members |
| `/posts/{workspaceId}/*` | Authenticated users | Workspace members |
| `/media/{workspaceId}/*` | Authenticated users | Authenticated users |

All other paths are denied by default.

## Storage Limits (Free Tier)

- **Storage**: 5 GB
- **Downloads**: 10 GB/day
- **Uploads**: 20,000/day
- **Total transfers**: 50,000/day

For higher limits, upgrade to Blaze (pay-as-you-go) plan.
