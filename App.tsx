import React, { useState, useMemo, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { PoseSelector } from './components/PoseSelector';
import { UserIcon, ShirtIcon, DownloadIcon, SpinnerIcon } from './components/icons';
import { MODEL_POSES } from './constants';
import type { ImageState } from './types';
import { generateTryOnImage } from './services/geminiService';

const initialImageState: ImageState = {
  file: null,
  previewUrl: null,
  base64: null,
  mimeType: null,
};

type PoseMode = 'select' | 'describe';
type BackgroundMode = 'none' | 'upload' | 'describe';

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; disabled?: boolean; }> = ({ label, isActive, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
      isActive
        ? 'bg-blue-600 text-white shadow'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {label}
  </button>
);


const urlObjectToBase64 = async (url: string): Promise<{ base64: string, mimeType: string }> => {
  const response = await fetch(url);
  const blob = await response.blob();
  const mimeType = blob.type;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

function App() {
  const [userFace, setUserFace] = useState<ImageState>(initialImageState);
  const [productImage, setProductImage] = useState<ImageState>(initialImageState);
  const [backgroundImage, setBackgroundImage] = useState<ImageState>(initialImageState);

  const [poseMode, setPoseMode] = useState<PoseMode>('select');
  const [selectedPose, setSelectedPose] = useState<string | null>(null);
  const [describedPose, setDescribedPose] = useState<string>('');
  
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('none');
  const [describedBackground, setDescribedBackground] = useState<string>('');

  const [numVariations, setNumVariations] = useState(1);
  const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMultiVariation = numVariations > 1;

  useEffect(() => {
    if (isMultiVariation && poseMode === 'select') {
      setPoseMode('describe');
    }
  }, [isMultiVariation, poseMode]);


  const isGenerateButtonDisabled = useMemo(() => {
    if (isLoading) return true;
    if (!userFace.file || !productImage.file) return true;
    
    if (isMultiVariation) {
        return describedPose.trim() === '';
    }

    const poseSelected = poseMode === 'select' && selectedPose;
    const poseDescribed = poseMode === 'describe' && describedPose.trim() !== '';
    return !(poseSelected || poseDescribed);
  }, [userFace, productImage, poseMode, selectedPose, describedPose, isLoading, isMultiVariation]);

  const handleGenerate = async () => {
    if (isGenerateButtonDisabled) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImages(null);

    try {
      if (!userFace.base64 || !userFace.mimeType || !productImage.base64 || !productImage.mimeType) {
        throw new Error("Missing required image data.");
      }
      
      const modelPoseData = poseMode === 'select' && selectedPose && !isMultiVariation ? await urlObjectToBase64(selectedPose) : undefined;
      const backgroundData = backgroundMode === 'upload' && backgroundImage.base64 ? { base64: backgroundImage.base64, mimeType: backgroundImage.mimeType! } : undefined;

      const generationPromises = Array.from({ length: numVariations }).map((_, index) => {
         return generateTryOnImage({
            userFace: { base64: userFace.base64!, mimeType: userFace.mimeType! },
            productImage: { base64: productImage.base64!, mimeType: productImage.mimeType! },
            modelPose: modelPoseData,
            describedPose: isMultiVariation || poseMode === 'describe' ? describedPose : "A model in a natural standing pose",
            backgroundImage: backgroundData,
            describedBackground: backgroundMode === 'describe' ? describedBackground : undefined,
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

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4 font-sans">
      <main className="bg-white rounded-xl shadow-lg p-6 sm:p-8 w-full max-w-5xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">
          AI Virtual Try-On Studio
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          <ImageUploader
            id="face-upload"
            label="Step 1: Upload Your Face"
            icon={<UserIcon />}
            onImageUpload={setUserFace}
            imagePreview={userFace.previewUrl}
          />
          <ImageUploader
            id="product-upload"
            label="Step 2: Upload Product Image"
            icon={<ShirtIcon />}
            onImageUpload={setProductImage}
            imagePreview={productImage.previewUrl}
          />

          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Step 3: Define Pose</h3>
                <div className="flex space-x-2">
                    <TabButton label="Select" isActive={poseMode === 'select' && !isMultiVariation} onClick={() => setPoseMode('select')} disabled={isMultiVariation} />
                    <TabButton label="Describe" isActive={poseMode === 'describe' || isMultiVariation} onClick={() => setPoseMode('describe')} />
                </div>
            </div>
             {isMultiVariation && <p className="text-xs text-gray-500 -mt-2">Describe a pose style. Unique poses will be generated for each variation.</p>}
            {(poseMode === 'select' && !isMultiVariation) ? (
                <PoseSelector
                    poses={MODEL_POSES}
                    selectedPose={selectedPose}
                    onSelectPose={setSelectedPose}
                />
            ) : (
                <textarea
                    value={describedPose}
                    onChange={(e) => setDescribedPose(e.target.value)}
                    placeholder={isMultiVariation ? "e.g., Energetic walking poses on a runway." : "e.g., A model walking confidently on a runway, facing forward."}
                    className="w-full h-36 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
            )}
          </div>
          
           <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Step 4: Add Background (Optional)</h3>
                <div className="flex space-x-2">
                    <TabButton label="None" isActive={backgroundMode === 'none'} onClick={() => setBackgroundMode('none')} />
                    <TabButton label="Upload" isActive={backgroundMode === 'upload'} onClick={() => setBackgroundMode('upload')} />
                    <TabButton label="Describe" isActive={backgroundMode === 'describe'} onClick={() => setBackgroundMode('describe')} />
                </div>
            </div>
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
                    className="w-full h-36 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-3">
                <label htmlFor="variations-input" className="font-medium text-gray-700">Variations:</label>
                <input
                    id="variations-input"
                    type="number"
                    min="1"
                    max="4"
                    value={numVariations}
                    onChange={(e) => setNumVariations(Math.max(1, Math.min(4, parseInt(e.target.value, 10) || 1)))}
                    className="w-20 p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <button
                onClick={handleGenerate}
                disabled={isGenerateButtonDisabled}
                className="w-full sm:w-auto flex items-center justify-center py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
            >
                {isLoading ? <SpinnerIcon /> : null}
                {isLoading ? 'Generating...' : `Generate ${numVariations} Image${numVariations > 1 ? 's' : ''}`}
            </button>
        </div>
        
        {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-center">
                <strong>Error:</strong> {error}
            </div>
        )}

        <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-700 text-center mb-4">Your Result</h2>
            <div className="w-full min-h-[400px] bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200 p-4">
                {isLoading && (
                    <div className="w-full h-full bg-gray-200 rounded-md animate-pulse"></div>
                )}
                {!isLoading && !generatedImages && (
                    <p className="text-gray-400">Your generated image will appear here.</p>
                )}
                {!isLoading && generatedImages && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        {generatedImages.map((image, index) => (
                            <div key={index} className="text-center space-y-2">
                                <img src={image} alt={`Generated virtual try-on ${index + 1}`} className="w-full object-contain rounded-lg shadow-md mx-auto" />
                                <button 
                                    onClick={() => handleDownload(image, index)}
                                    className="inline-flex items-center justify-center py-2 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors duration-300"
                                >
                                    <DownloadIcon />
                                    Download
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

      </main>
    </div>
  );
}

export default App;