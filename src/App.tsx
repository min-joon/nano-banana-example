/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Settings, 
  History, 
  Download, 
  Plus, 
  Loader2, 
  Search, 
  Maximize2, 
  Trash2, 
  AlertCircle,
  Key,
  ExternalLink,
  Upload,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateImage } from './lib/gemini';
import { AspectRatio, ImageSize, GeneratedImage } from './types';
import { getYourKey, setYourKey as saveYourKey } from './lib/utils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const ASPECT_RATIOS: AspectRatio[] = ["1:1", "3:4", "4:3", "9:16", "16:9"];
const IMAGE_SIZES: ImageSize[] = ["1K", "2K", "4K"];

const LOADING_MESSAGES = [
  "Consulting the digital muse...",
  "Mixing pixels and imagination...",
  "Rendering your vision in high fidelity...",
  "Almost there, just adding a touch of magic...",
  "The AI is deep in thought...",
  "Crafting your masterpiece...",
];

export default function App() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [useSearch, setUseSearch] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [uploadImage, setUploadImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [yourKey, setYourKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState('');

  useEffect(() => {
    checkKey();
    const savedKey = getYourKey();
    if (savedKey) {
      setYourKey(savedKey);
    } else {
      setShowKeyModal(true);
    }
    
    const saved = localStorage.getItem('nano-banana-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nano-banana-history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    let interval: number;
    if (isGenerating) {
      interval = window.setInterval(() => {
        setLoadingMessage(prev => {
          const idx = LOADING_MESSAGES.indexOf(prev);
          return LOADING_MESSAGES[(idx + 1) % LOADING_MESSAGES.length];
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const checkKey = async () => {
    if (window.aistudio) {
      const has = await window.aistudio.hasSelectedApiKey();
      setHasKey(has);
    } else {
      setHasKey(true); // Fallback for local dev if needed, but in AI Studio it should be there
    }
  };

  const handleOpenKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadImage({
          data: (reader.result as string).split(',')[1],
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [] },
    multiple: false 
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const { imageUrl } = await generateImage({
        prompt,
        aspectRatio,
        imageSize,
        useSearch,
        base64Image: uploadImage?.data,
        mimeType: uploadImage?.mimeType
      });

      const newImage: GeneratedImage = {
        id: crypto.randomUUID(),
        url: imageUrl,
        prompt,
        timestamp: Date.now(),
        config: { aspectRatio, imageSize, useSearch }
      };

      setHistory(prev => [newImage, ...prev]);
      setSelectedImage(newImage);
      setPrompt('');
      setUploadImage(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.url;
    link.download = `nano-banana-${img.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteImage = (id: string) => {
    setHistory(prev => prev.filter(img => img.id !== id));
    if (selectedImage?.id === id) setSelectedImage(null);
  };

  const handleSaveYourKey = (val: string) => {
    setYourKey(val);
    saveYourKey(val);
  };

  const handleModalSubmit = () => {
    if (tempKey.trim()) {
      handleSaveYourKey(tempKey);
      setShowKeyModal(false);
      setTempKey('');
    }
  };

  const handleOpenModifyModal = () => {
    setTempKey(yourKey);
    setShowKeyModal(true);
  };

  return (
    <>
      {/* Key Entry Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-secondary/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-white brutal-border p-8 space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-primary rounded-lg flex items-center justify-center brutal-border">
                  <Key className="w-6 h-6 text-brand-secondary" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Welcome Creator</h2>
              </div>
              
              <p className="text-brand-secondary/70 font-medium">
                Please enter your <span className="font-bold text-brand-secondary">YOUR_KEY</span> to initialize the application. This key will be stored locally.
              </p>

              <div className="space-y-4">
                <input 
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="Enter YOUR_KEY..."
                  className="w-full brutal-input font-bold"
                  onKeyDown={(e) => e.key === 'Enter' && handleModalSubmit()}
                  autoFocus
                />
                <button 
                  onClick={handleModalSubmit}
                  disabled={!tempKey.trim()}
                  className="w-full brutal-button bg-brand-primary text-brand-secondary py-4 text-lg disabled:opacity-50"
                >
                  {yourKey ? "SAVE CHANGES" : "START CREATING"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasKey === false ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-brand-bg">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-white brutal-border p-8 text-center space-y-6"
          >
            <div className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center mx-auto brutal-border">
              <Key className="w-8 h-8 text-brand-secondary" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">API Key Required</h1>
            <p className="text-brand-secondary/70 font-medium">
              To use Nano Banana Pro, you need to select a paid Google Cloud project API key.
            </p>
            <div className="space-y-4">
              <button 
                onClick={handleOpenKey}
                className="w-full brutal-button bg-brand-primary text-brand-secondary py-4 text-lg"
              >
                Select API Key
              </button>
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm font-bold hover:underline"
              >
                Learn about billing <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col md:flex-row bg-brand-bg">
          {/* Sidebar - History */}
          <aside className="w-full md:w-80 bg-white border-r-2 border-brand-secondary flex flex-col h-screen sticky top-0">
            <div className="p-6 border-b-2 border-brand-secondary bg-brand-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center brutal-border">
                  <ImageIcon className="w-6 h-6 text-brand-secondary" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-black uppercase tracking-tighter leading-none">
                    Nano Banana<br/><span className="text-brand-primary drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">Pro Creator</span>
                  </h1>
                  {yourKey && (
                    <span className="text-[10px] font-mono text-brand-secondary/60 mt-1 truncate max-w-[150px]">
                      KEY: {yourKey.substring(0, 4)}••••{yourKey.substring(yourKey.length - 4)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xs font-black uppercase tracking-widest text-brand-secondary/50 flex items-center gap-2">
                  <History className="w-3 h-3" /> History
                </h2>
                <span className="text-[10px] font-mono bg-brand-secondary text-white px-2 py-0.5 rounded">
                  {history.length} ITEMS
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {history.map((img) => (
                  <motion.button
                    layoutId={img.id}
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    className={cn(
                      "aspect-square brutal-border overflow-hidden relative group",
                      selectedImage?.id === img.id && "ring-4 ring-brand-primary ring-offset-2"
                    )}
                  >
                    <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-6 h-6 text-white" />
                    </div>
                  </motion.button>
                ))}
                {history.length === 0 && (
                  <div className="col-span-2 py-12 text-center space-y-2 opacity-30">
                    <Plus className="w-8 h-8 mx-auto" />
                    <p className="text-xs font-bold uppercase">No history yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t-2 border-brand-secondary bg-brand-secondary text-white">
              <div className="flex flex-col gap-2 mb-4">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-60">YOUR_KEY Configuration</label>
                <div className="flex items-center justify-between bg-white/10 border border-white/20 rounded px-3 py-2">
                  <span className="text-xs font-mono opacity-80 truncate max-w-[120px]">
                    {yourKey ? "••••••••••••" : "Not Set"}
                  </span>
                  <button 
                    onClick={handleOpenModifyModal}
                    className="text-[10px] font-bold uppercase bg-white/20 hover:bg-brand-primary hover:text-brand-secondary px-2 py-1 rounded transition-colors"
                  >
                    Modify
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest opacity-60">
                <span>Status: Ready</span>
                <span>v1.0.0</span>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-h-screen">
            {/* Header / Controls */}
            <header className="p-6 bg-white border-b-2 border-brand-secondary sticky top-0 z-10">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the image you want to create..."
                      className="w-full brutal-input min-h-[100px] resize-none pr-12 font-medium"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.metaKey) handleGenerate();
                      }}
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-brand-secondary/40 hidden md:block">
                        CMD + ENTER TO GENERATE
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className={cn(
                      "md:w-48 brutal-button flex items-center justify-center gap-2 text-lg",
                      isGenerating ? "bg-brand-secondary text-white" : "bg-brand-primary text-brand-secondary"
                    )}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-6 h-6" /> GENERATE
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary/50 flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" /> Aspect Ratio
                    </label>
                    <div className="flex gap-1">
                      {ASPECT_RATIOS.map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setAspectRatio(ratio)}
                          className={cn(
                            "px-3 py-1 text-xs font-bold brutal-border transition-colors",
                            aspectRatio === ratio ? "bg-brand-secondary text-white" : "bg-white hover:bg-brand-primary/20"
                          )}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary/50 flex items-center gap-1">
                      <Settings className="w-3 h-3" /> Resolution
                    </label>
                    <div className="flex gap-1">
                      {IMAGE_SIZES.map((size) => (
                        <button
                          key={size}
                          onClick={() => setImageSize(size)}
                          className={cn(
                            "px-3 py-1 text-xs font-bold brutal-border transition-colors",
                            imageSize === size ? "bg-brand-secondary text-white" : "bg-white hover:bg-brand-primary/20"
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary/50 flex items-center gap-1">
                      <Search className="w-3 h-3" /> Grounding
                    </label>
                    <button
                      onClick={() => setUseSearch(!useSearch)}
                      className={cn(
                        "px-4 py-1 text-xs font-bold brutal-border flex items-center gap-2 transition-colors",
                        useSearch ? "bg-brand-primary text-brand-secondary" : "bg-white hover:bg-brand-primary/20"
                      )}
                    >
                      {useSearch ? "SEARCH ON" : "SEARCH OFF"}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary/50 flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Image Input
                    </label>
                    <div {...getRootProps()} className={cn(
                      "px-4 py-1 text-xs font-bold brutal-border cursor-pointer transition-colors",
                      uploadImage ? "bg-brand-primary text-brand-secondary" : "bg-white hover:bg-brand-primary/20",
                      isDragActive && "bg-brand-primary/40"
                    )}>
                      <input {...getInputProps()} />
                      {uploadImage ? "IMAGE LOADED" : "UPLOAD IMAGE"}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Workspace */}
            <div className="flex-1 p-6 overflow-y-auto bg-brand-bg/50">
              <div className="max-w-4xl mx-auto h-full">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      className="h-full flex flex-col items-center justify-center space-y-8 py-20"
                    >
                      <div className="relative">
                        <div className="w-32 h-32 border-4 border-brand-secondary border-t-brand-primary rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-brand-secondary" />
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">{loadingMessage}</h3>
                        <p className="text-brand-secondary/50 font-mono text-sm">ESTIMATED TIME: 15-30 SECONDS</p>
                      </div>
                    </motion.div>
                  ) : error ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center space-y-4 py-20"
                    >
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center brutal-border border-red-600">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <div className="text-center max-w-md">
                        <h3 className="text-xl font-black uppercase text-red-600">Generation Failed</h3>
                        <p className="text-brand-secondary/70 mt-2">{error}</p>
                        <button 
                          onClick={() => setError(null)}
                          className="mt-6 brutal-button bg-white"
                        >
                          DISMISS
                        </button>
                      </div>
                    </motion.div>
                  ) : selectedImage ? (
                    <motion.div
                      key={selectedImage.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="relative group brutal-border bg-white p-2">
                        <img 
                          src={selectedImage.url} 
                          alt={selectedImage.prompt} 
                          className="w-full h-auto shadow-inner"
                        />
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => downloadImage(selectedImage)}
                            className="p-3 bg-white brutal-border hover:bg-brand-primary transition-colors"
                            title="Download"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => deleteImage(selectedImage.id)}
                            className="p-3 bg-white brutal-border hover:bg-red-500 hover:text-white transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-white brutal-border p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase tracking-widest text-brand-secondary/50">Prompt Details</h3>
                          <span className="text-[10px] font-mono text-brand-secondary/40">
                            {new Date(selectedImage.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-lg font-medium leading-relaxed italic">"{selectedImage.prompt}"</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-brand-secondary text-white text-[10px] font-mono uppercase">
                            {selectedImage.config.aspectRatio}
                          </span>
                          <span className="px-2 py-1 bg-brand-secondary text-white text-[10px] font-mono uppercase">
                            {selectedImage.config.imageSize}
                          </span>
                          {selectedImage.config.useSearch && (
                            <span className="px-2 py-1 bg-brand-primary text-brand-secondary text-[10px] font-mono uppercase font-bold">
                              GROUNDED
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center space-y-6 py-20 opacity-20">
                      <div className="w-32 h-32 border-4 border-dashed border-brand-secondary rounded-3xl flex items-center justify-center">
                        <Plus className="w-16 h-16" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Ready to Create</h3>
                        <p className="font-bold">ENTER A PROMPT ABOVE TO START</p>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </main>

          {/* Floating Image Preview for Upload */}
          <AnimatePresence>
            {uploadImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                className="fixed bottom-6 right-6 z-50 w-48 brutal-border bg-white p-2"
              >
                <div className="relative">
                  <img 
                    src={`data:${uploadImage.mimeType};base64,${uploadImage.data}`} 
                    alt="Upload preview" 
                    className="w-full h-auto"
                  />
                  <button 
                    onClick={() => setUploadImage(null)}
                    className="absolute -top-4 -right-4 p-1 bg-red-500 text-white rounded-full border-2 border-brand-secondary shadow-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 text-[10px] font-black uppercase text-center">
                  Reference Image Active
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
