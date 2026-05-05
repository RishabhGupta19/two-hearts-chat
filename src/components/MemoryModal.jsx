import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Image, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/context/AppContext';
import api, { API_BASE_URL } from '@/api';
import { toast } from 'sonner';

const getPhotoUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `${API_BASE_URL}${imagePath}`;
};

const MemoryModal = ({ date, memory, onClose, onSave, emojis }) => {
  const { coupleId } = useApp();
  const [title, setTitle] = useState(memory?.title || 'A memory');
  const [note, setNote] = useState(memory?.note || '');
  const [selectedEmoji, setSelectedEmoji] = useState(memory?.emoji || '🌸');
  const [selectedPhotos, setSelectedPhotos] = useState(memory?.photo_ids || []);
  const [allPhotos, setAllPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoBlobs, setPhotoBlobs] = useState({});
  const [loadedPhotos, setLoadedPhotos] = useState(new Set());

  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    fetchGalleryPhotos();
    setLoadedPhotos(new Set());
    
    // Cleanup object URLs on unmount
    return () => {
      Object.values(photoBlobs).forEach((url) => {
        if (url?.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const fetchGalleryPhotos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/gallery/photos');
      if (response.data.photos) {
        setAllPhotos(response.data.photos);
        // Load blobs for all photos
        response.data.photos.forEach((photo) => {
          if (!photoBlobs[photo.id]) {
            loadPhotoBlob(photo.id);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching gallery photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotoBlob = async (photoId) => {
    try {
      const response = await api.get(`/gallery/photo/${photoId}/`, {
        responseType: 'blob',
      });
      const objectUrl = URL.createObjectURL(response.data);
      setPhotoBlobs((prev) => ({
        ...prev,
        [photoId]: objectUrl,
      }));
    } catch (error) {
      console.error('Failed to load photo blob:', error);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Invalid file type');
      return;
    }

    // Validate file size (10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large (max 10MB)');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/gallery/photos', formData);
      if (response.data.id) {
        const newPhotoId = response.data.id;
        setSelectedPhotos([...selectedPhotos, newPhotoId]);
        setAllPhotos([...allPhotos, response.data]);
        toast.success('Photo uploaded!');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload photo');
    }
  };

  const removePhoto = (photoId) => {
    setSelectedPhotos(selectedPhotos.filter(id => id !== photoId));
  };

  const handlePhotoLoad = (photoId) => {
    // Add minimum 300ms delay to ensure skeleton is visible
    setTimeout(() => {
      setLoadedPhotos((prev) => new Set([...prev, photoId]));
    }, 300);
  };

  const handleSave = async () => {
    setSavingMemory(true);
    try {
      await api.post('/couple/calendar/memory', {
        date: date + 'T00:00:00Z',
        title: title.trim(),
        note: note.trim(),
        emoji: selectedEmoji,
        photo_ids: selectedPhotos,
      });
      toast.success('Memory saved!');
      onSave();
    } catch (error) {
      toast.error('Failed to save memory');
      console.error(error);
    } finally {
      setSavingMemory(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/couple/calendar/memory?date=${date}T00:00:00Z`);
      toast.success('Memory deleted');
      setShowDeleteConfirm(false);
      onSave();
    } catch (error) {
      toast.error('Failed to delete memory');
      console.error(error);
    }
  };

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
            <h2 className="text-2xl font-bold text-white">Add a memory</h2>
          </div>
          {memory && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors ml-4"
            >
              <Trash2 className="h-6 w-6 text-white" />
            </button>
          )}
        </div>

        {/* Content - White Background */}
        <div className="p-6 space-y-6 bg-white">
          {/* TITLE Section */}
          <div>
            <label className="block text-xs font-semibold text-orange-600 mb-2 tracking-widest">
              TITLE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this memory a title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>

          {/* MOOD Section */}
          <div>
            <label className="block text-xs font-semibold text-orange-600 mb-3 tracking-widest">
              MOOD
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { emoji: '🌸', label: 'Loved' },
                { emoji: '😊', label: 'Happy' },
                { emoji: '✨', label: 'Excited' },
                { emoji: '🧡', label: 'Grateful' },
              ].map((item) => (
                <button
                  key={item.emoji}
                  onClick={() => setSelectedEmoji(item.emoji)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    selectedEmoji === item.emoji
                      ? 'border-2 border-orange-400 bg-orange-50'
                      : 'border-2 border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className={`text-xs font-medium ${
                    selectedEmoji === item.emoji ? 'text-orange-600' : 'text-gray-400'
                  }`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Note Textarea */}
          <div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="Something to remember..."
              className="min-h-[120px] resize-none border border-gray-200 rounded-xl p-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Add Photo from Gallery */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-3 rounded-xl">
                  <Image className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">Add a photo</span>
                  <span className="text-xs text-orange-600">From your gallery</span>
                </div>
              </div>
            </div>

            {/* Gallery Photos */}
            {!loading && allPhotos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-xl">
                {allPhotos.map((photo) => {
                  const isLoaded = loadedPhotos.has(photo.id);
                  return (
                    <motion.button
                      key={photo.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (selectedPhotos.includes(photo.id)) {
                          removePhoto(photo.id);
                        } else {
                          setSelectedPhotos([...selectedPhotos, photo.id]);
                        }
                      }}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                        selectedPhotos.includes(photo.id)
                          ? 'border-orange-500 ring-2 ring-orange-300'
                          : 'border-gray-300 hover:border-orange-300'
                      }`}
                      style={{ background: '#f5f5f5' }}
                    >
                      {/* Loading skeleton */}
                      {!isLoaded && photoBlobs[photo.id] && (
                        <motion.div
                          initial={{ opacity: 0.5 }}
                          animate={{ opacity: 0.8 }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                          className="absolute inset-0 z-20"
                          style={{
                            background: 'linear-gradient(135deg, #e5e5e5 0%, #d0d0d0 100%)'
                          }}
                        />
                      )}
                      {photoBlobs[photo.id] && (
                        <img
                          src={photoBlobs[photo.id]}
                          alt="gallery"
                          className={`w-full aspect-square object-cover transition-all duration-300 relative z-30 ${
                            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                          }`}
                          style={{ transition: 'opacity 0.3s ease, transform 0.3s ease' }}
                          onLoad={() => handlePhotoLoad(photo.id)}
                        />
                      )}
                      {selectedPhotos.includes(photo.id) && (
                        <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center z-40">
                          <span className="text-white text-lg">✓</span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : loading ? (
              <div className="text-center py-6 text-gray-500 text-sm">Loading photos...</div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">No photos in gallery</div>
            )}
          </div>

          {/* Selected Photos Display */}
          {selectedPhotos.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Photos ({selectedPhotos.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {selectedPhotos.map((photoId) => {
                  const photo = allPhotos.find(p => p.id === photoId);
                  const isLoaded = loadedPhotos.has(photoId);
                  return (
                    <motion.div
                      key={photoId}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="relative group"
                      style={{ background: '#f5f5f5' }}
                    >
                      {photo && (
                        <>
                          {/* Loading skeleton */}
                          {!isLoaded && photoBlobs[photo.id] && (
                            <motion.div
                              initial={{ opacity: 0.5 }}
                              animate={{ opacity: 0.8 }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                              className="absolute inset-0 z-20 rounded-lg"
                              style={{
                                background: 'linear-gradient(135deg, #e5e5e5 0%, #d0d0d0 100%)'
                              }}
                            />
                          )}
                          <img
                            src={photoBlobs[photo.id] || ''}
                            alt="memory"
                            className={`w-full aspect-square rounded-lg object-cover transition-all duration-300 relative z-30 ${
                              isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                            }`}
                            style={{ transition: 'opacity 0.3s ease, transform 0.3s ease' }}
                            onLoad={() => handlePhotoLoad(photoId)}
                          />
                          <button
                            onClick={() => removePhoto(photoId)}
                            className="absolute -top-2 -right-2 p-1 bg-orange-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-40"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Save/Update Button */}
          <button
            onClick={handleSave}
            disabled={savingMemory}
            className="w-full py-3 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
          >
            {savingMemory ? 'Saving...' : memory ? 'Update memory' : 'Save memory'}
          </button>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-4 max-w-xs w-full mx-4"
              >
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                  Delete memory?
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                  This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MemoryModal;
