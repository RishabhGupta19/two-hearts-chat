import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import api, { resolveApiUrl } from '@/api';

const Lightbox = ({ photo, onClose }) => {
  const imageSrc = photo?.id
    ? resolveApiUrl(`/gallery/photo/${photo.id}/`)
    : photo?.image_url;
  const [displaySrc, setDisplaySrc] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    setDisplaySrc('');

    if (!photo?.id) {
      setDisplaySrc(photo?.image_url || '');
      return undefined;
    }

    const loadImage = async () => {
      try {
        const response = await api.get(`/gallery/photo/${photo.id}/`, {
          responseType: 'blob',
        });
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setDisplaySrc(objectUrl);
      } catch (error) {
        console.error('Failed to load gallery image:', error);
        if (active) setDisplaySrc(photo?.image_url || '');
      }
    };

    loadImage();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo?.id, photo?.image_url]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full max-w-4xl max-h-[90vh]"
      >
        {/* Close Button (inside viewport) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-20 bg-black/50 rounded-full p-2"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Image */}
        <img
          src={displaySrc || imageSrc}
          alt="Full view"
          className="w-full h-full object-contain rounded-lg"
        />

        {/* Bottom Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg"
        >
          <p className="text-xs text-gray-300 font-body">
            {new Date(photo.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Kolkata',
            })}
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Lightbox;
