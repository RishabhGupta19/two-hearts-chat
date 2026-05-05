import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import api, { resolveApiUrl } from '@/api';

const getPhotoSrc = (photoId, fallbackUrl = '') =>
  photoId ? resolveApiUrl(`/gallery/photo/${photoId}/`) : fallbackUrl;

// ── Dominant color cache (avoids re-computing on every render) ─────────────────
const colorCache = new Map();

const extractDominantColor = (imgElement, imageUrl) => {
  if (colorCache.has(imageUrl)) return colorCache.get(imageUrl);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0, 50, 50);
    const data = ctx.getImageData(10, 10, 30, 30).data;

    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    const color = `rgb(${r}, ${g}, ${b})`;
    colorCache.set(imageUrl, color);
    return color;
  } catch {
    return 'rgb(168, 85, 247)';
  }
};

// ── PhotoTile ─────────────────────────────────────────────────────────────────
export default function PhotoTile({ photo, onClick }) {
  const imageSrc = getPhotoSrc(photo?.id, photo?.image_url || '');
  const [displaySrc, setDisplaySrc] = useState('');
  const [borderColor, setBorderColor] = useState(
    () => colorCache.get(imageSrc) || 'rgb(168, 85, 247)'
  );
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    setLoaded(false);
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

  const handleImageLoad = useCallback(() => {
    setLoaded(true);
    if (imgRef.current && displaySrc) {
      const color = extractDominantColor(imgRef.current, displaySrc);
      setBorderColor(color);
    }
  }, [displaySrc]);

  if (!photo) return null;

  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
      onClick={onClick}
      className="cursor-pointer relative"
    >
      <div
        className="aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow relative"
        style={{
          border: `3px solid ${borderColor}`,
          boxShadow: `0 0 8px ${borderColor}80, ${borderColor === 'rgb(168, 85, 247)' ? '' : '0 4px 12px rgba(0, 0, 0, 0.15)'}`,
          background: 'hsl(var(--muted))',
        }}
      >
        {/* Enhanced loading skeleton */}
        {!loaded && (
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0.7 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20 z-10"
          />
        )}
        <img
          ref={imgRef}
          src={displaySrc}
          alt="Gallery"
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover transition-all duration-300 ${
            loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          style={{ transition: 'opacity 0.3s ease, transform 0.3s ease' }}
          onLoad={handleImageLoad}
        />
      </div>
    </motion.div>
  );
}
