import React, { useState, useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon, Sparkles, Download, RefreshCw, AlertCircle, ChevronRight, Maximize2, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processImageLocally } from './services/localProcessor';

export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Mohon unggah file gambar yang valid (PNG, JPG, dll).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setEnhancedImage(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const processImage = async () => {
    if (!originalImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Menggunakan Local Engine buatan sendiri
      const result = await processImageLocally(originalImage);
      setEnhancedImage(result);
    } catch (err) {
      setError('Gagal memproses gambar secara lokal.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!enhancedImage) return;
    const link = document.createElement('a');
    link.href = enhancedImage;
    link.download = 'jernih-ai-local.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setOriginalImage(null);
    setEnhancedImage(null);
    setError(null);
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 rounded-full mb-4 text-indigo-700 text-xs font-bold uppercase tracking-widest shadow-sm">
          <Cpu size={14} />
          <span>Personal AI Engine v3.1 • Ultra HD Optimized</span>
        </div>
        <h1 className="text-4xl font-bold text-neutral-900 tracking-tight sm:text-5xl mb-4">
          Penjernih Foto <span className="text-indigo-600">Ultra HD</span>
        </h1>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Teknologi <strong>Smart Upscaling</strong> yang ringan. Hasil super jernih dan tajam tanpa membuat HP Anda lag atau panas.
        </p>
      </motion.div>

      <main className="w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {!originalImage ? (
            /* Upload Section */
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 ${
                dragActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-neutral-300 bg-white hover:border-emerald-400 hover:bg-neutral-50'
              }`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onFileChange} 
                className="hidden" 
                accept="image/*"
              />
              <div className="py-24 flex flex-col items-center text-center px-6">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 text-emerald-500 group-hover:scale-110 transition-transform duration-300">
                  <Upload size={40} />
                </div>
                <h3 className="text-xl font-semibold text-neutral-800 mb-2">Unggah Foto Anda</h3>
                <p className="text-neutral-500 mb-8">Tarik dan lepas gambar di sini, atau klik untuk memilih file</p>
                <div className="flex gap-4 text-xs text-neutral-400 font-medium uppercase tracking-wider">
                  <span>PNG</span>
                  <span>JPG</span>
                  <span>WEBP</span>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Preview & Process Section */
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-3xl overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Original Image */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Asli</span>
                      <ImageIcon size={18} className="text-neutral-400" />
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 relative group">
                      <img 
                        src={originalImage} 
                        alt="Original" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Enhanced Image */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Hasil AI</span>
                      <Sparkles size={18} className="text-emerald-500" />
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 relative flex items-center justify-center">
                      {isProcessing ? (
                        <div className="flex flex-col items-center space-y-4">
                          <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" />
                          <p className="text-emerald-600 font-medium animate-pulse">Menjernihkan foto...</p>
                        </div>
                      ) : enhancedImage ? (
                        <motion.img 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          src={enhancedImage} 
                          alt="Enhanced" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-center px-6">
                          <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-300">
                            <ImageIcon size={32} />
                          </div>
                          <p className="text-neutral-400">Klik tombol di bawah untuk mulai memproses</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600"
                  >
                    <AlertCircle size={20} />
                    <p className="text-sm font-medium">{error}</p>
                  </motion.div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-6 border-t border-neutral-100">
                  <button
                    onClick={reset}
                    className="text-neutral-500 hover:text-neutral-800 font-medium transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={18} />
                    Ganti Foto
                  </button>
                  
                  <div className="flex gap-4 w-full sm:w-auto">
                    {!enhancedImage ? (
                      <button
                        onClick={processImage}
                        disabled={isProcessing}
                        className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 group"
                      >
                        {isProcessing ? 'Memproses...' : 'Jernihkan Sekarang'}
                        {!isProcessing && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                      </button>
                    ) : (
                      <button
                        onClick={downloadImage}
                        className="w-full sm:w-auto px-8 py-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold shadow-lg shadow-neutral-200 transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={20} />
                        Unduh Hasil
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features Section */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Maximize2 className="text-blue-500" />,
              title: "Resolusi Tinggi",
              desc: "Meningkatkan detail dan ketajaman gambar tanpa pecah."
            },
            {
              icon: <Sparkles className="text-amber-500" />,
              title: "Pembersihan Noise",
              desc: "Menghilangkan bintik-bintik dan noise pada foto minim cahaya."
            },
            {
              icon: <ImageIcon className="text-emerald-500" />,
              title: "Restorasi AI",
              desc: "Memperbaiki foto lama atau buram menjadi terlihat baru."
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100"
            >
              <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h4 className="text-lg font-bold text-neutral-900 mb-2">{feature.title}</h4>
              <p className="text-neutral-500 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="mt-24 text-neutral-400 text-sm">
        &copy; {new Date().getFullYear()} Penjernih Foto AI. Ditenagai oleh Personal AI Engine.
      </footer>
    </div>
  );
}
