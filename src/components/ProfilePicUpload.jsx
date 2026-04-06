import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

export default function ProfilePicUpload({ currentImage, userName }) {
  const { updateProfilePic } = useApp();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Validate file (basic)
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Please select a JPG, PNG or WebP image');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image must be smaller than 15MB');
      return;
    }

    // Create preview and hold pending file until user confirms
    const url = URL.createObjectURL(file);
    setPreviewSrc(url);
    setPendingFile(file);
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;
    try {
      setUploading(true);
      await updateProfilePic(pendingFile);
      toast.success('Profile picture updated! 📸');
      setPreviewSrc(null);
      setPendingFile(null);
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(err.message || 'Failed to update profile picture');
    } finally {
      setUploading(false);
      if (previewSrc) {
        URL.revokeObjectURL(previewSrc);
      }
    }
  };

  const cancelPreview = () => {
    if (previewSrc) URL.revokeObjectURL(previewSrc);
    setPreviewSrc(null);
    setPendingFile(null);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="relative"
      >
        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-medium text-primary overflow-hidden border-2 border-primary/30">
          {previewSrc ? (
            <img src={previewSrc} alt="preview" className="h-full w-full object-contain object-center block p-0.5" />
          ) : currentImage ? (
            <img src={currentImage} alt={userName} className="h-full w-full object-contain object-center block p-0.5" />
          ) : (
            <span>{(userName || 'U').charAt(0).toUpperCase()}</span>
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center"
          title="Change profile picture"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </motion.button>
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {previewSrc ? (
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={confirmUpload}
            disabled={uploading}
            className="rounded-pill bg-primary px-3 py-1 text-xs text-primary-foreground"
          >
            {uploading ? 'Uploading...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={cancelPreview}
            disabled={uploading}
            className="rounded-pill px-3 py-1 text-xs bg-muted text-muted-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        null
      )}
    </div>
  );
}
