import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Edit2 } from 'lucide-react';

const MemoryView = ({ date, memory, onClose, onEdit, photoBlobs }) => {
  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  if (!memory) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background rounded-3xl shadow-xl max-w-sm w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header - Dark Brown */}
        <div className="bg-amber-950 dark:bg-amber-950 p-6 flex items-start justify-between rounded-t-3xl">
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <div className="flex-1 ml-4">
            <p className="text-sm text-amber-100">{formattedDate}</p>
            <h2 className="text-2xl font-bold text-white">{memory?.title || 'A memory'}</h2>
          </div>
          <button
            onClick={onEdit}
            className="p-1 hover:bg-white/20 rounded-full transition-colors ml-4"
          >
            <Edit2 className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content - White Background */}
        <div className="p-6 space-y-6 bg-white">
          {/* Mood Display */}
          <div>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{memory.emoji}</span>
              <span className="text-sm font-medium text-orange-600 capitalize">
                {memory.emoji === '🌸' && 'Loved'}
                {memory.emoji === '😊' && 'Happy'}
                {memory.emoji === '✨' && 'Excited'}
                {memory.emoji === '🧡' && 'Grateful'}
              </span>
            </div>
          </div>

          {/* Note */}
          {memory.note && (
            <div>
              <p className="text-xs font-semibold text-orange-600 mb-2 tracking-widest">
                NOTE
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {memory.note}
              </p>
            </div>
          )}

          {/* Photos */}
          {memory.photo_ids && memory.photo_ids.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-600 mb-3 tracking-widest">
                PHOTOS
              </p>
              <div className="grid grid-cols-3 gap-3">
                {memory.photo_ids.slice(0, 3).map((photoId, idx) => {
                  const isMorePhotos = idx === 2 && memory.photo_ids.length > 3;
                  return (
                    <div
                      key={photoId}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
                    >
                      {photoBlobs[photoId] && (
                        <img
                          src={photoBlobs[photoId]}
                          alt="memory"
                          className="w-full h-full object-cover"
                        />
                      )}
                      {isMorePhotos && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            +{memory.photo_ids.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MemoryView;
