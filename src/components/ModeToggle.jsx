import { motion } from 'framer-motion';







export const ModeToggle = ({ mode, onModeChange }) => {
  return (
    <div className="flex items-center gap-0.5 rounded-pill bg-muted p-0.5">
      {['calm', 'vent'].map((m) =>
      <motion.button
        key={m}
        onClick={() => onModeChange(m)}
        className={`relative rounded-pill px-2.5 py-1 text-xs font-medium font-body transition-colors ${
        mode === m ? '' : 'text-muted-foreground hover:text-foreground'}`
        }
        whileTap={{ scale: 0.97 }}>
        
          {mode === m &&
        <motion.div
          layoutId="mode-pill"
          className="absolute inset-0 rounded-pill bg-primary"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }} />

        }
          <span className={`relative z-10 ${mode === m ? 'text-primary-foreground' : ''}`}>
            {m === 'calm' ? '😊 Calm' : '😤 Vent'}
          </span>
        </motion.button>
      )}
    </div>);

};