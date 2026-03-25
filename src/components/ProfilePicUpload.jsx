import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

export default function ProfilePicUpload({ currentImage, userName }) {
  const { updateProfilePic } = useApp();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    try {
      setUploading(true);
      await updateProfilePic(file);
      toast.success('Profile picture updated! 📸');
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(err.message || 'Failed to update profile picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="relative"
      >
        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-medium text-primary overflow-hidden border-2 border-primary/30">
          {currentImage ? (
            <img
              src={currentImage}
              alt={userName}
              className="h-full w-full object-cover"
            />
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

      <p className="text-xs text-muted-foreground text-center">
        {uploading ? 'Uploading...' : 'Click the camera icon to change your profile picture'}
      </p>
    </div>
  );
}
