import React, { useState } from 'react';
import { MinutesTemplate } from '../types';
import MeetingDetailsModal from './MeetingDetailsModal';
import { Condo } from './CondoManager';

interface TranscriptionViewProps {
  transcription: string;
  onGenerate: (details?: any) => void;
  onReset: () => void;
  error: string;
  minutesTemplate: MinutesTemplate;
  setMinutesTemplate: (template: MinutesTemplate) => void;
  selectedCondo: Condo | null;
}

const TranscriptionView: React.FC<TranscriptionViewProps> = ({ transcription, onGenerate, onReset, error, minutesTemplate, setMinutesTemplate, selectedCondo }) => {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  return (
    <div className="w-full bg-white/70 border border-white/50 rounded-2xl p-6 shadow-2xl animate-fade-in backdrop-blur-xl">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Transcrição da Reunião</h2>
      <div className="prose prose-slate max-w-none bg-white/40 rounded-lg p-4 h-96 overflow-y-auto border border-white/30 backdrop-blur-sm">
        {transcription.split('\n').map((line, index) => (
          <p key={index} className="my-2">{line}</p>
        ))}
      </div>

      <div className="mt-6">
        <label htmlFor="template-select" className="block text-sm font-medium text-slate-600 mb-2">
          Modelo da Ata
        </label>
        <select
          id="template-select"
          value={minutesTemplate}
          onChange={(e) => setMinutesTemplate(e.target.value as MinutesTemplate)}
          className="w-full bg-white/50 border border-white/30 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all backdrop-blur-sm"
        >
          <option value={MinutesTemplate.FORMAL}>Ata Formal Completa</option>
          <option value={MinutesTemplate.SUMMARY}>Resumo Executivo (Decisões e Ações)</option>
          <option value={MinutesTemplate.AGENDA}>Pauta com Deliberações</option>
        </select>
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <button
          onClick={onReset}
          className="interactive-button w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-lg transition-colors border border-slate-200"
        >
          Começar de Novo
        </button>
        <button
          onClick={() => setIsDetailsModalOpen(true)}
          className="interactive-button flex-1 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-brand-orange/20"
        >
          Gerar Ata da Reunião
        </button>
      </div>

      <MeetingDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onConfirm={(details) => onGenerate(details)}
        initialData={{
          condoName: selectedCondo?.nome || '',
          president: selectedCondo?.presidente || '',
          secretary: selectedCondo?.secretario || '',
        }}
      />
    </div>
  );
};

export default TranscriptionView;