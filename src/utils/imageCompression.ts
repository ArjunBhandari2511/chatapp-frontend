import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
  quality?: number;
}

export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const defaultOptions: CompressionOptions = {
    maxSizeMB: 1, // Compress to max 1MB
    maxWidthOrHeight: 1920, // Max width or height
    useWebWorker: true, // Use web worker for better performance
    fileType: 'image/jpeg', // Convert to JPEG for better compression
    quality: 0.8, // 80% quality
  };

  const compressionOptions = { ...defaultOptions, ...options };

  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    
    // Log compression results
    const originalSize = (file.size / 1024 / 1024).toFixed(2);
    const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
    const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
    
    console.log(`Image compressed: ${originalSize}MB → ${compressedSize}MB (${compressionRatio}% reduction)`);
    
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return file;
  }
};

export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'Please select an image file' };
  }

  // Check file size (before compression)
  const maxSizeMB = 10; // Allow larger files since we'll compress them
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { isValid: false, error: `Image size must be less than ${maxSizeMB}MB` };
  }

  return { isValid: true };
}; 