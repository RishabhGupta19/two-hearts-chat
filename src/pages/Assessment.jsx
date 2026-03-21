import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';

const questions = [
{
  key: 'upsetPreference',
  question: "When you're upset, you prefer to...",
  options: ['Talk it out', 'Have space', 'Write it down']
},
{
  key: 'loveLanguage',
  question: 'Your love language is...',
  options: ['Words of Affirmation', 'Physical Touch', 'Acts of Service', 'Gifts', 'Quality Time']
},
{
  key: 'conflictStyle',
  question: 'When conflict happens, you usually...',
  options: ['Shut down', 'Speak up immediately', 'Need time to process']
},
{
  key: 'communicationStrength',
  question: 'Your communication strength is...',
  options: ['Listening', 'Expressing feelings', 'Finding solutions', 'Staying calm']
},
{
  key: 'appreciationStyle',
  question: 'You feel most appreciated when...',
  options: ['Someone says kind words', 'Someone does something for you', 'Someone spends time with you']
},
{
  key: 'stressResponse',
  question: 'When stressed, you tend to...',
  options: ['Seek comfort from others', 'Need alone time', 'Get busy with tasks', 'Become emotional']
}];


const Assessment = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const { completeAssessment } = useApp();
  const navigate = useNavigate();

  const handleSelect = (value) => {
    const key = questions[currentStep].key;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeAssessment(answers);
      navigate('/dashboard');
    }
  };

  const progress = (currentStep + 1) / questions.length * 100;
  const currentQ = questions[currentStep];
  const selectedAnswer = answers[currentQ.key];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg">
        
        <div className="rounded-lg border bg-card p-8 shadow-soft">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-muted-foreground font-body mb-2">
              <span>Step {currentStep + 1} of {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 rounded-pill bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-pill bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }} />
              
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-2">
            <h1 className="font-heading text-xl font-semibold text-foreground mb-1">
              Help us understand you
            </h1>
            <p className="text-xs text-muted-foreground font-body">
              This stays private and helps your AI companion respond thoughtfully.
            </p>
          </div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="my-8">
              
              {/* Decorative blob */}
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">
                    {['💭', '💝', '⚡', '🗣️', '🌟', '🧘'][currentStep]}
                  </span>
                </div>
              </div>

              <h2 className="font-heading text-lg font-medium text-foreground text-center mb-6">
                {currentQ.question}
              </h2>

              <div className="space-y-3">
                {currentQ.options.map((option) =>
                <motion.button
                  key={option}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelect(option)}
                  className={`w-full rounded-[12px] border-2 px-4 py-3 text-sm font-body text-left transition-all ${
                  selectedAnswer === option ?
                  'border-primary bg-primary/10 text-foreground' :
                  'border-border text-muted-foreground hover:border-primary/40'}`
                  }>
                  
                    {option}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 &&
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setCurrentStep((s) => s - 1)}
              className="flex-1 rounded-pill bg-muted py-3 text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors">
              
                Back
              </motion.button>
            }
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              disabled={!selectedAnswer}
              className="flex-1 rounded-pill bg-primary py-3 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90 transition-colors disabled:opacity-40">
              
              {currentStep < questions.length - 1 ? 'Continue' : 'Save & Continue'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>);

};

export default Assessment;