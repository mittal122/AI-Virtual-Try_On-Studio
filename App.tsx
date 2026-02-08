import React, { useState, useMemo, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { PoseSelector } from './components/PoseSelector';
import { BackgroundSelector } from './components/BackgroundSelector';
import { GalleryModal } from './components/GalleryModal';
import { UserIcon, ShirtIcon, DownloadIcon, SpinnerIcon, SparklesIcon, BodyPoseIcon, SunIcon, MoonIcon, GalleryIcon, SaveIcon, PantsIcon, DressIcon } from './components/icons';
import { MODEL_POSES, BACKGROUND_OPTIONS } from './constants';
import type { ImageState, Pose, BackgroundOption } from './types';
import { generateTryOnImage, generateCreativePose, generateCreativeBackground, describePoseFromImage, describeBackgroundFromImage, renderProductForTryOn } from './services/geminiService';

const initialImageState: ImageState = {
  file: null,
  previewUrl: null,
  base64: null,
  mimeType: null,
};

type PoseMode = 'select' | 'describe' | 'upload';
type BackgroundMode = 'none' | 'select' | 'upload' | 'describe';
type ProductStatus = 'idle' | 'rendering' | 'pending_approval' | 'approved';
type ProductType = 'upper' | 'lower' | 'full';
type Theme = 'light' | 'dark';


const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; disabled?: boolean; }> = ({ label, isActive, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-slate-900 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {label}
  </button>
);

const StepContainer: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm">
                {number}
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
        </div>
        <div className="pl-12">
            {children}
        </div>
    </div>
);


function App() {
  const [userFace, setUserFace] = useState<ImageState>(initialImageState);

  const [productStates, setProductStates] = useState({
    upper: { image: initialImageState, renderedImage: initialImageState, status: 'idle' as ProductStatus },
    lower: { image: initialImageState, renderedImage: initialImageState, status: 'idle' as ProductStatus },
    full: { image: initialImageState, renderedImage: initialImageState, status: 'idle' as ProductStatus },
  });
  const [productType, setProductType] = useState<ProductType>('upper');
  const activeProductState = productStates[productType];

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
  const [isDescribingUploadedBackground, setIsDescribingUploadedBackground] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => 
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeUploader, setActiveUploader] = useState<string>('face');

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
  
  const handleFileFromPaste = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        const imageState: ImageState = {
            file,
            previewUrl: URL.createObjectURL(file),
            base64,
            mimeType: file.type,
        };

        switch (activeUploader) {
            case 'face':
                setUserFace(imageState);
                break;
            case 'product':
                handleProductImageUpload(imageState);
                break;
            case 'pose':
                handlePoseImageUpload(imageState);
                break;
            case 'background':
                handleBackgroundImageUpload(imageState);
                break;
        }
    };
    reader.onerror = (error) => {
      setError('Failed to read pasted image.');
      console.error('Paste read error:', error);
    };
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
        if (!activeUploader) return;
        
        if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) {
            return;
        }

        const imageFile = Array.from(event.clipboardData?.files ?? []).find(f => f.type.startsWith('image/'));
        if (imageFile) {
            event.preventDefault();
            handleFileFromPaste(imageFile);
        }
    };

    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [activeUploader]);


  const isGenerateButtonDisabled = useMemo(() => {
    if (isLoading || isInspiringPose || isInspiringBackground || isDescribingPose || isDescribingUploadedBackground || activeProductState.status === 'rendering') return true;
    if (!userFace.file || activeProductState.status !== 'approved') return true;
    
    if (isMultiVariation) {
        return describedPose.trim() === '';
    }

    const poseSelected = poseMode === 'select' && selectedPose;
    const poseDescribed = poseMode === 'describe' && describedPose.trim() !== '';
    const poseUploaded = poseMode === 'upload' && uploadedPoseImage.file;
    return !(poseSelected || poseDescribed || poseUploaded);
  }, [userFace, activeProductState.status, poseMode, selectedPose, describedPose, uploadedPoseImage, isLoading, isInspiringPose, isInspiringBackground, isDescribingPose, isDescribingUploadedBackground, isMultiVariation]);

  const handleInspirePose = async () => {
    if (!activeProductState.renderedImage.base64 || !activeProductState.renderedImage.mimeType) {
      setError("Please approve a product image first to get inspired.");
      return;
    }
    setIsInspiringPose(true);
    setError(null);
    try {
      const { poseDescription } = await generateCreativePose({
        base64: activeProductState.renderedImage.base64,
        mimeType: activeProductState.renderedImage.mimeType,
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
    if (!activeProductState.renderedImage.base64 || !activeProductState.renderedImage.mimeType) {
      setError("Please approve a product image first to get inspired.");
      return;
    }
    setIsInspiringBackground(true);
    setError(null);
    try {
      const { backgroundDescription } = await generateCreativeBackground({
        base64: activeProductState.renderedImage.base64,
        mimeType: activeProductState.renderedImage.mimeType,
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

  const handleBackgroundImageUpload = async (imageState: ImageState) => {
    if (!imageState.base64 || !imageState.mimeType) {
        setError("Failed to read background image.");
        return;
    }

    setBackgroundImage(imageState);
    setIsDescribingUploadedBackground(true);
    setError(null);

    try {
        const description = await describeBackgroundFromImage({
            base64: imageState.base64,
            mimeType: imageState.mimeType,
        });
        setDescribedBackground(description);
        setBackgroundMode('describe');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
    } finally {
        setIsDescribingUploadedBackground(false);
    }
  };

  const handleProductImageUpload = async (imageState: ImageState) => {
    setProductStates(prev => ({
      ...prev,
      [productType]: {
        ...prev[productType],
        image: imageState,
        status: 'rendering',
        renderedImage: initialImageState,
      }
    }));
    setError(null);

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

      setProductStates(prev => ({
        ...prev,
        [productType]: {
          ...prev[productType],
          renderedImage: {
            file: null,
            previewUrl,
            base64: renderedBase64,
            mimeType,
          },
          status: 'pending_approval',
        }
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setProductStates(prev => ({
        ...prev,
        [productType]: {
          image: initialImageState,
          renderedImage: initialImageState,
          status: 'idle',
        }
      }));
    }
  };

  const handleApproveProduct = () => {
    setProductStates(prev => ({
      ...prev,
      [productType]: {
        ...prev[productType],
        status: 'approved',
      }
    }));
  };

  const handleRejectProduct = () => {
    setProductStates(prev => ({
      ...prev,
      [productType]: {
        image: initialImageState,
        renderedImage: initialImageState,
        status: 'idle',
      }
    }));
  };
  
  const handleProductTypeChange = (type: ProductType) => {
    if (type !== productType) {
      setProductType(type);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (isGenerateButtonDisabled) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImages(null);

    try {
      if (!userFace.base64 || !userFace.mimeType || !activeProductState.renderedImage.base64 || !activeProductState.renderedImage.mimeType) {
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
            productImage: { base64: activeProductState.renderedImage.base64!, mimeType: activeProductState.renderedImage.mimeType! },
            productType,
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
        <label htmlFor="variations-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">Variations:</label>
        <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800">
            <button
                onClick={() => setNumVariations(v => Math.max(1, v - 1))}
                disabled={numVariations <= 1}
                className="px-3 py-1.5 text-lg font-bold text-gray-700 dark:text-gray-300 rounded-l-md hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease variations"
            >-</button>
            <input
                id="variations-input"
                type="text"
                value={numVariations}
                readOnly
                className="w-10 p-1.5 text-center text-sm bg-transparent border-x border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none"
            />
             <button
                onClick={() => setNumVariations(v => Math.min(4, v + 1))}
                disabled={numVariations >= 4}
                className="px-3 py-1.5 text-lg font-bold text-gray-700 dark:text-gray-300 rounded-r-md hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase variations"
            >+</button>
        </div>
    </div>
  );

  const ProductTabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-4 py-2 -mb-px text-sm font-semibold border-b-2 transition-colors duration-200 focus:outline-none ${
            isActive
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
    >
        {label}
    </button>
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300">
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI Virtual Try-On Studio
            </h1>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsGalleryOpen(true)}
                    className="relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-slate-900 transition-colors"
                    aria-label="Open gallery"
                >
                    <GalleryIcon />
                    {galleryImages.length > 0 && (
                        <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-900">
                            {galleryImages.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-slate-900 transition-colors"
                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
            </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Configuration */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8 w-full space-y-8">
                <StepContainer number="01" title="Upload Your Face">
                   <ImageUploader
                        id="face-upload"
                        icon={<UserIcon />}
                        onImageUpload={setUserFace}
                        imagePreview={userFace.previewUrl}
                        onActivate={() => setActiveUploader('face')}
                        isActive={activeUploader === 'face'}
                    />
                </StepContainer>

                 <StepContainer number="02" title="Upload Product Image">
                    <div className="flex justify-center space-x-2 border-b border-gray-200 dark:border-gray-700">
                        <ProductTabButton
                            label="Upper Body"
                            isActive={productType === 'upper'}
                            onClick={() => handleProductTypeChange('upper')}
                        />
                        <ProductTabButton
                            label="Lower Body"
                            isActive={productType === 'lower'}
                            onClick={() => handleProductTypeChange('lower')}
                        />
                        <ProductTabButton
                            label="Full Body"
                            isActive={productType === 'full'}
                            onClick={() => handleProductTypeChange('full')}
                        />
                    </div>
                    <div className="mt-4">
                        {activeProductState.status === 'idle' && (
                        <ImageUploader
                            id={`${productType}-upload`}
                            key={productType}
                            icon={
                                productType === 'upper' ? <ShirtIcon /> :
                                productType === 'lower' ? <PantsIcon /> :
                                <DressIcon />
                            }
                            onImageUpload={handleProductImageUpload}
                            imagePreview={null}
                            onActivate={() => setActiveUploader('product')}
                            isActive={activeUploader === 'product'}
                        />
                        )}

                        {activeProductState.status === 'rendering' && activeProductState.image.previewUrl && (
                        <div className="relative w-full h-48">
                            <img src={activeProductState.image.previewUrl} alt="Uploading..." className="h-full w-full object-cover rounded-md opacity-50" />
                            <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex flex-col items-center justify-center rounded-lg border border-dashed border-indigo-500">
                            <SpinnerIcon />
                            <p className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Preparing product...</p>
                            </div>
                        </div>
                        )}
                        
                        {activeProductState.status === 'pending_approval' && activeProductState.image.previewUrl && activeProductState.renderedImage.previewUrl && (
                        <div className="w-full text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                            <p className="font-semibold mb-2 text-sm text-gray-700 dark:text-gray-200">Does the rendered product look correct?</p>
                            <div className="grid grid-cols-2 gap-2 items-center">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Original</p>
                                <img src={activeProductState.image.previewUrl} alt="Original product" className="w-full h-32 object-contain rounded-md border bg-white dark:bg-slate-800 dark:border-gray-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rendered</p>
                                <div
                                className="w-full h-32 bg-contain bg-no-repeat bg-center rounded-md border border-gray-200 dark:border-gray-600"
                                style={{
                                    backgroundImage: `url(${activeProductState.renderedImage.previewUrl}), linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
                                    backgroundSize: `auto 95%, 16px 16px, 16px 16px, 16px 16px, 16px 16px`,
                                    backgroundPosition: `center, 0 0, 8px 8px, 8px 8px, 0 0`,
                                }}
                                ></div>
                            </div>
                            </div>
                            <div className="flex justify-center space-x-4 mt-3">
                            <button onClick={handleApproveProduct} className="px-4 py-1.5 text-sm bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm">Looks Good</button>
                            <button onClick={handleRejectProduct} className="px-4 py-1.5 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm">Try Another</button>
                            </div>
                        </div>
                        )}

                        {activeProductState.status === 'approved' && activeProductState.renderedImage.previewUrl && (
                            <div className="relative w-full h-48 p-2 border-2 border-dashed border-green-500 rounded-lg bg-green-50 dark:bg-green-900/20">
                                <p className="text-center text-sm font-semibold text-green-800 dark:text-green-300">✓ Product Approved</p>
                                <div
                                    className="w-full h-[calc(100%-2rem)] bg-contain bg-no-repeat bg-center"
                                    style={{ backgroundImage: `url(${activeProductState.renderedImage.previewUrl})` }}
                                ></div>
                                <button onClick={handleRejectProduct} className="absolute top-1 right-1 text-xs text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:underline">Change</button>
                            </div>
                        )}
                    </div>
                </StepContainer>

                 <StepContainer number="03" title="Configure Scene">
                    <div className="flex flex-col space-y-6">
                       {/* Pose Configuration */}
                       <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200">Define Pose</h4>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={handleInspirePose}
                                        disabled={activeProductState.status !== 'approved' || isLoading || isInspiringPose || isInspiringBackground || isDescribingPose || isDescribingUploadedBackground}
                                        className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isInspiringPose ? <SpinnerIcon /> : <SparklesIcon className="w-4 h-4" />}
                                        <span>Inspire</span>
                                    </button>
                                    <div className="flex space-x-1.5">
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
                                    className="w-full h-28 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                />
                            )}

                            {poseMode === 'upload' && !isMultiVariation && (
                                <div className="relative">
                                    <ImageUploader
                                        id="pose-upload"
                                        icon={<BodyPoseIcon />}
                                        onImageUpload={handlePoseImageUpload}
                                        imagePreview={uploadedPoseImage.previewUrl}
                                        className="h-28"
                                        onActivate={() => setActiveUploader('pose')}
                                        isActive={activeUploader === 'pose'}
                                    />
                                    {isDescribingPose && (
                                        <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex flex-col items-center justify-center rounded-lg border border-dashed border-indigo-500">
                                            <SpinnerIcon />
                                            <p className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Describing pose...</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                       {/* Background Configuration */}
                       <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200">Add Background <span className="text-gray-400 font-normal">(Optional)</span></h4>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={handleInspireBackground}
                                        disabled={activeProductState.status !== 'approved' || isLoading || isInspiringPose || isInspiringBackground || isDescribingPose || isDescribingUploadedBackground}
                                        className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isInspiringBackground ? <SpinnerIcon /> : <SparklesIcon className="w-4 h-4" />}
                                        <span>Inspire</span>
                                    </button>
                                    <div className="flex space-x-1.5">
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
                                <div className="relative">
                                    <ImageUploader
                                        id="background-upload"
                                        icon={<div className="text-2xl">🖼️</div>}
                                        onImageUpload={handleBackgroundImageUpload}
                                        imagePreview={backgroundImage.previewUrl}
                                        className="h-28"
                                        onActivate={() => setActiveUploader('background')}
                                        isActive={activeUploader === 'background'}
                                    />
                                    {isDescribingUploadedBackground && (
                                        <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex flex-col items-center justify-center rounded-lg border border-dashed border-indigo-500">
                                            <SpinnerIcon />
                                            <p className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Describing background...</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {backgroundMode === 'describe' && (
                                <textarea
                                    value={describedBackground}
                                    onChange={(e) => setDescribedBackground(e.target.value)}
                                    placeholder="e.g., A futuristic cityscape at night with neon lights."
                                    className="w-full h-28 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                />
                            )}
                        </div>
                    </div>
                 </StepContainer>

                 <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <VariationCounter />
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerateButtonDisabled}
                        className="w-full sm:w-auto flex items-center justify-center py-2.5 px-6 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-300"
                    >
                        {isLoading ? <SpinnerIcon /> : null}
                        <span className="text-white">{isLoading ? 'Generating...' : `Generate ${numVariations} Image${numVariations > 1 ? 's' : ''}`}</span>
                    </button>
                </div>
            </div>

            {/* Right Column: Results */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8 w-full">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white text-center mb-4">Your Result</h2>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-300 rounded-md text-center text-sm">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                <div className="w-full min-h-[400px] bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 p-4">
                    {isLoading && (
                        <div className="w-full h-full max-w-md bg-gray-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
                    )}
                    {!isLoading && !generatedImages && (
                        <p className="text-gray-400 dark:text-gray-500">Your generated image will appear here.</p>
                    )}
                    {!isLoading && generatedImages && (
                        <div className={`grid gap-4 w-full ${generatedImages.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                            {generatedImages.map((image, index) => (
                                <div key={index} className="space-y-3">
                                    <img src={image} alt={`Generated virtual try-on ${index + 1}`} className="w-full object-contain rounded-lg shadow-md mx-auto bg-white dark:bg-slate-800" />
                                    <div className="flex justify-center items-center gap-2">
                                        {galleryImages.includes(image) ? (
                                            <button 
                                                disabled
                                                className="inline-flex items-center justify-center text-sm py-2 px-4 bg-gray-400 text-white font-semibold rounded-lg"
                                            >
                                                Saved ✓
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleSaveToGallery(image)}
                                                className="inline-flex items-center justify-center text-sm py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
                                            >
                                                <SaveIcon className="h-4 w-4 mr-1.5" />
                                                Save
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDownload(image, index)}
                                            className="inline-flex items-center justify-center text-sm py-2 px-4 bg-gray-600 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-700 transition-colors"
                                        >
                                            <DownloadIcon className="h-4 w-4 mr-1.5" />
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