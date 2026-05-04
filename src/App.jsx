import React, { useState, useCallback } from 'react';
import { useQuizHistory } from './hooks/useQuizHistory';
import UploadScreen  from './components/UploadScreen';
import EditScreen    from './components/EditScreen';
import QuizScreen    from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';

/**
 * State machine:
 *   upload → edit → quiz → results
 *      ↑       ↑      ↑       |
 *      └───────┴──────┴───────┘
 */
const S = { UPLOAD:'upload', EDIT:'edit', QUIZ:'quiz', RESULTS:'results' };

export default function App() {
  const [screen,   setScreen]   = useState(S.UPLOAD);
  const [ocrData,  setOcrData]  = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [answers,  setAnswers]  = useState({});
  const { history, stats, saveSession } = useQuizHistory();

  const handleOCRDone = useCallback(data => {
    setOcrData(data); setScreen(S.EDIT);
  }, []);

  const handleConfirm = useCallback(({ questions, answerKey }) => {
    setQuizData({ questions, answerKey, subject: ocrData?.subject || 'Quiz' });
    setAnswers({}); setScreen(S.QUIZ);
  }, [ocrData]);

  const handleFinish = useCallback(finalAnswers => {
    setAnswers(finalAnswers);
    if (quizData) {
      const correct = quizData.questions.filter(
        q => finalAnswers[q.num] === quizData.answerKey[q.num]
      ).length;
      const total = quizData.questions.length;
      const pct   = total > 0 ? Math.round((correct / total) * 100) : 0;
      saveSession({
        date: new Date().toISOString(), subject: quizData.subject,
        correct, total, pct,
        missedNums: quizData.questions
          .filter(q => finalAnswers[q.num] !== quizData.answerKey[q.num])
          .map(q => q.num),
      });
    }
    setScreen(S.RESULTS);
  }, [quizData, saveSession]);

  const handleRetake = useCallback(() => { setAnswers({}); setScreen(S.QUIZ); }, []);
  const handleHome   = useCallback(() => {
    setOcrData(null); setQuizData(null); setAnswers({}); setScreen(S.UPLOAD);
  }, []);

  return (
    <>
      {screen === S.UPLOAD  && <UploadScreen  onOCRDone={handleOCRDone} history={history} stats={stats} />}
      {screen === S.EDIT    && ocrData  && <EditScreen    data={ocrData} onConfirm={handleConfirm} onBack={() => setScreen(S.UPLOAD)} />}
      {screen === S.QUIZ    && quizData && <QuizScreen    questions={quizData.questions} answerKey={quizData.answerKey} subject={quizData.subject} onFinish={handleFinish} />}
      {screen === S.RESULTS && quizData && <ResultsScreen questions={quizData.questions} answers={answers} answerKey={quizData.answerKey} subject={quizData.subject} onRetake={handleRetake} onHome={handleHome} />}
    </>
  );
}
