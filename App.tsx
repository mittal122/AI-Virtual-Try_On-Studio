import React, { useState, useMemo, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { PoseSelector } from './components/PoseSelector';
import { BackgroundSelector } from './components/BackgroundSelector';
import { GalleryModal } from './components/GalleryModal';
import { UserIcon, ShirtIcon, DownloadIcon, SpinnerIcon, SparklesIcon, BodyPoseIcon, SunIcon, MoonIcon, GalleryIcon, SaveIcon } from './components/icons';
import { MODEL_POSES, BACKGROUND_OPTIONS } from './constants';
import type { ImageState, Pose, BackgroundOption } from './types';
import { generateTryOnImage, generateCreativePose, generateCreativeBackground, describePoseFromImage, renderProductForTryOn } from './services/geminiService';

const initialImageState: ImageState = {
  file: null,
  previewUrl: null,
  base64: null,
  mimeType: null,
};

type PoseMode = 'select' | 'describe' | 'upload';
type BackgroundMode = 'none' | 'select' | 'upload' | 'describe';
type ProductStatus = 'idle' | 'rendering' | 'pending_approval' | 'approved';
type Theme = 'light' | 'dark';


const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; disabled?: boolean; }> = ({ label, isActive, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
      isActive
        ? 'bg-indigo-600 text-white shadow'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {label}
  </button>
);


function App() {
  const [userFace, setUserFace] = useState<ImageState>(initialImageState);
  const [productImage, setProductImage] = useState<ImageState>(initialImageState);
  const [renderedProductImage, setRenderedProductImage] = useState<ImageState>(initialImageState);
  const [productStatus, setProductStatus] = useState<ProductStatus>('idle');
  const [backgroundImage, setBackgroundImage] = useState<ImageState>(initialImageState);
  const [uploadedPoseImage, setUploadedPoseImage] = useState<ImageState>(initialImageState);

  const [poseMode, setPoseMode] = useState<PoseMode>('select');
  const [selectedPose, setSelectedPose] = useState<Pose | null>(null);
  const [describedPose, setDescribedPose] = useState<string>('');
  
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('none');
  const [describedBackground, setDescribedBackground] = useState<string>('');
  const [selectedBackground, setSelectedBackground] = useState<BackgroundOption | null>(null);

  const [numVariations, setNumVariations] = useState(1);
  const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInspiringPose, setIsInspiringPose] = useState<boolean>(false);
  const [isInspiringBackground, setIsInspiringBackground] = useState<boolean>(false);
  const [isDescribingPose, setIsDescribingPose] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const isMultiVariation = numVariations > 1;

  // Load gallery from localStorage on initial load
  useEffect(() => {
    try {
      const savedGallery = localStorage.getItem('ai-try-on-gallery');
      if (savedGallery) {
        setGalleryImages(JSON.parse(savedGallery));
      }
    } catch (e) {
      console.error("Failed to load gallery from localStorage", e);
    }
  }, []);

  // Save gallery to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('ai-try-on-gallery', JSON.stringify(galleryImages));
    } catch (e) {
      console.error("Failed to save gallery to localStorage", e);
    }
  }, [galleryImages]);


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isMultiVariation && (poseMode === 'select' || poseMode === 'upload')) {
      setPoseMode('describe');
    }
  }, [isMultiVariation, poseMode]);


  const isGenerateButtonDisabled = useMemo(() => {
    if (isLoading || isInspiringPose || isInspiringBackground || isDescribingPose || productStatus === 'rendering') return true;
    if (!userFace.file || productStatus !== 'approved') return true;
    
    if (isMultiVariation) {
        return describedPose.trim() === '';
    }

    const poseSelected = poseMode === 'select' && selectedPose;
    const poseDescribed = poseMode === 'describe' && describedPose.trim() !== '';
    const poseUploaded = poseMode === 'upload' && uploadedPoseImage.file;
    return !(poseSelected || poseDescribed || poseUploaded);
  }, [userFace, productStatus, poseMode, selectedPose, describedPose, uploadedPoseImage, isLoading, isInspiringPose, isInspiringBackground, isDescribingPose, isMultiVariation]);

  const handleInspirePose = async () => {
    if (!renderedProductImage.base64 || !renderedProductImage.mimeType) {
      setError("Please approve a product image first to get inspired.");
      return;
    }
    setIsInspiringPose(true);
    setError(null);
    try {
      const { poseDescription } = await generateCreativePose({
        base64: renderedProductImage.base64,
        mimeType: renderedProductImage.mimeType,
      });
      setDescribedPose(poseDescription);
      setPoseMode('describe');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsInspiringPose(false);
    }
  };

  const handleInspireBackground = async () => {
    if (!renderedProductImage.base64 || !renderedProductImage.mimeType) {
      setError("Please approve a product image first to get inspired.");
      return;
    }
    setIsInspiringBackground(true);
    setError(null);
    try {
      const { backgroundDescription } = await generateCreativeBackground({
        base64: renderedProductImage.base64,
        mimeType: renderedProductImage.mimeType,
      });
      setDescribedBackground(backgroundDescription);
      setBackgroundMode('describe');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsInspiringBackground(false);
    }
  };
  
  const handlePoseImageUpload = async (imageState: ImageState) => {
    if (!imageState.base64 || !imageState.mimeType) {
        setError("Failed to read pose image.");
        return;
    }

    setUploadedPoseImage(imageState);
    setIsDescribingPose(true);
    setError(null);

    try {
        const description = await describePoseFromImage({
            base64: imageState.base64,
            mimeType: imageState.mimeType,
        });
        setDescribedPose(description);
        setPoseMode('describe');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
    } finally {
        setIsDescribingPose(false);
    }
  };

  const handleProductImageUpload = async (imageState: ImageState) => {
    setProductImage(imageState);
    setProductStatus('rendering');
    setError(null);
    setRenderedProductImage(initialImageState);

    try {
      if (!imageState.base64 || !imageState.mimeType) {
        throw new Error("Failed to process uploaded product image.");
      }

      const renderedBase64 = await renderProductForTryOn({
        base64: imageState.base64,
        mimeType: imageState.mimeType,
      });

      const mimeType = 'image/png';
      const previewUrl = `data:${mimeType};base64,${renderedBase64}`;

      setRenderedProductImage({
        file: null,
        previewUrl,
        base64: renderedBase64,
        mimeType,
      });
      setProductStatus('pending_approval');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setProductStatus('idle');
      setProductImage(initialImageState);
    }
  };

  const handleApproveProduct = () => {
    setProductStatus('approved');
  };

  const handleRejectProduct = () => {
    setProductStatus('idle');
    setProductImage(initialImageState);
    setRenderedProductImage(initialImageState);
  };


  const handleGenerate = async () => {
    if (isGenerateButtonDisabled) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImages(null);

    try {
      if (!userFace.base64 || !userFace.mimeType || !renderedProductImage.base64 || !renderedProductImage.mimeType) {
        throw new Error("Missing required image data.");
      }
      
      let backgroundData: { base64: string; mimeType: string; } | undefined = undefined;
      if (backgroundMode === 'upload' && backgroundImage.base64 && backgroundImage.mimeType) {
        backgroundData = { base64: backgroundImage.base64, mimeType: backgroundImage.mimeType };
      }

      const finalDescribedPose = (isMultiVariation || poseMode === 'describe' || poseMode === 'upload') 
        ? describedPose 
        : (poseMode === 'select' && selectedPose ? selectedPose.description : "A model in a natural standing pose");
    
      const finalDescribedBackground = (backgroundMode === 'describe')
        ? describedBackground
        : (backgroundMode === 'select' && selectedBackground ? selectedBackground.description : undefined);

      const generationPromises = Array.from({ length: numVariations }).map((_, index) => {
         return generateTryOnImage({
            userFace: { base64: userFace.base64!, mimeType: userFace.mimeType! },
            productImage: { base64: renderedProductImage.base64!, mimeType: renderedProductImage.mimeType! },
            describedPose: finalDescribedPose,
            backgroundImage: backgroundData,
            describedBackground: finalDescribedBackground,
            variationInfo: { current: index + 1, total: numVariations },
          });
      });

      const resultsBase64 = await Promise.all(generationPromises);
      setGeneratedImages(resultsBase64.map(b64 => `data:image/png;base64,${b64}`));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (imageUrl: string, index: number) => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `virtual-try-on-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSaveToGallery = (imageUrl: string) => {
    if (!galleryImages.includes(imageUrl)) {
        setGalleryImages(prev => [imageUrl, ...prev]);
    }
  };

  const handleDeleteFromGallery = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearGallery = () => {
    setGalleryImages([]);
  };

  const VariationCounter = () => (
    <div className="flex items-center gap-2">
        <label htmlFor="variations-input" className="font-medium text-gray-700 dark:text-gray-300">Variations:</label>
        <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
            <button
                onClick={() => setNumVariations(v => Math.max(1, v - 1))}
                disabled={numVariations <= 1}
                className="px-3 py-2 text-lg font-bold text-gray-700 dark:text-gray-300 rounded-l-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease variations"
            >-</button>
            <input
                id="variations-input"
                type="text"
                value={numVariations}
                readOnly
                className="w-12 p-2 text-center bg-transparent border-x border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none"
            />
             <button
                onClick={() => setNumVariations(v => Math.min(4, v + 1))}
                disabled={numVariations >= 4}
                className="px-3 py-2 text-lg font-bold text-gray-700 dark:text-gray-300 rounded-r-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase variations"
            >+</button>
        </div>
    </div>
  );


  return (
    <div className="bg-gray-100 dark:bg-slate-900 min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-300">
      <div className="w-full max-w-6xl">
        <header className="flex justify-between items-center mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
                AI Virtual Try-On Studio
            </h1>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsGalleryOpen(true)}
                    className="relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors"
                    aria-label="Open gallery"
                >
                    <GalleryIcon />
                    {galleryImages.length > 0 && (
                        <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-800">
                            {galleryImages.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors"
                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
            </div>
        </header>

        <main className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ImageUploader
                    id="face-upload"
                    label="Step 1: Upload Your Face"
                    icon={<UserIcon />}
                    onImageUpload={setUserFace}
                    imagePreview={userFace.previewUrl}
                />
                <div className="flex flex-col items-center space-y-2">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200">Step 2: Upload Product Image</h3>
                    
                    {productStatus === 'idle' && (
                    <ImageUploader
                        id="product-upload"
                        icon={<ShirtIcon />}
                        onImageUpload={handleProductImageUpload}
                        imagePreview={null}
                    />
                    )}

                    {productStatus === 'rendering' && productImage.previewUrl && (
                    <div className="relative w-full h-48">
                        <img src={productImage.previewUrl} alt="Uploading..." className="h-full w-full object-cover rounded-md opacity-50" />
                        <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-indigo-500">
                        <SpinnerIcon />
                        <p className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Preparing product...</p>
                        </div>
                    </div>
                    )}
                    
                    {productStatus === 'pending_approval' && productImage.previewUrl && renderedProductImage.previewUrl && (
                    <div className="w-full text-center p-2 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <p className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Does the rendered product look correct?</p>
                        <div className="grid grid-cols-2 gap-2 items-center">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Original</p>
                            <img src={productImage.previewUrl} alt="Original product" className="w-full h-32 object-contain rounded-md border bg-white dark:border-gray-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rendered</p>
                            <div
                            className="w-full h-32 bg-contain bg-no-repeat bg-center rounded-md border border-gray-200 dark:border-gray-600"
                            style={{
                                backgroundImage: `url(${renderedProductImage.previewUrl}), linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
                                backgroundSize: `auto 95%, 16px 16px, 16px 16px, 16px 16px, 16px 16px`,
                                backgroundPosition: `center, 0 0, 8px 8px, 8px 8px, 0 0`,
                            }}
                            ></div>
                        </div>
                        </div>
                        <div className="flex justify-center space-x-4 mt-3">
                        <button onClick={handleApproveProduct} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow">Looks Good!</button>
                        <button onClick={handleRejectProduct} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow">Try Another</button>
                        </div>
                    </div>
                    )}

                    {productStatus === 'approved' && renderedProductImage.previewUrl && (
                        <div className="relative w-full h-48 p-2 border-2 border-dashed border-green-500 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <p className="text-center font-semibold text-green-800 dark:text-green-300">✓ Product Approved</p>
                            <div
                                className="w-full h-[calc(100%-2rem)] bg-contain bg-no-repeat bg-center"
                                style={{ backgroundImage: `url(${renderedProductImage.previewUrl})` }}
                            ></div>
                            <button onClick={handleRejectProduct} className="absolute top-1 right-1 text-xs text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:underline">Change</button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-6">
                <div className="flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">Step 3: Define Pose</h3>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={handleInspirePose}
                                disabled={productStatus !== 'approved' || isLoading || isInspiringPose || isInspiringBackground}
                                className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isInspiringPose ? <SpinnerIcon /> : <SparklesIcon className="w-4 h-4" />}
                                <span>Inspire</span>
                            </button>
                            <div className="flex space-x-2">
                                <TabButton label="Select" isActive={poseMode === 'select' && !isMultiVariation} onClick={() => setPoseMode('select')} disabled={isMultiVariation} />
                                <TabButton label="Describe" isActive={poseMode === 'describe' || isMultiVariation} onClick={() => setPoseMode('describe')} />
                                <TabButton label="Upload" isActive={poseMode === 'upload' && !isMultiVariation} onClick={() => setPoseMode('upload')} disabled={isMultiVariation}/>
                            </div>
                        </div>
                    </div>
                    {isMultiVariation && <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Describe a pose style. Unique poses will be generated for each variation.</p>}
                    
                    {poseMode === 'select' && !isMultiVariation && (
                        <PoseSelector
                            poses={MODEL_POSES}
                            selectedPose={selectedPose}
                            onSelectPose={setSelectedPose}
                        />
                    )}
                    
                    {(poseMode === 'describe' || isMultiVariation) && (
                        <textarea
                            value={describedPose}
                            onChange={(e) => setDescribedPose(e.target.value)}
                            placeholder={isMultiVariation ? "e.g., Energetic walking poses on a runway." : "e.g., A model walking confidently on a runway, facing forward."}
                            className="w-full h-36 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        />
                    )}

                    {poseMode === 'upload' && !isMultiVariation && (
                        <div className="relative">
                            <ImageUploader
                                id="pose-upload"
                                icon={<BodyPoseIcon />}
                                onImageUpload={handlePoseImageUpload}
                                imagePreview={uploadedPoseImage.previewUrl}
                            />
                            {isDescribingPose && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-indigo-500">
                                    <SpinnerIcon />
                                    <p className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Describing pose...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">Step 4: Add Background (Optional)</h3>
                         <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={handleInspireBackground}
                                disabled={productStatus !== 'approved' || isLoading || isInspiringPose || isInspiringBackground}
                                className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isInspiringBackground ? <SpinnerIcon /> : <SparklesIcon className="w-4 h-4" />}
                                <span>Inspire</span>
                            </button>
                            <div className="flex space-x-2">
                                <TabButton label="None" isActive={backgroundMode === 'none'} onClick={() => setBackgroundMode('none')} />
                                <TabButton label="Select" isActive={backgroundMode === 'select'} onClick={() => setBackgroundMode('select')} />
                                <TabButton label="Upload" isActive={backgroundMode === 'upload'} onClick={() => setBackgroundMode('upload')} />
                                <TabButton label="Describe" isActive={backgroundMode === 'describe'} onClick={() => setBackgroundMode('describe')} />
                            </div>
                        </div>
                    </div>
                    {backgroundMode === 'select' && (
                        <BackgroundSelector
                            backgrounds={BACKGROUND_OPTIONS}
                            selectedBackground={selectedBackground}
                            onSelectBackground={setSelectedBackground}
                        />
                    )}
                    {backgroundMode === 'upload' && (
                        <ImageUploader
                            id="background-upload"
                            label=""
                            icon={<div className="text-2xl">🖼️</div>}
                            onImageUpload={setBackgroundImage}
                            imagePreview={backgroundImage.previewUrl}
                        />
                    )}
                    {backgroundMode === 'describe' && (
                        <textarea
                            value={describedBackground}
                            onChange={(e) => setDescribedBackground(e.target.value)}
                            placeholder="e.g., A futuristic cityscape at night with neon lights."
                            className="w-full h-36 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        />
                    )}
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                <VariationCounter />
                <button
                    onClick={handleGenerate}
                    disabled={isGenerateButtonDisabled}
                    className="w-full sm:w-auto flex items-center justify-center py-3 px-6 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300"
                >
                    {isLoading ? <SpinnerIcon /> : null}
                    <span className="text-white">{isLoading ? 'Generating...' : `Generate ${numVariations} Image${numVariations > 1 ? 's' : ''}`}</span>
                </button>
            </div>
            
            {error && (
                <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-300 rounded-md text-center">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 text-center mb-4">Your Result</h2>
                <div className="w-full min-h-[400px] bg-gray-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 p-4">
                    {isLoading && (
                        <div className="w-full h-full max-w-md bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
                    )}
                    {!isLoading && !generatedImages && (
                        <p className="text-gray-400 dark:text-gray-500">Your generated image will appear here.</p>
                    )}
                    {!isLoading && generatedImages && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                            {generatedImages.map((image, index) => (
                                <div key={index} className="text-center space-y-2">
                                    <img src={image} alt={`Generated virtual try-on ${index + 1}`} className="w-full object-contain rounded-lg shadow-md mx-auto" />
                                    <div className="flex justify-center items-center gap-2">
                                        {galleryImages.includes(image) ? (
                                            <button 
                                                disabled
                                                className="inline-flex items-center justify-center py-2 px-4 bg-gray-400 text-white font-semibold rounded-lg shadow-md"
                                            >
                                                Saved ✓
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleSaveToGallery(image)}
                                                className="inline-flex items-center justify-center py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300"
                                            >
                                                <SaveIcon />
                                                Save
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDownload(image, index)}
                                            className="inline-flex items-center justify-center py-2 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors duration-300"
                                        >
                                            <DownloadIcon />
                                            Download
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </main>
      </div>
      <GalleryModal 
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={galleryImages}
        onDelete={handleDeleteFromGallery}
        onClearAll={handleClearGallery}
      />
    </div>
  );
}

export default App;