import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard: React.FC = () => {
    const { user, signOut } = useAuth();
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            const { data, error } = await supabase.from('tenants').select('*');
            if (error) console.error(error);
            else setTenants(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">AutoAtas Superadmin</h1>
                <button onClick={signOut} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm">
                    Sair
                </button>
            </nav>

            <div className="max-w-7xl mx-auto p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Clientes (Tenants)</h2>

                {loading ? (
                    <p>Carregando...</p>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                        <table className="w-full">
                            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold text-left">
                                <tr>
                                    <th className="px-6 py-4">Nome</th>
                                    <th className="px-6 py-4">Plano</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Cor Primária</th>
                                    <th className="px-6 py-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                                {tenants.map(tenant => (
                                    <tr key={tenant.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium">{tenant.name}</td>
                                        <td className="px-6 py-4">{tenant.plan_tier}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${tenant.plan_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {tenant.plan_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tenant.color_primary }} />
                                                {tenant.color_primary}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
