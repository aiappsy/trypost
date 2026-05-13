import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { 
    signInWithPopup, 
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User 
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export const useFirebaseAuth = () => {
    const page = usePage();
    
    const currentUser = computed<User | null>(() => {
        return auth.currentUser;
    });
    
    const isAuthenticated = computed(() => {
        return currentUser.value !== null;
    });
    
    const userId = computed<string | null>(() => {
        return currentUser.value?.uid ?? null;
    });
    
    const userEmail = computed<string | null>(() => {
        return currentUser.value?.email ?? null;
    });
    
    const userName = computed<string | null>(() => {
        return currentUser.value?.displayName ?? null;
    });
    
    const userPhoto = computed<string | null>(() => {
        return currentUser.value?.photoURL ?? null;
    });
    
    /**
     * Sign in with Google popup
     */
    const signInWithGoogle = async (): Promise<User | null> => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error('Google sign-in error:', error);
            throw error;
        }
    };
    
    /**
     * Sign out
     */
    const signOut = async (): Promise<void> => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error('Sign-out error:', error);
            throw error;
        }
    };
    
    /**
     * Listen to auth state changes
     */
    const onAuthChange = (callback: (user: User | null) => void): (() => void) => {
        return onAuthStateChanged(auth, callback);
    };
    
    /**
     * Get Firebase ID token for backend authentication
     */
    const getIdToken = async (): Promise<string | null> => {
        if (!currentUser.value) {
            return null;
        }
        try {
            return await currentUser.value.getIdToken();
        } catch (error) {
            console.error('Error getting ID token:', error);
            return null;
        }
    };
    
    /**
     * Refresh the current user's ID token
     */
    const refreshToken = async (): Promise<string | null> => {
        if (!currentUser.value) {
            return null;
        }
        try {
            return await currentUser.value.getIdToken(true);
        } catch (error) {
            console.error('Error refreshing token:', error);
            return null;
        }
    };
    
    return {
        currentUser,
        isAuthenticated,
        userId,
        userEmail,
        userName,
        userPhoto,
        signInWithGoogle,
        signOut,
        onAuthChange,
        getIdToken,
        refreshToken,
    };
};
