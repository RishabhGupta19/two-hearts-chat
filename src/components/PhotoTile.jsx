import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

// ── Cloudinary URL transforms ─────────────────────────────────────────────────
// Inject transformation params into Cloudinary URLs for optimized delivery.
// e.g. .../upload/v123/photo.jpg → .../upload/f_auto,q_auto,w_300/v123/photo.jpg
const cloudinaryThumb = (url, width = 300) => {
  if (!url) return url;
  try {
    return url.replace(
      /\/upload\/(?:v\d+\/)?/,
      (match) => `/upload/f_auto,q_auto,w_${width},c_fill/${match.replace('/upload/', '')}`
    );
  } catch {
    return url;
  }
};

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
  const [borderColor, setBorderColor] = useState(
    () => colorCache.get(photo?.image_url) || 'rgb(168, 85, 247)'
  );
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);

  const handleImageLoad = useCallback(() => {
    setLoaded(true);
    if (imgRef.current && photo?.image_url) {
      const color = extractDominantColor(imgRef.current, photo.image_url);
      setBorderColor(color);
    }
  }, [photo?.image_url]);

  if (!photo) return null;

  // Use optimized thumbnail URL for the grid
  const thumbUrl = cloudinaryThumb(photo.image_url, 300);

  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
      onClick={onClick}
      className="cursor-pointer relative"
    >
      <div
        className="aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
        style={{
          border: `3px solid ${borderColor}`,
          boxShadow: `0 0 8px ${borderColor}80, ${borderColor === 'rgb(168, 85, 247)' ? '' : '0 4px 12px rgba(0, 0, 0, 0.15)'}`,
          background: 'hsl(var(--muted))',
        }}
      >
        {/* Blurred low-res placeholder */}
        {!loaded && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{ background: 'hsl(var(--muted))' }}
          />
        )}
        <img
          ref={imgRef}
          src={thumbUrl}
          alt="Gallery"
          loading="lazy"
          decoding="async"
          crossOrigin="anonymous"
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
