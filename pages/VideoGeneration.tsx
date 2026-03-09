
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Upload, Sparkles, Film, ArrowLeft, Loader2, Download, AlertCircle, Play } from 'lucide-react';

interface VideoGenerationProps {
  onBack: () => void;
}

const REASSURING_MESSAGES = [
  "Mücevherinizin ışığını analiz ediyoruz...",
  "Yapay zeka fırçasıyla kareler işleniyor...",
  "Zarafet ve hareket bir araya geliyor...",
  "İsis sihrini videonuza ekliyoruz...",
  "Neredeyse hazır, son dokunuşlar yapılıyor...",
  "Güzellik zaman alır, sabrınız için teşekkürler..."
];

const VideoGeneration: React.FC<VideoGenerationProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [messageIndex, setMessageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      setVideoUrl(null);
      setError(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const generateVideo = async () => {
    if (!file) return;

    try {
      setIsGenerating(true);
      setError(null);
      setMessageIndex(0);

      // Cycle through reassuring messages
      const messageInterval = setInterval(() => {
        setMessageIndex(prev => (prev + 1) % REASSURING_MESSAGES.length);
      }, 8000);

      // 1. API Key Selection logic
      // Check if user has selected a key, if not open dialog
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Billing documentation: ai.google.dev/gemini-api/docs/billing
      }

      // Create new instance to ensure latest key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Image = await fileToBase64(file);

      let operation;
      try {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: 'Cinematic jewelry showcase with elegant camera movement, sparkling highlights, luxury atmosphere',
          image: {
            imageBytes: base64Image,
            mimeType: file.type,
          },
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio
          }
        });
      } catch (err: any) {
        if (err.message?.includes("Requested entity was not found")) {
          // Reset key selection if it failed due to invalid project/key
          // @ts-ignore
          await window.aistudio.openSelectKey();
          setIsGenerating(false);
          clearInterval(messageInterval);
          return;
        }
        throw err;
      }

      // 2. Polling loop
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
      } else {
        throw new Error("Video linki alınamadı.");
      }

      clearInterval(messageInterval);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Video oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto px-8 py-16 animate-in fade-in max-w-4xl">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em] mb-12"
      >
        <ArrowLeft size={16} /> Geri Dön
      </button>

      <div className="text-center mb-16">
        <h1 className="text-5xl serif mb-4">İsis <span className="italic text-amber-600">Sihri</span></h1>
        <p className="text-gray-500 text-xs tracking-[0.4em] uppercase">Mücevherlerinizi Veo Teknolojisi İle Canlandırın</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-sm shadow-xl overflow-hidden p-8 md:p-12">
        {!videoUrl && !isGenerating && (
          <div className="space-y-12">
            {/* Upload Area */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-sm p-12 text-center hover:border-amber-500 transition-colors cursor-pointer bg-gray-50/50 group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
              {previewUrl ? (
                <div className="relative inline-block">
                  <img src={previewUrl} alt="Preview" className="max-h-64 rounded-sm shadow-lg border border-white" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px] font-bold tracking-widest uppercase">Fotoğrafı Değiştir</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Upload className="text-gray-400 group-hover:text-amber-600 transition-colors" />
                  </div>
                  <div>
                    <p className="font-bold text-sm mb-1">Bir Mücevher Fotoğrafı Yükleyin</p>
                    <p className="text-xs text-gray-400 font-light">Maksimum 10MB, JPG veya PNG</p>
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-50">
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">VİDEO FORMATI</label>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex-1 py-4 border rounded-sm flex flex-col items-center gap-2 transition-all ${aspectRatio === '16:9' ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}
                  >
                    <div className="w-8 h-4 border-2 border-current rounded-sm"></div>
                    <span className="text-[9px] font-bold tracking-widest">YATAY (16:9)</span>
                  </button>
                  <button 
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex-1 py-4 border rounded-sm flex flex-col items-center gap-2 transition-all ${aspectRatio === '9:16' ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}
                  >
                    <div className="w-4 h-8 border-2 border-current rounded-sm"></div>
                    <span className="text-[9px] font-bold tracking-widest">DİKEY (9:16)</span>
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col justify-end">
                <button 
                  disabled={!file}
                  onClick={generateVideo}
                  className="w-full bg-black text-white py-4 text-[10px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  <Sparkles size={16} /> VİDEOYU OLUŞTUR
                </button>
                <p className="text-[9px] text-gray-400 mt-4 text-center">Video oluşturma işlemi birkaç dakika sürebilir.</p>
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-gray-100 border-t-amber-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Film className="text-amber-500 animate-pulse" size={32} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl serif mb-3">{REASSURING_MESSAGES[messageIndex]}</h3>
              <div className="w-64 h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-amber-500 animate-progress origin-left"></div>
              </div>
              <p className="text-[10px] text-gray-400 tracking-[0.2em] uppercase mt-8 font-bold">LÜTFEN SAYFAYI KAPATMAYIN</p>
            </div>
          </div>
        )}

        {videoUrl && (
          <div className="animate-in zoom-in duration-500">
             <div className="relative group overflow-hidden rounded-sm shadow-2xl bg-black">
                <video 
                  src={videoUrl} 
                  controls 
                  autoPlay 
                  loop 
                  className={`mx-auto max-h-[70vh] w-full object-contain ${aspectRatio === '9:16' ? 'max-w-[400px]' : ''}`}
                />
             </div>
             <div className="mt-12 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div>
                   <h3 className="text-2xl serif mb-1">Tebrikler!</h3>
                   <p className="text-xs text-gray-500 font-light">Mücevheriniz artık hayat buldu.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                   <button 
                     onClick={() => {
                        const a = document.createElement('a');
                        a.href = videoUrl;
                        a.download = 'lumina-animation.mp4';
                        a.click();
                     }}
                     className="flex-1 md:flex-none flex items-center justify-center gap-3 border border-black px-8 py-4 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-all"
                   >
                     <Download size={16} /> İNDİR
                   </button>
                   <button 
                     onClick={() => {
                        setVideoUrl(null);
                        setFile(null);
                        setPreviewUrl(null);
                     }}
                     className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-black text-white px-8 py-4 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-all"
                   >
                     <Play size={16} /> YENİ OLUŞTUR
                   </button>
                </div>
             </div>
          </div>
        )}

        {error && (
          <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-sm flex items-start gap-4 text-red-700 animate-in shake">
            <AlertCircle size={24} className="shrink-0" />
            <div>
              <p className="font-bold text-sm mb-1">Bir Hata Oluştu</p>
              <p className="text-xs leading-relaxed">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-3 text-[10px] font-bold uppercase tracking-widest underline underline-offset-4"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-16 text-center">
         <p className="text-[10px] text-gray-400 leading-relaxed max-w-lg mx-auto uppercase tracking-widest">
            Veo teknolojisi Google'ın en gelişmiş video üretim modelidir. 
            Oluşturulan videolar yapay zeka tarafından hayal edilmiştir.
         </p>
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        .animate-progress {
          animation: progress 60s linear forwards;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default VideoGeneration;
