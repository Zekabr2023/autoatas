import React from 'react';

export const ListOlIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="10" x2="21" y1="6" y2="6" />
    <line x1="10" x2="21" y1="12" y2="12" />
    <line x1="10" x2="21" y1="18" y2="18" />
    <path d="M4 6h1v4" />
    <path d="M4 12h1.5c.8 0 1.5.7 1.5 1.5v1c0 .8-.7 1.5-1.5 1.5H4" />
    <path d="M5 18h-1v-1.5c0-.8.7-1.5 1.5-1.5h0c.8 0 1.5.7 1.5 1.5v0c0 .8-.7 1.5-1.5 1.5h-1.5" />
  </svg>
);