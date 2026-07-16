import React from 'react';
import { Message } from '@/lib/providers/types';

interface ProprietesBulleMessage {
  message: Message;
  estMoi: boolean;
}

/**
 * Formate l'heure d'envoi d'un message au format HH:MM.
 */
export function formaterHeure(chaineDate: string) {
  try {
    const date = new Date(chaineDate);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

/**
 * Bulle de discussion affichant un message individuel et ses métadonnées.
 */
export default function BulleMessage({ message, estMoi }: ProprietesBulleMessage) {
  return (
    <div className={`flex ${estMoi ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] flex flex-col ${estMoi ? 'items-end' : 'items-start'}`}>
        {!estMoi && message.nomExpediteur && (
          <span className="text-[9px] text-zinc-500 mb-1 ml-2.5 font-medium">
            {message.nomExpediteur}
          </span>
        )}
        
        {/* Contenu textuel */}
        <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
          estMoi 
            ? 'bg-white text-black font-medium rounded-tr-sm' 
            : 'bg-zinc-800 text-zinc-100 rounded-tl-sm border border-zinc-700/50'
        }`}>
          <p className="whitespace-pre-wrap break-words">{message.texte}</p>
        </div>

        {/* Date / Heure de création */}
        <span className="text-[8px] text-zinc-500 mt-1 mx-2.5 font-mono">
          {formaterHeure(message.creeLe)}
        </span>
      </div>
    </div>
  );
}
