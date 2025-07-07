import React from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ isOpen, onClose, imageUrl, alt = 'Image' }) => {
  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={[{ src: imageUrl, alt }]}
      carousel={{
        finite: true,
      }}
      animation={{
        fade: 300,
      }}
      controller={{
        closeOnBackdropClick: true,
        closeOnPullDown: true,
      }}
    />
  );
};

export default ImageLightbox; 