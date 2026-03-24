import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/supabaseClient';
import { ArrowLeft, Plus, Loader2, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import PhotoTile from '@/components/PhotoTile';
import LightboxWithNote from '@/components/LightboxWithNote';

const Gallery = () => {
  const navigate = useNavigate();
  const { user, coupleId } = useApp();
  const fileInputRef = useRef(null);

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);

  // Fetch photos on load
  useEffect(() => {
    fetchPhotos();
  }, [coupleId]);

  const fetchPhotos = async () => {
    if (!coupleId) {
      console.log('No coupleId available');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gallery_photos')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error.message, error.details, error.code);
        throw error;
      }
      setPhotos(data || []);
    } catch (err) {
      console.error('Failed to fetch photos:', err);
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10MB');
      return;
    }

    try {
      setUploading(true);

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const fileName = `${timestamp}-${random}-${file.name}`;
      const filePath = `${coupleId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // Save metadata to database
      const { error: dbError } = await supabase.from('gallery_photos').insert([
        {
          couple_id: coupleId,
          uploaded_by: user.id,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
          note: null,
        },
      ]);

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error('Failed to save photo. Please try again.');
        return;
      }

      toast.success('Photo uploaded! 📸');
      await fetchPhotos();
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photo) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      setUploading(true);

      // Delete from storage
      if (photo.image_url) {
        const filePath = photo.image_url.split('/').slice(-2).join('/');
        const { error: storageError } = await supabase.storage
          .from('gallery')
          .remove([filePath]);

        if (storageError) console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('gallery_photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      toast.success('Image deleted');
      await fetchPhotos();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-screen bg-background/80 backdrop-blur-md flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%), linear-gradient(to bottom, var(--background))' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 flex-shrink-0 backdrop-blur-sm bg-card">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <h1 className="font-heading text-lg font-semibold text-foreground">Gallery</h1>
        <div className="w-16" />
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {loading && !photos.length ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Grid Layout */}
              <div className="grid grid-cols-3 md:grid-cols-4 gap-1">
                {/* Add Photo Button - Always First */}
                <motion.label
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="cursor-pointer"
                >
                  <div className="aspect-square rounded-lg bg-card border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center group">
                    <div className="text-center">
                      <Plus className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition" />
                      <p className="text-xs font-body text-muted-foreground">Add Photo</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                </motion.label>

                {/* Photo Tiles */}
                {photos.map((photo) => (
                  <PhotoTile
                    key={photo.id}
                    photo={photo}
                    onClick={() => {
                      setSelectedPhoto(photo);
                      setShowLightbox(true);
                    }}
                  />
                ))}
              </div>

              {/* Empty State */}
              {photos.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <ImagePlus className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-lg text-muted-foreground/70">Your memories will appear here</p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {showLightbox && selectedPhoto && (
          <LightboxWithNote
            photo={selectedPhoto}
            onClose={() => {
              setShowLightbox(false);
              setSelectedPhoto(null);
            }}
            onNoteUpdate={fetchPhotos}
            currentUserId={user?.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;
