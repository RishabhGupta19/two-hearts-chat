import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { X, Edit3, Save, Trash2, Loader2 } from 'lucide-react';
import api, { resolveApiUrl } from '@/api';
import { toast } from 'sonner';

// Extract dominant color from an already-loaded img element (no extra network request)
const extractColor = (imgEl) => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, 50, 50);
    const data = ctx.getImageData(10, 10, 30, 30).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
    }
    return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
  } catch {
    return 'rgb(168, 85, 247)';
  }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const usePinchZoom = () => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const gestureRef = useRef({
    initialDistance: 0,
    initialScale: 1,
    initialPosition: { x: 0, y: 0 },
    initialCenter: { x: 0, y: 0 },
    panOrigin: { x: 0, y: 0 },
    lastTapAt: 0,
    moved: false,
  });

  const reset = () => {
    gestureRef.current.moved = false;
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const getTouchMetrics = (touches) => {
    const [first, second] = touches;
    const dx = second.clientX - first.clientX;
    const dy = second.clientY - first.clientY;
    return {
      distance: Math.hypot(dx, dy),
      center: {
        x: (first.clientX + second.clientX) / 2,
        y: (first.clientY + second.clientY) / 2,
      },
    };
  };

  const onTouchStart = (event) => {
    const { touches } = event;

    if (touches.length === 2) {
      const { distance, center } = getTouchMetrics(touches);
      gestureRef.current.initialDistance = distance;
      gestureRef.current.initialScale = scale;
      gestureRef.current.initialPosition = position;
      gestureRef.current.initialCenter = center;
      gestureRef.current.moved = false;
      return;
    }

    if (touches.length === 1 && scale > 1) {
      const touch = touches[0];
      gestureRef.current.panOrigin = {
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      };
      gestureRef.current.moved = false;
    }
  };

  const onTouchMove = (event) => {
    const { touches } = event;

    if (touches.length === 2) {
      event.preventDefault();
      const { distance, center } = getTouchMetrics(touches);
      const nextScale = clamp(
        gestureRef.current.initialScale * (distance / gestureRef.current.initialDistance),
        1,
        4
      );
      gestureRef.current.moved = true;
      setScale(nextScale);
      setPosition({
        x: gestureRef.current.initialPosition.x + (center.x - gestureRef.current.initialCenter.x),
        y: gestureRef.current.initialPosition.y + (center.y - gestureRef.current.initialCenter.y),
      });
      return;
    }

    if (touches.length === 1 && scale > 1) {
      event.preventDefault();
      const touch = touches[0];
      gestureRef.current.moved = true;
      setPosition({
        x: touch.clientX - gestureRef.current.panOrigin.x,
        y: touch.clientY - gestureRef.current.panOrigin.y,
      });
    }
  };

  const onTouchEnd = (event) => {
    if (event.touches.length === 0) {
      if (!gestureRef.current.moved) {
        const now = Date.now();
        if (now - gestureRef.current.lastTapAt < 300) {
          reset();
        }
        gestureRef.current.lastTapAt = now;
      }

      gestureRef.current.moved = false;

      if (scale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  return { scale, position, onTouchStart, onTouchMove, onTouchEnd, reset };
};

export default function LightboxWithNote({ photo, onClose, onNoteUpdate, currentUserId }) {
  const imageSrc = photo?.id
    ? resolveApiUrl(`/gallery/photo/${photo.id}/`)
    : photo?.image_url;
  const [displaySrc, setDisplaySrc] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(!photo.note);
  const [noteText, setNoteText] = useState(photo.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const [borderColor, setBorderColor] = useState('rgb(168, 85, 247)');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isPhotoOwner = currentUserId && photo.uploaded_by === currentUserId;
  const { scale, position, onTouchStart, onTouchMove, onTouchEnd, reset } = usePinchZoom();

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

  // Color will be extracted from the img's onLoad event below — no separate
  // Image() load needed.

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
      onClick={() => {
        if (scale === 1) onClose();
      }}
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
              <div className="flex-1 overflow-hidden bg-transparent flex items-center justify-center relative">
                {!displaySrc && (
                  <motion.div
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 0.3 }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-gradient-to-br from-purple-400/30 to-purple-600/20 rounded-lg"
                  />
                )}
                <img
                  src={displaySrc || imageSrc}
                  alt="Photo"
                  draggable={false}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onDoubleClick={reset}
                  className={`max-w-full max-h-full object-contain rounded-lg transition-opacity duration-300 ${
                    displaySrc ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{
                    border: `2px solid ${borderColor}`,
                    transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                    transformOrigin: 'center center',
                    transition: scale === 1 ? 'transform 0.2s ease' : 'none',
                    touchAction: 'none',
                    userSelect: 'none',
                  }}
                  onLoad={(e) => setBorderColor(extractColor(e.currentTarget))}
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
          <div
            className="flex items-center justify-center px-3 py-2 flex-shrink-0"
            style={{ opacity: scale > 1 ? 0 : 1, transition: 'opacity 0.2s ease' }}
          >
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
