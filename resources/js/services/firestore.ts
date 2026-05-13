import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit, 
    serverTimestamp,
    Timestamp,
    type QueryConstraint,
    type DocumentData,
    type WithFieldValue
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Base Firestore service for multiuser SaaS operations
 * All operations are scoped to workspace/account for data isolation
 */

// Collection names
export const COLLECTIONS = {
    ACCOUNTS: 'accounts',
    WORKSPACES: 'workspaces',
    USERS: 'users',
    POSTS: 'posts',
    SOCIAL_ACCOUNTS: 'social_accounts',
    SIGNATURES: 'signatures',
    LABELS: 'labels',
    MEDIA: 'media',
    NOTIFICATIONS: 'notifications',
    AI_USAGE_LOGS: 'ai_usage_logs',
    INVITES: 'invites',
    PLANS: 'plans',
    SUBSCRIPTIONS: 'subscriptions',
} as const;

/**
 * Create a new document in a collection
 */
export async function createDocument<T extends DocumentData>(
    collectionName: keyof typeof COLLECTIONS,
    data: WithFieldValue<T>,
    parentId?: string
): Promise<string> {
    const collectionRef = parentId 
        ? collection(db, COLLECTIONS[collectionName], parentId, 'subcollection')
        : collection(db, COLLECTIONS[collectionName]);
    
    const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    
    return docRef.id;
}

/**
 * Get a single document by ID
 */
export async function getDocument<T extends DocumentData>(
    collectionName: keyof typeof COLLECTIONS,
    id: string,
    parentId?: string
): Promise<T | null> {
    const collectionRef = parentId
        ? collection(db, COLLECTIONS[collectionName], parentId, 'subcollection')
        : collection(db, COLLECTIONS[collectionName]);
    
    const docRef = doc(collectionRef, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
    }
    
    return null;
}

/**
 * Update an existing document
 */
export async function updateDocument<T extends DocumentData>(
    collectionName: keyof typeof COLLECTIONS,
    id: string,
    data: Partial<WithFieldValue<T>>,
    parentId?: string
): Promise<void> {
    const collectionRef = parentId
        ? collection(db, COLLECTIONS[collectionName], parentId, 'subcollection')
        : collection(db, COLLECTIONS[collectionName]);
    
    const docRef = doc(collectionRef, id);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Delete a document
 */
export async function deleteDocument(
    collectionName: keyof typeof COLLECTIONS,
    id: string,
    parentId?: string
): Promise<void> {
    const collectionRef = parentId
        ? collection(db, COLLECTIONS[collectionName], parentId, 'subcollection')
        : collection(db, COLLECTIONS[collectionName]);
    
    const docRef = doc(collectionRef, id);
    await deleteDoc(docRef);
}

/**
 * Query documents with filters
 */
export async function queryDocuments<T extends DocumentData>(
    collectionName: keyof typeof COLLECTIONS,
    constraints: QueryConstraint[] = [],
    parentId?: string
): Promise<T[]> {
    const collectionRef = parentId
        ? collection(db, COLLECTIONS[collectionName], parentId, 'subcollection')
        : collection(db, COLLECTIONS[collectionName]);
    
    const q = query(collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as T));
}

/**
 * Get documents filtered by workspace ID (for workspace-scoped data)
 */
export async function getWorkspaceDocuments<T extends DocumentData>(
    collectionName: keyof typeof COLLECTIONS,
    workspaceId: string,
    additionalConstraints: QueryConstraint[] = []
): Promise<T[]> {
    const constraints = [
        where('workspace_id', '==', workspaceId),
        ...additionalConstraints
    ];
    
    return queryDocuments<T>(collectionName, constraints);
}

/**
 * Get documents filtered by account/user ID (for account-scoped data)
 */
export async function getAccountDocuments<T extends DocumentData>(
    collectionName: keyof typeof COLLECTIONS,
    accountId: string,
    additionalConstraints: QueryConstraint[] = []
): Promise<T[]> {
    const constraints = [
        where('account_id', '==', accountId),
        ...additionalConstraints
    ];
    
    return queryDocuments<T>(collectionName, constraints);
}

/**
 * Real-time subscription helper (returns unsubscribe function)
 */
export function subscribeToCollection<T extends DocumentData>(
    collectionName: keyof typeof COLLECTIONS,
    callback: (docs: T[]) => void,
    constraints: QueryConstraint[] = [],
    parentId?: string
): () => void {
    const { onSnapshot } = require('firebase/firestore');
    
    const collectionRef = parentId
        ? collection(db, COLLECTIONS[collectionName], parentId, 'subcollection')
        : collection(db, COLLECTIONS[collectionName]);
    
    const q = query(collectionRef, ...constraints);
    
    return onSnapshot(q, (querySnapshot) => {
        const docs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as T));
        callback(docs);
    });
}

/**
 * Batch write operations (up to 500 operations per batch)
 */
export async function batchWrite(
    operations: Array<{
        type: 'create' | 'update' | 'delete';
        collectionName: keyof typeof COLLECTIONS;
        id?: string;
        data?: DocumentData;
        parentId?: string;
    }>
): Promise<void> {
    const { writeBatch } = require('firebase/firestore');
    const batch = writeBatch(db);
    
    operations.forEach(op => {
        const collectionRef = op.parentId
            ? collection(db, COLLECTIONS[op.collectionName], op.parentId, 'subcollection')
            : collection(db, COLLECTIONS[op.collectionName]);
        
        if (op.type === 'create' && op.data) {
            const docRef = doc(collectionRef);
            batch.set(docRef, {
                ...op.data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } else if (op.type === 'update' && op.id && op.data) {
            const docRef = doc(collectionRef, op.id);
            batch.update(docRef, {
                ...op.data,
                updatedAt: serverTimestamp(),
            });
        } else if (op.type === 'delete' && op.id) {
            const docRef = doc(collectionRef, op.id);
            batch.delete(docRef);
        }
    });
    
    await batch.commit();
}

/**
 * Utility to convert Firestore timestamp to JavaScript Date
 */
export function firestoreTimestampToDate(timestamp: Timestamp | any): Date {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (timestamp?.toDate) {
        return timestamp.toDate();
    }
    return new Date();
}

/**
 * Utility to create common query constraints
 */
export const QueryHelpers = {
    orderByCreatedAt: (direction: 'asc' | 'desc' = 'desc') => 
        orderBy('createdAt', direction),
    
    orderByUpdatedAt: (direction: 'asc' | 'desc' = 'desc') => 
        orderBy('updatedAt', direction),
    
    limitTo: (count: number) => limit(count),
    
    whereEquals: (field: string, value: any) => where(field, '==', value),
    
    whereIn: (field: string, values: any[]) => where(field, 'in', values),
    
    whereGreaterThan: (field: string, value: any) => where(field, '>', value),
    
    whereLessThan: (field: string, value: any) => where(field, '<', value),
};
