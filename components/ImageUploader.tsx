import React, { useState, useCallback } from 'react';
import type { ImageState } from '../types';

interface ImageUploaderProps {
  id: string;
  label?: string;
  icon: React.ReactNode;
  onImageUpload: (imageState: ImageState) => void;
  imagePreview: string | null;
}

const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, icon, onImageUpload, imagePreview }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      const { base64, mimeType } = await fileToBase64(file);
      onImageUpload({
        file,
        previewUrl: URL.createObjectURL(file),
        base64,
        mimeType,
      });
    }
  }, [onImageUpload]);

  const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      {label && <h3 className="font-semibold text-gray-700">{label}</h3>}
      <label
        htmlFor={id}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`w-full h-48 flex items-center justify-center rounded-lg border-2 border-dashed transition-colors duration-200 cursor-pointer ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        {imagePreview ? (
          <img src={imagePreview} alt="Preview" className="h-full w-full object-cover rounded-md" />
        ) : (
          <div className="text-center">
            {icon}
            <p className="mt-2 text-sm text-gray-500">Click to upload or drag and drop</p>
          </div>
        )}
      </label>
      <input id={id} type="file" className="hidden" accept="image/png, image/jpeg" onChange={onChange} />
    </div>
  );
};
