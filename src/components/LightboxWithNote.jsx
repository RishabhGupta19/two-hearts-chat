import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Edit3, Save, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/supabaseClient';
import { toast } from 'sonner';

// Extract dominant color from image (same as PhotoTile)
const getDominantColor = (imageUrl, callback) => {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 100, 100);
      const imageData = ctx.getImageData(30, 30, 40, 40);
      const data = imageData.data;
      
      let r = 0, g = 0, b = 0;
      const pixelCount = data.length / 4;
      for (let i = 0; i < data.length; i += 16) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      
      const sampleCount = pixelCount / 4;
      r = Math.round(r / sampleCount);
      g = Math.round(g / sampleCount);
      b = Math.round(b / sampleCount);
      callback(`rgb(${r}, ${g}, ${b})`);
    } catch (err) {
      callback('rgb(168, 85, 247)');
    }
  };
  img.onerror = () => callback('rgb(168, 85, 247)');
  img.src = imageUrl;
};

export default function LightboxWithNote({ photo, onClose, onNoteUpdate }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(!photo.note);
  const [noteText, setNoteText] = useState(photo.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const [borderColor, setBorderColor] = useState('rgb(168, 85, 247)');

  useEffect(() => {
    if (photo && photo.image_url) {
      getDominantColor(photo.image_url, setBorderColor);
    }
  }, [photo]);

  const handleSaveNote = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('gallery_photos')
        .update({ note: noteText || null })
        .eq('id', photo.id);

      if (error) throw error;
      toast.success('Note saved! 📝');
      setIsEditing(false);
      setIsFlipped(false);
      if (onNoteUpdate) await onNoteUpdate();
    } catch (err) {
      console.error('Failed to save note:', err);
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('gallery_photos')
        .update({ note: null })
        .eq('id', photo.id);

      if (error) throw error;
      toast.success('Note deleted');
      setNoteText('');
      setIsEditing(false);
      setIsFlipped(false);
      if (onNoteUpdate) await onNoteUpdate();
    } catch (err) {
      console.error('Failed to delete note:', err);
      toast.error('Failed to delete note');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed top-0 left-0 w-screen h-screen z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      {/* Lightbox Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full rounded-xl shadow-2xl bg-transparent border-0 overflow-hidden"
        style={{
          maxWidth: '85vw',
          height: '65vh',
        }}
      >
        {/* Close Button Row */}
        <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 bg-transparent">
          <div />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-400/70 hover:bg-gray-500 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Flip Container */}
        <div className="flex-1 min-h-0 relative" style={{ perspective: '1000px' }}>
          <motion.div
            style={{
              transformStyle: 'preserve-3d',
              width: '100%',
              height: '100%',
            }}
            animate={{
              rotateY: isFlipped ? 180 : 0,
            }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
          >
            {/* FRONT - Photo */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
              className="flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-hidden bg-transparent flex items-center justify-center">
                <img
                  src={photo.image_url}
                  alt="Photo"
                  className="max-w-full max-h-full object-contain rounded-lg"
                  style={{
                    border: `2px solid ${borderColor}`,
                  }}
                />
              </div>
            </div>

            {/* BACK - Note Form */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
              className="flex flex-col bg-transparent backdrop-blur-none p-4 overflow-hidden rounded-xl"
            >
              <div className="h-32 overflow-y-auto mb-2 min-h-0 flex">
                {isEditing ? (
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="w-4/5 h-full bg-white border border-gray-300 rounded p-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-xs overflow-y-auto mx-auto"
                  />
                ) : (
                  <div className="w-4/5 h-full bg-gray-50 border border-gray-300 rounded p-2 overflow-y-auto mx-auto">
                    <p className="text-xs text-foreground font-semibold mb-1">Your note</p>
                    <p className="text-xs text-gray-900 whitespace-pre-wrap">{noteText || 'No note yet'}</p>
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={isEditing ? handleSaveNote : () => setIsEditing(true)}
                disabled={isSaving && isEditing}
                style={{
                  backgroundImage: 'linear-gradient(to right, #ff006e, #a020f0)',
                  boxShadow: '0 4px 15px rgba(255, 0, 110, 0.4)',
                  height: '42px',
                  borderRadius: '14px',
                  transition: 'all 0.2s ease',
                }}
                className="w-4/5 mx-auto text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-2xl"
              >
                {isEditing ? (
                  isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      🤍 Save Note
                    </>
                  )
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Add Note Button - Bottom */}
        {!isFlipped && (
          <div className="flex items-center justify-center px-3 py-2 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setIsFlipped(true);
                if (!noteText) {
                  setIsEditing(true);
                }
              }}
              className="h-7 px-4 bg-transparent text-white/80 rounded font-medium text-xs transition whitespace-nowrap hover:text-white"
            >
              {noteText ? 'View Note' : 'Add Note'}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
