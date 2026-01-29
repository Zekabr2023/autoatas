import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

interface Tenant {
    id: string;
    name: string;
    color_primary: string;
    color_secondary?: string;
    logo_url?: string;
    logo_style?: 'original' | 'white' | 'black';
    video_bg_url?: string;
    video_bg_opacity?: number;
    logo_height?: number;
}

interface ThemeContextType {
    tenant: Tenant | null;
    loading: boolean;
    refreshTenant: () => Promise<void>;
    updateTenant: (updates: Partial<Tenant>) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
    tenant: null,
    loading: true,
    refreshTenant: async () => { },
    updateTenant: async () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchTenant = async () => {
        if (!user) {
            setTenant(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch tenant associated with this user
            const { data, error } = await supabase
                .from('tenants')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
                console.error('Error fetching tenant:', error);
            }

            if (data) {
                setTenant(data);
                applyTheme(data);
            } else {
                setTenant(null);
                // Apply default styles
                document.documentElement.style.setProperty('--color-primary', '#F27649');
                document.documentElement.style.setProperty('--color-secondary', '#10B981');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const applyTheme = (tenantData: Tenant) => {
        // Apply primary color to CSS variable
        if (tenantData.color_primary) {
            document.documentElement.style.setProperty('--color-primary', tenantData.color_primary);
        }
        if (tenantData.color_secondary) {
            document.documentElement.style.setProperty('--color-secondary', tenantData.color_secondary);
        } else {
            document.documentElement.style.setProperty('--color-secondary', '#10B981'); // Default Green
        }
    };

    const updateTenant = async (updates: Partial<Tenant>) => {
        if (!tenant || !user) return;

        const { error } = await supabase
            .from('tenants')
            .update(updates)
            .eq('id', tenant.id);

        if (error) {
            console.error('Error updating tenant:', error);
            throw error;
        }

        const updatedTenant = { ...tenant, ...updates };
        setTenant(updatedTenant);
        applyTheme(updatedTenant);
    };

    useEffect(() => {
        fetchTenant();
    }, [user]);

    return (
        <ThemeContext.Provider value={{ tenant, loading, refreshTenant: fetchTenant, updateTenant }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
