import React from 'react';
import { X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreviewProps {
  file: File;
  compressedFile?: File;
  onConfirm: () => void;
  onCancel: () => void;
  isCompressing?: boolean;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  file,
  compressedFile,
  onConfirm,
  onCancel,
  isCompressing = false,
}) => {
  const displayFile = compressedFile || file;
  const originalSize = (file.size / 1024 / 1024).toFixed(2);
  const compressedSize = compressedFile ? (compressedFile.size / 1024 / 1024).toFixed(2) : null;
  const compressionRatio = compressedFile ? ((1 - compressedFile.size / file.size) * 100).toFixed(1) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Image Preview</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative">
            <img
              src={URL.createObjectURL(displayFile)}
              alt="Preview"
              className="w-full h-64 object-cover rounded-lg"
            />
            {isCompressing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-sm">Compressing...</p>
                </div>
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Original size:</span>
              <span className="font-medium">{originalSize} MB</span>
            </div>
            
            {compressedSize && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Compressed size:</span>
                <span className="font-medium text-green-600">{compressedSize} MB</span>
              </div>
            )}
            
            {compressionRatio && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Size reduction:</span>
                <span className="font-medium text-green-600">{compressionRatio}%</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isCompressing}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isCompressing ? 'Compressing...' : 'Upload Image'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreview; 