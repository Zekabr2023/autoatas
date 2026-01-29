
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface PageLayoutProps {
    children: React.ReactNode;
    header?: React.ReactNode;
}

export default function PageLayout({ children, header }: PageLayoutProps) {
    const { tenant } = useTheme();

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-transparent">
            {/* Content Wrapper */}
            <div className={`relative z-10 flex flex-col min-h-screen`}>
                {header}

                <div className="flex-1 w-full flex flex-col items-center p-4 sm:p-6 lg:p-8 animate-fade-in">
                    {children}
                </div>

                <footer className="w-full text-center p-4 mt-8 text-slate-500/80 text-sm backdrop-blur-sm">
                    <p>
                        Powered by <a href="https://automabo.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-brand-orange hover:underline transition-colors font-medium">Automabo</a>
                    </p>
                </footer>
            </div>
        </div>
    );
};
