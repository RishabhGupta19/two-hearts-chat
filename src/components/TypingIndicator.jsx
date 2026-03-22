import { motion } from 'framer-motion';

export const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    className="flex justify-start mb-3"
  >
    <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-soft">
      <span className="text-xs font-medium text-muted-foreground block mb-1">AI Companion</span>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block w-2 h-2 rounded-full bg-muted-foreground/50"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  </motion.div>
);
