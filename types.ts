export interface ImageState {
  file: File | null;
  previewUrl: string | null;
  base64: string | null;
  mimeType: string | null;
}

export interface Pose {
  id: number;
  url: string;
  name: string;
  description: string;
}

export interface BackgroundOption {
  id: number;
  url: string;
  name: string;
  description: string;
}

export interface ImageData {
  base64: string;
  mimeType: string;
}

export interface GenerateImageProps {
  userFace: ImageData;
  productImage: ImageData;
  modelPose?: ImageData;
  describedPose?: string;
  backgroundImage?: ImageData;
  describedBackground?: string;
  variationInfo?: {
    current: number;
    total: number;
  };
}