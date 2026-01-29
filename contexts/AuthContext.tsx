import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: () => void; // Placeholder, real sign in happens in Login component
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signIn: () => { },
    signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Safety timeout - force loading to false after 5s
        const timeoutId = setTimeout(() => {
            if (mounted && loading) {
                console.warn("Auth check timed out, forcing loading to false");
                setLoading(false);
            }
        }, 5000);

        const fetchUserRole = async (user: User) => {
            try {
                // Add explicit timeout to database query
                const queryPromise = supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .single();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Role fetch timeout')), 2000)
                );

                const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

                if (error) {
                    console.warn("Error fetching role:", error);
                    return user;
                }

                if (data) {
                    (user as any).publicRole = data.role;
                }
            } catch (error) {
                console.error("Exception in fetchUserRole:", error);
            }
            return user;
        };

        // Check active session
        console.log("Auth: Starting getSession...");
        const start = Date.now();

        // Wrap getSession in a race with 2s timeout
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise((resolve) =>
            setTimeout(() => resolve({ data: { session: null }, error: new Error("Session check timeout") }), 2000)
        );

        Promise.race([sessionPromise, sessionTimeout]).then(async ({ data: { session } }: any) => {
            if (!mounted) return;
            console.log(`Auth: getSession completed in ${Date.now() - start}ms`, session ? "Session found" : "No session");
            try {
                setSession(session);
                let currentUser = session?.user ?? null;
                if (currentUser) {
                    console.log("Auth: Fetching role...");
                    currentUser = await fetchUserRole(currentUser);
                    console.log("Auth: Role fetched.");
                }
                if (mounted) setUser(currentUser);
            } catch (err) {
                console.error("Error processing session", err);
            } finally {
                if (mounted) {
                    console.log("Auth: Setting loading to false (getSession)");
                    setLoading(false);
                }
            }
        }).catch(err => {
            console.error("Auth getSession failed", err);
            if (mounted) setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            console.log(`Auth: State change event: ${event}`);
            try {
                setSession(session);
                let currentUser = session?.user ?? null;
                if (currentUser) {
                    currentUser = await fetchUserRole(currentUser);
                }
                if (mounted) setUser(currentUser);
            } catch (err) {
                console.error("Error handling auth state change", err);
            } finally {
                if (mounted) {
                    console.log("Auth: Setting loading to false (onAuthStateChange)");
                    setLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const signIn = () => {
        // Logic handled in Login page usually
    }

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
