import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase as userSupabase } from '../services/supabaseClient';

// API Test Section Component
const ApiTestSection: React.FC<{ apiKey: string; setApiKey: (key: string) => void }> = ({ apiKey, setApiKey }) => {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleTestApi = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('Por favor, insira uma chave de API válida.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testando conexão...');

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { method: 'GET' }
      );

      if (response.ok) {
        setTestStatus('success');
        setTestMessage('✓ Conexão estabelecida com sucesso! A chave está funcionando.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setTestStatus('error');
        setTestMessage(errorData?.error?.message || `Erro ${response.status}: Chave inválida ou sem permissão.`);
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage('Erro de conexão. Verifique sua internet e tente novamente.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-300 mb-1">Chave de API do Gemini</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setTestStatus('idle');
            setTestMessage('');
          }}
          className="w-full px-4 py-2 border border-white/10 bg-black/40 rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all font-mono text-sm text-white"
          placeholder="AIzaSy..."
        />
        <p className="text-xs text-slate-500 mt-1">Sua chave é salva apenas neste dispositivo.</p>
      </div>

      <button
        type="button"
        onClick={handleTestApi}
        disabled={testStatus === 'testing'}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${testStatus === 'testing'
            ? 'bg-slate-700 text-slate-400 cursor-wait'
            : testStatus === 'success'
              ? 'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30'
              : testStatus === 'error'
                ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'
                : 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30'
          }`}
      >
        {testStatus === 'testing' ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Testando...
          </>
        ) : testStatus === 'success' ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            API Funcionando
          </>
        ) : testStatus === 'error' ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Testar Novamente
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Testar API
          </>
        )}
      </button>

      {testMessage && (
        <div className={`text-sm p-3 rounded-lg ${testStatus === 'success'
            ? 'bg-green-900/30 text-green-300 border border-green-500/20'
            : testStatus === 'error'
              ? 'bg-red-900/30 text-red-300 border border-red-500/20'
              : 'bg-slate-800 text-slate-300'
          }`}>
          {testMessage}
        </div>
      )}
    </div>
  );
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // initialName/Logo are deprecated in favor of ThemeContext, but keeping for compatibility if direct props usage exists
  initialName?: string;
  initialLogo?: string | null;
  onSave?: (name: string, logo: string | null, apiKey: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialName, initialLogo, onSave }) => {
  const { tenant, updateTenant } = useTheme();
  // We manage local state for logo height for immediate preview, but save it via updateTenant
  const [localLogoHeight, setLocalLogoHeight] = useState(40);

  const [name, setName] = useState(initialName || '');
  const [logoUrl, setLogoUrl] = useState(initialLogo || '');
  const [logoStyle, setLogoStyle] = useState<'original' | 'white' | 'black'>('original');
  const [colorPrimary, setColorPrimary] = useState('#F27649');
  const [colorSecondary, setColorSecondary] = useState('#10B981'); // Default Green
  const [videoUrl, setVideoUrl] = useState('');
  const [videoOpacity, setVideoOpacity] = useState(0.5);
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'api'>('general');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || '');
      setLogoUrl(tenant.logo_url || '');
      setLogoStyle(tenant.logo_style || 'original');
      setColorPrimary(tenant.color_primary || '#F27649');
      setColorSecondary(tenant.color_secondary || '#10B981');
      setVideoUrl(tenant.video_bg_url || '');
      setVideoOpacity(tenant.video_bg_opacity || 0.5);
      setLocalLogoHeight(tenant.logo_height || 40);
    }
    const storedKey = localStorage.getItem('geminiApiKey');
    if (storedKey) setApiKey(storedKey);
  }, [tenant, isOpen]);

  // Live preview via DOM manipulation to avoid re-renders/DB calls
  useEffect(() => {
    const headerImg = document.querySelector('header nav img') as HTMLElement;
    if (headerImg) {
      headerImg.style.height = `${localLogoHeight}px`;
    }
  }, [localLogoHeight]);

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      // Simple YouTube ID extraction
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);

      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Process video URL before saving
    const processedVideoUrl = getEmbedUrl(videoUrl);

    try {
      // Save API Key locally (it's user/device specific for now)
      if (apiKey) localStorage.setItem('geminiApiKey', apiKey);

      // Save Tenant Settings if authenticated and tenant exists
      if (tenant) {
        await updateTenant({
          name,
          logo_url: logoUrl,
          logo_style: logoStyle,
          color_primary: colorPrimary,
          color_secondary: colorSecondary,
          video_bg_url: processedVideoUrl, // Use processed URL
          video_bg_opacity: videoOpacity,
          logo_height: localLogoHeight // Saving the height
        });
      } else if (onSave) {
        // Fallback for non-SaaS/Local mode
        onSave(name, logoUrl, apiKey);
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert('Falha ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 md:pt-20 transition-all duration-300 ${isDraggingSlider ? 'bg-black/10 backdrop-blur-[1px]' : 'bg-black/60 backdrop-blur-md'} animate-fade-in`}>
      <div className={`bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transition-opacity duration-300 ${isDraggingSlider ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-transparent">
          <h2 className="text-xl font-bold text-white">Definições da Conta</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${activeTab === 'general' ? 'text-brand-orange border-b-2 border-brand-orange bg-brand-orange/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            Geral
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${activeTab === 'branding' ? 'text-brand-orange border-b-2 border-brand-orange bg-brand-orange/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            Personalização
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${activeTab === 'api' ? 'text-brand-orange border-b-2 border-brand-orange bg-brand-orange/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            Integrações (API)
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form onSubmit={handleSave} className="space-y-6">
            {activeTab === 'general' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Nome da Empresa</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-white/10 bg-black/40 rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all text-white placeholder-slate-500"
                    placeholder="Minha Administradora"
                  />
                  <p className="text-xs text-slate-500 mt-1">Este nome aparecerá nos cabeçalhos das atas.</p>
                </div>
              </>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-8 animate-fade-in">
                {/* Logo Section */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10 shadow-inner">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Logo da Empresa
                  </h3>

                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Preview Box */}
                    <label className={`w-full md:w-48 h-32 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-white/20 hover:border-brand-orange hover:bg-white/5 cursor-pointer relative group transition-all backdrop-blur-sm ${uploadingLogo ? 'pointer-events-none opacity-80' : ''}`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingLogo}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (file.size > 5 * 1024 * 1024) {
                            alert("O arquivo é muito grande. O tamanho máximo permitido é 5MB.");
                            return;
                          }

                          const objectUrl = URL.createObjectURL(file);
                          setLogoUrl(objectUrl);

                          try {
                            setUploadingLogo(true);
                            const fileExt = file.name.split('.').pop();
                            const fileName = `${tenant?.id || 'temp'}-${Date.now()}.${fileExt}`;

                            const uploadPromise = userSupabase.storage.from('logos').upload(fileName, file, { upsert: true });
                            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), 15000));

                            const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;
                            if (uploadError) throw uploadError;

                            const { data: { publicUrl } } = userSupabase.storage.from('logos').getPublicUrl(fileName);
                            setLogoUrl(publicUrl);
                          } catch (error) {
                            console.error('Error uploading logo:', error);
                            alert('Erro ao fazer upload do logo.');
                            setLogoUrl(initialLogo || '');
                          } finally {
                            setUploadingLogo(false);
                          }
                        }}
                      />
                      {logoUrl ? (
                        <>
                          <img
                            src={logoUrl}
                            alt="Logo Preview"
                            className={`max-w-full max-h-full object-contain p-2 transition-opacity ${uploadingLogo ? 'opacity-50' : 'opacity-100'} ${logoStyle === 'white' ? 'brightness-0 invert' : logoStyle === 'black' ? 'brightness-0' : ''}`}
                          />
                          {uploadingLogo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center text-slate-500 group-hover:text-brand-orange">
                          <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span className="text-xs font-semibold">Upload Logo</span>
                        </div>
                      )}
                      {logoUrl && !uploadingLogo && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs font-bold bg-white/10 border border-white/20 px-2 py-1 rounded backdrop-blur-md">Trocar</span>
                        </div>
                      )}
                    </label>

                    <div className="flex-1 space-y-4 w-full">
                      <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">Logo via URL</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={logoUrl.startsWith('blob:') ? 'Arquivo selecionado para upload...' : logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            disabled={logoUrl.startsWith('blob:') || uploadingLogo}
                            className="w-full pl-10 pr-4 py-2.5 border border-white/10 bg-black/40 rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all text-white disabled:opacity-50"
                            placeholder="https://exemplo.com/logo.png"
                          />
                          <svg className="w-5 h-5 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">Estilo de Exibição</label>
                        <div className="flex gap-4">
                          {['original', 'white', 'black'].map((style) => (
                            <label key={style} className="flex items-center gap-2 cursor-pointer group">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${logoStyle === style ? 'border-brand-orange' : 'border-slate-500'}`}>
                                {logoStyle === style && <div className="w-2 h-2 bg-brand-orange rounded-full" />}
                              </div>
                              <input
                                type="radio"
                                name="logoStyle"
                                value={style}
                                checked={logoStyle === style}
                                onChange={(e) => setLogoStyle(e.target.value as any)}
                                className="hidden"
                              />
                              <span className={`text-sm capitalize transition-colors ${logoStyle === style ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                {style === 'original' ? 'Original' : style === 'white' ? 'Branco' : 'Preto'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full pt-6 mt-2 border-t border-white/10">
                    <div className="flex justify-between mb-2">
                      <label className="block text-sm font-bold text-slate-300">Tamanho do Logo no Cabeçalho</label>
                      <span className="text-sm font-bold text-brand-orange">{localLogoHeight}px</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="80"
                      step="2"
                      value={localLogoHeight}
                      onChange={(e) => setLocalLogoHeight(parseInt(e.target.value))}
                      onMouseDown={() => setIsDraggingSlider(true)}
                      onMouseUp={() => setIsDraggingSlider(false)}
                      onTouchStart={() => setIsDraggingSlider(true)}
                      onTouchEnd={() => setIsDraggingSlider(false)}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-orange hover:accent-brand-orange-light transition-all"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Pequeno (30px)</span>
                      <span>Grande (80px)</span>
                    </div>
                  </div>
                </div>

                {/* Identity Section */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10 shadow-inner">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Identidade Visual
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Cor Primária</label>
                      <div className="flex items-center gap-3">
                        <div className="relative overflow-hidden rounded-lg w-12 h-12 shadow-sm border border-white/20">
                          <input
                            type="color"
                            value={colorPrimary}
                            onChange={(e) => setColorPrimary(e.target.value)}
                            className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-0"
                          />
                        </div>
                        <input
                          type="text"
                          value={colorPrimary}
                          onChange={(e) => setColorPrimary(e.target.value)}
                          className="w-32 px-4 py-2.5 border border-white/10 bg-black/40 rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all uppercase font-mono text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Cor Secundária</label>
                      <div className="flex items-center gap-3">
                        <div className="relative overflow-hidden rounded-lg w-12 h-12 shadow-sm border border-white/20">
                          <input
                            type="color"
                            value={colorSecondary}
                            onChange={(e) => setColorSecondary(e.target.value)}
                            className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-0"
                          />
                        </div>
                        <input
                          type="text"
                          value={colorSecondary}
                          onChange={(e) => setColorSecondary(e.target.value)}
                          className="w-32 px-4 py-2.5 border border-white/10 bg-black/40 rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all uppercase font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video Background Section */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10 shadow-inner">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.818v6.364a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Fundo da Aplicação
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">URL do Vídeo</label>
                      <input
                        type="text"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="w-full px-4 py-2.5 border border-white/10 bg-black/40 rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all text-white"
                        placeholder="https://www.youtube.com/embed/..."
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="block text-sm font-bold text-slate-300">Opacidade / Visibilidade</label>
                        <span className="text-sm font-bold text-brand-orange">{Math.round((1 - videoOpacity) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={videoOpacity}
                        onChange={(e) => setVideoOpacity(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Transparente</span>
                        <span>Sólido</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <ApiTestSection apiKey={apiKey} setApiKey={setApiKey} />
            )}

            <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || uploadingLogo}
                className="px-6 py-2 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed border border-brand-orange/20"
              >
                {saving ? 'Salvando...' : uploadingLogo ? 'Enviando Logo...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;