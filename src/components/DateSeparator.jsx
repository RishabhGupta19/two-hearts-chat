import { motion } from 'framer-motion';

const IST_TZ = 'Asia/Kolkata';

const parseMessageDate = (value) => {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return new Date(value);
  const hasZone = value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
};

/**
 * Returns a "YYYY-MM-DD" string in IST for a given Date.
 * Used to compare message days without time.
 */
export const toISTDateKey = (date) => {
  return new Intl.DateTimeFormat('en-CA', {   // en-CA gives YYYY-MM-DD
    timeZone: IST_TZ,
    year:  'numeric',
    month: '2-digit',
    day:   '2-digit',
  }).format(parseMessageDate(date));
};

/**
 * Returns a human-friendly label for a date key (YYYY-MM-DD) in IST:
 *   "Today" | "Yesterday" | "Mon, 24 Mar"
 */
export const formatDateLabel = (dateKey) => {
  const todayKey     = toISTDateKey(new Date());
  const yesterdayKey = toISTDateKey(new Date(Date.now() - 86_400_000));

  if (dateKey === todayKey)     return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  // Parse the key back to a Date in IST and format nicely
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TZ,
    weekday: 'short',
    day:     'numeric',
    month:   'short',
  }).format(new Date(y, m - 1, d));
};

/**
 * DateSeparator — sticky floating pill, WhatsApp-style.
 *
 * Props:
 *   label  – string  e.g. "Today" | "Yesterday" | "Mon, 24 Mar"
 */
import { memo } from 'react';

const DateSeparatorComponent = ({ label }) => (
  <motion.div
    key={label}
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    className="sticky top-2 z-10 flex justify-center pointer-events-none my-2"
  >
    <span className="
      text-[11px] font-medium font-body
      bg-background/80 backdrop-blur-sm
      border border-border/60
      text-muted-foreground
      px-3 py-[3px] rounded-full
      shadow-sm
      select-none
    ">
      {label}
    </span>
  </motion.div>
);

export const DateSeparator = memo(DateSeparatorComponent);
