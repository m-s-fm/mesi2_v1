import React from 'react';
import { MessageCircle, Layers, Lock } from 'lucide-react';
import { Plateforme } from '@/lib/providers/types';

// Icônes personnalisées pour éviter les dépréciations de Lucide
const IconeTwitter = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const IconeInstagram = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const IconeDiscord = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 127.14 96.36" fill="currentColor">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53a105.73,105.73,0,0,0,32,16.15,86,86,0,0,0,6.77-11A68.06,68.06,0,0,1,28.66,77.53c.95-.7,1.89-1.44,2.79-2.2a75.76,75.76,0,0,0,71.38,0c.9,1.1,1.84,1.84,2.79,2.2a67.86,67.86,0,0,1-11.07,5.15,86,86,0,0,0,6.77,11,105.73,105.73,0,0,0,32-16.15C129,54.65,122.56,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
  </svg>
);

interface ProprietesOngletsPlateformes {
  plateformeActive: Plateforme | 'all';
  surChanger: (plateforme: Plateforme | 'all') => void;
  surClicVerrouille: (nomLabelPlateforme: string) => void;
}

/**
 * Menu de navigation par onglets pour filtrer la boîte de réception par messagerie externe.
 */
export default function OngletsPlateformes({
  plateformeActive,
  surChanger,
  surClicVerrouille
}: ProprietesOngletsPlateformes) {
  // Plateformes pleinement actives
  const plateformesActives: { id: Plateforme | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Tous', icon: null },
    { id: 'twitter', label: 'Twitter/X', icon: <IconeTwitter className="w-3.5 h-3.5 text-sky-400" /> }
  ];

  // Plateformes prévues mais verrouillées (MVP)
  const plateformesInactives = [
    { id: 'discord', label: 'Discord', icon: <IconeDiscord className="w-3.5 h-3.5 text-[#5865F2]" /> },
    { id: 'instagram', label: 'Instagram', icon: <IconeInstagram className="w-3.5 h-3.5 text-pink-500" /> },
    { id: 'messenger', label: 'Messenger', icon: <MessageCircle className="w-3.5 h-3.5 text-blue-500" /> },
    { id: 'threads', label: 'Threads', icon: <Layers className="w-3.5 h-3.5 text-white" /> }
  ];

  return (
    <nav className="flex items-center gap-1 bg-[#18181b] p-1 rounded-lg border border-[#27272a]">
      {/* Plateformes actives */}
      {plateformesActives.map(plateforme => {
        const estSelectionne = plateformeActive === plateforme.id;
        return (
          <button
            key={plateforme.id}
            onClick={() => surChanger(plateforme.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              estSelectionne
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {plateforme.icon}
            <span>{plateforme.label}</span>
          </button>
        );
      })}

      {/* Plateformes bientôt disponibles */}
      {plateformesInactives.map(plateforme => (
        <button
          key={plateforme.id}
          onClick={() => surClicVerrouille(plateforme.label)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 hover:text-zinc-400 transition-all cursor-pointer"
        >
          {plateforme.icon}
          <span>{plateforme.label}</span>
          <Lock className="w-2.5 h-2.5 opacity-60" />
        </button>
      ))}
    </nav>
  );
}
export { IconeTwitter, IconeInstagram, IconeDiscord };
