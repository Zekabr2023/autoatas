import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function VideoBackground() {
    const { tenant } = useTheme();

    if (!tenant?.video_bg_url) return null;

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <iframe
                className="w-full h-full object-cover scale-150 pointer-events-none select-none"
                src={`${tenant.video_bg_url}?autoplay=1&mute=1&controls=0&loop=1&playlist=${tenant.video_bg_url.split('/').pop()}`}
                title="Background Video"
                frameBorder="0"
                allow="autoplay; encrypted-media"
                tabIndex={-1}
            />
            {/* Overlay for Opacity/Color blending */}
            <div
                className="absolute inset-0 z-10 bg-slate-900 transition-opacity duration-1000"
                style={{ opacity: 1 - (tenant.video_bg_opacity ?? 0.5) }}
            />
        </div>
    );
}
