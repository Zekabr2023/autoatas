
import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { FileAudioIcon } from './icons/FileAudioIcon';
import { FileVideoIcon } from './icons/FileVideoIcon';
import { AppState } from '../types';
import { Condo } from './CondoManager';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onStart: () => void;
  file: File | null;
  error: string;
  disabled: boolean;
  onClear: () => void;
  selectedCondo: Condo | null;
  onSelectCondo: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onStart, file, error, disabled, onClear, selectedCondo, onSelectCondo }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const triggerFileInput = () => {
    inputRef.current?.click();
  };

  const isVideo = file?.type.startsWith('video/');

  return (
    <div className="w-full max-w-2xl text-center bg-white/70 border border-white/50 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">

      {/* Condomínio Selecionado */}
      <div className="mb-4">
        {selectedCondo ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-3">
              {selectedCondo.logotipo_url ? (
                <img src={selectedCondo.logotipo_url} alt={selectedCondo.nome} className="w-10 h-10 rounded-lg object-cover border border-green-200" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              )}
              <div className="text-left">
                <p className="font-semibold text-green-800 text-sm">{selectedCondo.nome}</p>
                <p className="text-xs text-green-600">Condomínio selecionado</p>
              </div>
            </div>
            <button
              onClick={onSelectCondo}
              className="text-xs text-green-700 hover:text-green-900 font-medium hover:underline"
            >
              Alterar
            </button>
          </div>
        ) : (
          <button
            onClick={onSelectCondo}
            className="w-full flex items-center justify-center gap-2 bg-amber-50 border-2 border-dashed border-amber-300 rounded-lg p-4 text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="font-semibold">Selecione o Condomínio</span>
            <span className="text-xs bg-amber-200 px-2 py-0.5 rounded-full">Obrigatório</span>
          </button>
        )}
      </div>

      {!file ? (
        <div
          className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors duration-300 cursor-pointer ${isDragging ? 'border-brand-orange bg-brand-orange/10' : 'border-brand-orange/30 hover:border-brand-orange hover:bg-brand-orange/5'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input
            type="file"
            ref={inputRef}
            onChange={handleFileChange}
            accept="audio/*,video/*"
            className="hidden"
          />
          <div className="absolute inset-0 bg-white/50 opacity-50"></div>
          <div className="relative z-10 flex flex-col items-center">
            <UploadIcon className="w-12 h-12 text-slate-800 mb-4" />
            <p className="text-slate-800 font-semibold">Arraste e solte o arquivo de áudio ou vídeo aqui</p>
            <p className="text-slate-600 mt-1">ou</p>
            <button
              type="button"
              className="mt-2 text-brand-orange-dark font-semibold hover:text-brand-orange transition-colors uppercase text-sm tracking-wide"
            >
              Selecione um arquivo
            </button>
            <p className="text-xs text-slate-500 mt-4">Formatos suportados: MP4, MOV, MP3, WAV, etc.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full animate-fade-in">
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4 relative">
            <button
              onClick={onClear}
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              title="Remover arquivo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className={`p-3 rounded-lg ${isVideo ? 'bg-blue-100 text-blue-600' : 'bg-brand-orange/10 text-brand-orange'}`}>
              {isVideo ? (
                <FileVideoIcon className="w-8 h-8" />
              ) : (
                <FileAudioIcon className="w-8 h-8" />
              )}
            </div>
            <div className="text-left overflow-hidden flex-1">
              <p className="font-semibold text-slate-900 truncate">{file.name}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="font-medium bg-slate-200 px-1.5 py-0.5 rounded">{file.type || 'Arquivo desconhecido'}</span>
                <span>•</span>
                <span>{formatFileSize(file.size)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-2">Somente 1 arquivo por vez</p>

          <button
            onClick={onStart}
            disabled={disabled || !selectedCondo}
            title={!selectedCondo ? "Selecione um condomínio primeiro" : disabled ? "Preencha o nome do condomínio para começar" : "Iniciar Transcrição"}
            className="interactive-button mt-6 w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-brand-orange/20 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            Transcrever e Diarizar
          </button>
        </div>
      )}
      {error && <p className="text-red-500 dark:text-red-400 mt-4">{error}</p>}
    </div>
  );
};

export default FileUpload;