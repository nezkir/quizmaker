import React, { useState, useCallback } from 'react';
import { useQuizHistory } from './hooks/useQuizHistory';
import UploadScreen  from './components/UploadScreen';
import EditScreen    from './components/EditScreen';
import QuizScreen    from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';

/**
 * App State Machine — 100% offline, no external dependencies.
 *
 *  upload  →  edit  →  quiz  →  results
 *    ↑          ↑        ↑         |
 *    └──────────┴────────┴─────────┘
 */
const SCREENS = { UPLOAD:'upload', EDIT:'edit', QUIZ:'quiz', RESULTS:'results' };

export default function App() {
  const [screen,   setScreen]   = useState(SCREENS.UPLOAD);
  const [ocrData,  setOcrData]  = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [answers,  setAnswers]  = useState({});

  const { history, stats, saveSession } = useQuizHistory();

  const handleOCRDone = useCallback((data) => {
    setOcrData(data);
    setScreen(SCREENS.EDIT);
  }, []);

  const handleConfirm = useCallback(({ questions, answerKey }) => {
    setQuizData({ questions, answerKey, subject: ocrData?.subject || 'Quiz' });
    setAnswers({});
    setScreen(SCREENS.QUIZ);
  }, [ocrData]);

  const handleFinish = useCallback((finalAnswers) => {
    setAnswers(finalAnswers);
    if (quizData) {
      const correct = quizData.questions.filter(
        q => finalAnswers[q.num] === quizData.answerKey[q.num]
      ).length;
      const total = quizData.questions.length;
      const pct   = total > 0 ? Math.round((correct / total) * 100) : 0;
      const missedNums = quizData.questions
        .filter(q => finalAnswers[q.num] !== quizData.answerKey[q.num])
        .map(q => q.num);
      saveSession({ date:new Date().toISOString(), subject:quizData.subject, correct, total, pct, missedNums });
    }
    setScreen(SCREENS.RESULTS);
  }, [quizData, saveSession]);

  const handleRetake = useCallback(() => { setAnswers({}); setScreen(SCREENS.QUIZ); }, []);

  const handleHome = useCallback(() => {
    setOcrData(null); setQuizData(null); setAnswers({});
    setScreen(SCREENS.UPLOAD);
  }, []);

  return (
    <>
      {screen === SCREENS.UPLOAD  && <UploadScreen  onOCRDone={handleOCRDone} history={history} stats={stats} />}
      {screen === SCREENS.EDIT    && ocrData  && <EditScreen    data={ocrData}  onConfirm={handleConfirm} onBack={() => setScreen(SCREENS.UPLOAD)} />}
      {screen === SCREENS.QUIZ    && quizData && <QuizScreen    questions={quizData.questions} answerKey={quizData.answerKey} subject={quizData.subject} onFinish={handleFinish} />}
      {screen === SCREENS.RESULTS && quizData && <ResultsScreen questions={quizData.questions} answers={answers} answerKey={quizData.answerKey} subject={quizData.subject} onRetake={handleRetake} onHome={handleHome} />}
    </>
  );
}
