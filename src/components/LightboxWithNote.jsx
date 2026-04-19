import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { X, Edit3, Save, Trash2, Loader2 } from 'lucide-react';
import api from '@/api';
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

export default function LightboxWithNote({ photo, onClose, onNoteUpdate, currentUserId }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(!photo.note);
  const [noteText, setNoteText] = useState(photo.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const [borderColor, setBorderColor] = useState('rgb(168, 85, 247)');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isPhotoOwner = currentUserId && photo.uploaded_by === currentUserId;

  useEffect(() => {
    if (photo && photo.image_url) {
      getDominantColor(photo.image_url, setBorderColor);
    }
  }, [photo]);

  const handleSaveNote = async () => {
    try {
      setIsSaving(true);
      await api.put(`/gallery/photos/${photo.id}/note`, { note: noteText || null });
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
      await api.put(`/gallery/photos/${photo.id}/note`, { note: null });
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

  const handleDeletePhoto = async () => {
    try {
      setIsSaving(true);
      await api.delete(`/gallery/photos/${photo.id}`);
      toast.success('Photo deleted');
      if (onNoteUpdate) await onNoteUpdate();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete photo');
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
          {isPhotoOwner && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-white/10 text-white transition-colors"
              title="Delete photo"
            >
              <Trash2 className="w-5 h-5" />
            </motion.button>
          )}
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

        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed top-0 left-0 w-screen h-screen z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-foreground mb-2">Delete this photo?</h3>
                <p className="text-sm text-muted-foreground mb-6">This action cannot be undone.</p>
                <div className="flex gap-3 justify-end">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      handleDeletePhoto();
                    }}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  backgroundImage: 'linear-gradient(to right, #e8c499, #9d7d52)',
                  boxShadow: '0 4px 15px rgba(232, 196, 153, 0.4)',
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
