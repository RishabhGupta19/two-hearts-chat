import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Extract dominant color from image using canvas
const getDominantColor = (imageUrl, callback) => {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0, 100, 100);
      
      // Get pixel data from center region (40x40 area in middle)
      const imageData = ctx.getImageData(30, 30, 40, 40);
      const data = imageData.data;
      
      let r = 0, g = 0, b = 0;
      const pixelCount = data.length / 4;
      
      // Sample every 4th pixel to get average color
      for (let i = 0; i < data.length; i += 16) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      
      // Calculate average
      const sampleCount = pixelCount / 4;
      r = Math.round(r / sampleCount);
      g = Math.round(g / sampleCount);
      b = Math.round(b / sampleCount);
      
      callback(`rgb(${r}, ${g}, ${b})`);
    } catch (err) {
      console.error('Error sampling color:', err);
      // Fallback color
      callback('rgb(168, 85, 247)'); // purple
    }
  };
  
  img.onerror = () => {
    console.error('Failed to load image for color sampling');
    callback('rgb(168, 85, 247)'); // fallback purple
  };
  
  img.src = imageUrl;
};

export default function PhotoTile({ photo, onClick }) {
  const [borderColor, setBorderColor] = useState('rgb(168, 85, 247)'); // default purple
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (photo && photo.image_url) {
      getDominantColor(photo.image_url, (color) => {
        setBorderColor(color);
        setIsLoading(false);
      });
    }
  }, [photo]);

  if (!photo) return null;

  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <div
        className="aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
        style={{
          border: `3px solid ${borderColor}`,
          boxShadow: `0 0 8px ${borderColor}80, ${borderColor === 'rgb(168, 85, 247)' ? '' : '0 4px 12px rgba(0, 0, 0, 0.15)'}`,
        }}
      >
        <img
          src={photo.image_url}
          alt="Gallery"
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </motion.div>
  );
}

