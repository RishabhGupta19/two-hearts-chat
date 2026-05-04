import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ChevronDown } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import api from '@/api';
import MemoryModal from './MemoryModal';
import MemoryView from './MemoryView';
import { toast } from 'sonner';

const RelationshipCalendar = () => {
  const { coupleId, isLinked, user } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4)); // May 2026
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [relationshipStartDate, setRelationshipStartDate] = useState(null);
  const [showStartDateModal, setShowStartDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showMemoryView, setShowMemoryView] = useState(false);
  const [startDateInput, setStartDateInput] = useState('');
  const [memories, setMemories] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [photoBlobs, setPhotoBlobs] = useState({});

  // Fetch relationship start date on mount
  useEffect(() => {
    if (!isLinked) return;
    fetchRelationshipStartDate();
  }, [isLinked]);

  // Fetch memories when month changes
  useEffect(() => {
    if (relationshipStartDate) {
      fetchMemories();
    }
  }, [currentDate, relationshipStartDate]);

  const fetchRelationshipStartDate = async () => {
    try {
      const response = await api.get('/couple/relationship-start-date');
      if (response.data.start_date) {
        setRelationshipStartDate(new Date(response.data.start_date));
      } else if (user?.couple_id) {
        setShowStartDateModal(true);
      }
    } catch (error) {
      console.error('Error fetching start date:', error);
    }
  };

  const fetchMemories = async () => {
    if (!relationshipStartDate) return;
    setLoadingMemories(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await api.get(`/couple/calendar/memories?year=${year}&month=${month}`);
      const memoriesMap = {};
      response.data.memories.forEach(m => {
        memoriesMap[m.date] = m;
      });
      setMemories(memoriesMap);
    } catch (error) {
      console.error('Error fetching memories:', error);
    } finally {
      setLoadingMemories(false);
    }
  };

  const handleSetStartDate = async () => {
    if (!startDateInput) {
      toast.error('Please select a date');
      return;
    }
    try {
      const date = new Date(startDateInput);
      await api.post('/couple/relationship-start-date', {
        start_date: date.toISOString(),
      });
      setRelationshipStartDate(date);
      setShowStartDateModal(false);
      setStartDateInput('');
      toast.success('Relationship start date set!');
    } catch (error) {
      toast.error('Failed to set relationship start date');
      console.error(error);
    }
  };

  const calculateDaysTogether = () => {
    if (!relationshipStartDate) return null;
    const now = new Date();
    const diff = now - relationshipStartDate;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthName = (date) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()];
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  const handleDateClick = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const date = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;
    setSelectedDate(dateStr);

    // Check if memory exists for this date
    const memory = memories[dateStr];
    if (memory) {
      // Load photo blobs for this memory
      memory.photo_ids.forEach((photoId) => {
        if (!photoBlobs[photoId]) {
          loadPhotoBlob(photoId);
        }
      });
      setShowMemoryView(true);
    } else {
      setShowMemoryModal(true);
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

  if (!isLinked) {
    return null;
  }

  if (!relationshipStartDate && !showStartDateModal) {
    return null;
  }

  const daysTogether = calculateDaysTogether();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = getMonthName(currentDate);

  const emptyDays = Array(firstDay).fill(null);
  const calendarDays = [...emptyDays, ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  // Predefined emojis for relationship moments
  const relationshipEmojis = [
    '❤️', '💕', '💖', '💝', '✨', '🎉', '🌹', '😊',
    '👫', '🌟', '😍', '🎊', '🏖️', '🍕', '🎬', '🎵'
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    >
      {showStartDateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background rounded-2xl p-6 shadow-xl max-w-sm w-full border border-border"
          >
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              When did your love story begin?
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Set your relationship start date to track your beautiful journey together.
            </p>
            <input
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg mb-4 bg-background text-foreground"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowStartDateModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-accent/10 transition-colors"
              >
                Later
              </button>
              <button
                onClick={handleSetStartDate}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Set Date
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Calendar Card */}
      <motion.div
        className="bg-[#fff8f2] dark:bg-orange-950/20 rounded-2xl border border-orange-200/50 dark:border-orange-900/30 overflow-hidden"
      >
        {/* Collapsible Header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between p-6 hover:bg-orange-100/30 dark:hover:bg-orange-900/10 transition-colors"
        >
          <span className="font-semibold text-foreground">
            {monthName} {currentDate.getFullYear()}
          </span>
          <div className="flex items-center gap-3">
            <span className="bg-[#fdeee4] text-[#c09070] text-sm font-medium px-[18px] py-2 rounded-full inline-block">
              {daysTogether !== null ? `${daysTogether} days together` : 'Loading...'}
            </span>
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </motion.div>
          </div>
        </button>

        {/* Calendar Content */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-orange-200/50 dark:border-orange-900/30"
            >
              <div className="p-6 pt-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-3">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className={`grid grid-cols-7 gap-1 ${loadingMemories ? 'opacity-50' : ''}`}>
                  {calendarDays.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="p-3" />;
                    }

                    const year = currentDate.getFullYear();
                    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                    const date = String(day).padStart(2, '0');
                    const dateStr = `${year}-${month}-${date}`;
                    const memory = memories[dateStr];
                    const todayFlag = isToday(day);

                    return (
                      <motion.button
                        key={day}
                        onClick={() => handleDateClick(day)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all cursor-pointer ${
                          todayFlag
                            ? 'bg-orange-100 dark:bg-orange-900/30'
                            : 'hover:bg-orange-50 dark:hover:bg-orange-900/20 text-foreground'
                        }`}
                      >
                        <span>{day}</span>
                        
                        {/* Today indicator - filled circle */}
                        {todayFlag && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute bottom-1 h-2 w-2 rounded-full bg-red-500"
                          />
                        )}

                        {/* Memory dot indicator */}
                        {memory && !todayFlag && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-orange-400"
                          />
                        )}

                        {/* Memory dot on today */}
                        {memory && todayFlag && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-orange-600"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-4 pt-4 border-t border-orange-200/50 dark:border-orange-900/30 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Today</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                    <span>Memory</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Memory View Modal (Read-only) */}
      <AnimatePresence>
        {showMemoryView && selectedDate && (
          <MemoryView
            date={selectedDate}
            memory={memories[selectedDate]}
            onClose={() => setShowMemoryView(false)}
            onEdit={() => {
              setShowMemoryView(false);
              setShowMemoryModal(true);
            }}
            photoBlobs={photoBlobs}
          />
        )}
      </AnimatePresence>

      {/* Memory Modal (Add/Edit) */}
      <AnimatePresence>
        {showMemoryModal && selectedDate && (
          <MemoryModal
            date={selectedDate}
            memory={memories[selectedDate]}
            onClose={() => setShowMemoryModal(false)}
            onSave={() => {
              setShowMemoryModal(false);
              fetchMemories();
              setPhotoBlobs({});
            }}
            emojis={relationshipEmojis}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RelationshipCalendar;
