import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import api from '@/api';

const Assessment = () => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { completeAssessment } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/assessment/generate-questions');
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        throw new Error('No questions received');
      }
    } catch (e) {
      console.error('Failed to fetch questions:', e);
      setError(e.response?.data?.error || e.message || 'Failed to load questions.');
    } finally {
      setLoading(false);
    }
  };

  const toggleOption = (questionId, option) => {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      const exists = current.includes(option);
      return {
        ...prev,
        [questionId]: exists ? current.filter((o) => o !== option) : [...current, option],
      };
    });
  };

  const currentQuestion = questions[currentIndex];
  const currentAnswers = answers[currentQuestion?.id] || [];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const canProceed = currentAnswers.length > 0;

  const handleNext = () => {
    if (isLastQuestion) {
      submitAssessment();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const submitAssessment = async () => {
    setSubmitting(true);
    setError('');
    try {
      const formattedAnswers = questions.map((q) => ({
        question: q.question,
        category: q.category,
        selected: answers[q.id] || [],
      }));

      const { data } = await api.post('/assessment/submit', { answers: formattedAnswers });
      if (data.assessment_profile) {
        completeAssessment(data.assessment_profile);
        navigate('/dashboard');
      }
    } catch (e) {
      console.error('Submit error:', e);
      setError(e.response?.data?.error || e.message || 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-body text-sm">Preparing your personalized assessment...</p>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4 px-6">
        <p className="text-destructive font-body text-sm text-center">{error}</p>
        <Button onClick={fetchQuestions} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <h1 className="font-heading text-lg font-semibold text-foreground text-center">Getting to Know You</h1>
        <p className="text-[10px] text-muted-foreground font-body text-center">
          Select all that apply — this helps your AI companion respond thoughtfully.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground font-body whitespace-nowrap">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="max-w-lg mx-auto"
            >
              <span className="text-xs font-medium text-primary/70 font-body uppercase tracking-wider">
                {currentQuestion.category?.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <h2 className="font-heading text-xl font-semibold text-foreground mt-1 mb-5 leading-snug">
                {currentQuestion.question}
              </h2>

              <div className="space-y-2.5">
                {currentQuestion.options?.map((option, idx) => {
                  const isSelected = currentAnswers.includes(option);
                  return (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleOption(currentQuestion.id, option)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-150 font-body text-sm flex items-center gap-3 ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                          : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-card/80'
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
                      </span>
                      <span>{option}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-border bg-card px-4 py-3">
        {error && <p className="text-xs text-destructive mb-2 text-center">{error}</p>}
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button variant="outline" onClick={handleBack} disabled={currentIndex === 0 || submitting} className="rounded-xl">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button onClick={handleNext} disabled={!canProceed || submitting} className="flex-1 rounded-xl">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing...
              </>
            ) : isLastQuestion ? (
              'Complete Assessment'
            ) : (
              <>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Assessment;
