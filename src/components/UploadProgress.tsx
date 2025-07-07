import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface UploadProgressProps {
  progress: number;
  status: 'compressing' | 'uploading' | 'completed' | 'error';
  fileName?: string;
  errorMessage?: string;
}

const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  status,
  fileName,
  errorMessage,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'compressing':
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    const isImage = fileName ? /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName) : false;
    switch (status) {
      case 'compressing':
        return isImage ? 'Compressing image...' : '';
      case 'uploading':
        return isImage ? 'Uploading image...' : 'Uploading file...';
      case 'completed':
        return isImage ? 'Upload completed!' : 'File uploaded successfully!';
      case 'error':
        return errorMessage || 'Upload failed';
      default:
        return '';
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex items-center gap-3 mb-3">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {fileName || 'Image upload'}
          </p>
          <p className="text-xs text-gray-500">{getStatusText()}</p>
        </div>
      </div>
      
      {status !== 'completed' && status !== 'error' && (
        <div className="space-y-2">
          <Progress 
            value={progress} 
            className="h-2"
          />
          <p className="text-xs text-gray-500 text-right">
            {Math.round(progress)}%
          </p>
        </div>
      )}
      
      {status === 'completed' && (
        <div className="text-xs text-green-600">
          {fileName && /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName)
            ? 'Image uploaded successfully'
            : 'File uploaded successfully'}
        </div>
      )}
      
      {status === 'error' && (
        <div className="text-xs text-red-600">
          {errorMessage || 'Upload failed. Please try again.'}
        </div>
      )}
    </div>
  );
};

export default UploadProgress; 