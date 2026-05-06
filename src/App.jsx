import { useState } from 'react';
import WordInput from './components/WordInput';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import AdminDashboard from './components/AdminDashboard';
import { generateQuiz } from './utils/quizGenerator';

function QuizApp() {
  const [screen, setScreen] = useState('INPUT'); // INPUT, QUIZ, RESULTS
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState(null);

  const handleGenerateQuiz = (text) => {
    const data = generateQuiz(text);
    if (!data) return false;
    
    setQuizData(data);
    setScreen('QUIZ');
    return true;
  };

  const handleFinishQuiz = (userAnswers) => {
    setAnswers(userAnswers);
    setScreen('RESULTS');
  };

  const handleRestart = () => {
    setAnswers(null);
    setScreen('QUIZ');
  };

  const handleEdit = () => {
    setScreen('INPUT');
  };

  return (
    <div className="app-container">
      {screen === 'INPUT' && (
        <WordInput onGenerate={handleGenerateQuiz} />
      )}
      
      {screen === 'QUIZ' && quizData && (
        <QuizScreen 
          quizData={quizData} 
          onFinish={handleFinishQuiz} 
          onCancel={handleEdit} 
        />
      )}

      {screen === 'RESULTS' && quizData && answers && (
        <ResultsScreen 
          quizData={quizData} 
          answers={answers} 
          onRestart={handleRestart} 
          onEdit={handleEdit} 
        />
      )}
    </div>
  );
}

function App() {
  return window.location.pathname === '/admin' ? <AdminDashboard /> : <QuizApp />;
}

export default App;
