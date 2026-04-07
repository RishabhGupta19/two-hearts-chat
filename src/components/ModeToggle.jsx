import { motion } from 'framer-motion';

export const ModeToggle = ({ mode, onModeChange }) => {
  const modes = [
    { key: 'calm', label: 'Calm', mobileLabel: '😊' },
    { key: 'vent', label: 'Vent', mobileLabel: '😤' },
  ];

  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-pill bg-muted p-0.5 max-w-full">
      {modes.map((item) => (
        <motion.button
          key={item.key}
          type="button"
          onClick={() => onModeChange(item.key)}
          whileTap={{ scale: 0.97 }}
          className={`relative inline-flex min-w-0 items-center justify-center rounded-pill px-2 py-1 text-[10px] sm:px-2.5 sm:text-xs font-medium font-body leading-none whitespace-nowrap transition-colors ${
            mode === item.key ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {mode === item.key && (
            <motion.div
              layoutId="mode-pill"
              className="absolute inset-0 rounded-pill bg-primary"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">
            <span className="sm:hidden">{item.mobileLabel}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </span>
        </motion.button>
      ))}
    </div>
  );
};
