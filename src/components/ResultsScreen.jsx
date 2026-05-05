import React, { useMemo, useState } from 'react';
import { RefreshCw, Edit, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react';
import { checkAnswer } from '../utils/scoring';

const ADMIN_ENDPOINT = "https://script.google.com/macros/s/AKfycbzOw-jGRRjhQnO8o9v2fGTUl_JAL5CP8ZTTX9n2LLleeK_vJyADq7SUzGZNQnNO_KZmLw/exec";

const ResultsScreen = ({ quizData, answers, onRestart, onEdit }) => {
  const [isSent, setIsSent] = useState(false);

  const results = useMemo(() => {
    const allQuestions = [];

    // Process A
    quizData.sectionA.forEach(q => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correctAnswer ? 'CORRECT' : 'WRONG';
      allQuestions.push({ ...q, userAnswer, status: isCorrect, sectionTitle: 'חלק א' });
    });

    // Process B
    quizData.sectionB.forEach(q => {
      const userAnswer = answers[q.id];
      const status = checkAnswer(userAnswer, q.word);
      allQuestions.push({ ...q, userAnswer, status, correctAnswer: q.word, sectionTitle: 'חלק ב' });
    });

    // Process C
    quizData.sectionC.forEach(q => {
      const userAnswer = answers[q.id];
      const status = checkAnswer(userAnswer, q.correctAnswer);
      allQuestions.push({ ...q, userAnswer, status, sectionTitle: 'חלק ג' });
    });

    // Process D
    quizData.sectionD.forEach(q => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correctAnswer ? 'CORRECT' : 'WRONG';
      allQuestions.push({ ...q, userAnswer, status: isCorrect, sectionTitle: 'חלק ד' });
    });

    const correct = allQuestions.filter(q => q.status === 'CORRECT').length;
    const almost = allQuestions.filter(q => q.status === 'ALMOST').length;
    const wrong = allQuestions.filter(q => q.status === 'WRONG').length;

    // Almost counts as half point or just correct in visual score? Let's say almost is correct but noted.
    // For simplicity, score = (correct + almost) / total
    const score = Math.round(((correct + almost) / allQuestions.length) * 100) || 0;

    return { allQuestions, correct, almost, wrong, score };
  }, [quizData, answers]);

  const handleSendResults = async () => {
    const name = window.prompt("הזן את שמך לשליחה:", "אנונימי");
    if (!name) return;

    setIsSent(true);

    const resultData = {
      name,
      score: results.score,
      total: results.allQuestions.length,
      correct: results.correct,
      almostCorrect: results.almost,
      wrong: results.wrong,
      words: results.allQuestions.map(q => q.word || q.correctAnswer),
      timestamp: new Date().toISOString()
    };

    resultData.wrongAnswers = results.allQuestions
      .filter(q => q.status === 'WRONG')
      .map(q => ({
        section: q.sectionTitle,
        question: q.type === 'MULTIPLE_CHOICE' || q.type === 'TRANSLATE' ? q.word || q.he : 'השלמת משפט',
        userAnswer: q.userAnswer || '(לא נענה)',
        correctAnswer: q.correctAnswer
      }));

    resultData.wrongAnswersText = resultData.wrongAnswers
      .map(item => `${item.section}: ${item.question} | answered: ${item.userAnswer} | correct: ${item.correctAnswer}`)
      .join('\n');

    try {
      await fetch(ADMIN_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(resultData)
      });
    } catch (error) {
      console.error("Failed to send results:", error);
    }
  };

  return (
    <div className="card">
      <div className="header">
        <h1>תוצאות הבוחן</h1>
      </div>

      <div className="score-circle" style={{ '--percentage': `${results.score}%` }}>
        <div className="score-text">{results.score}%</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '2rem', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '2rem', color: 'var(--success)' }}>{results.correct}</div>
          <div style={{ color: 'var(--text-muted)' }}>נכונות</div>
        </div>
        <div>
          <div style={{ fontSize: '2rem', color: 'var(--warning)' }}>{results.almost}</div>
          <div style={{ color: 'var(--text-muted)' }}>שגיאות כתיב קלות</div>
        </div>
        <div>
          <div style={{ fontSize: '2rem', color: 'var(--danger)' }}>{results.wrong}</div>
          <div style={{ color: 'var(--text-muted)' }}>שגויות</div>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>פירוט תשובות:</h3>
        {results.allQuestions.map(q => {
          let itemClass = 'result-wrong';
          let Icon = XCircle;
          if (q.status === 'CORRECT') {
            itemClass = 'result-correct';
            Icon = CheckCircle;
          } else if (q.status === 'ALMOST') {
            itemClass = 'result-almost';
            Icon = AlertCircle;
          }

          return (
            <div key={q.id} className={`result-item ${itemClass}`}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.2rem' }}>{q.sectionTitle}</div>
                <div style={{ fontWeight: 600 }}>
                  שאלה: {q.type === 'MULTIPLE_CHOICE' || q.type === 'TRANSLATE' ? q.word || q.he : 'השלמת משפט'}
                </div>
                <div style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>
                  תשובה שלך: <span className="english-text" style={{ fontWeight: 'bold' }}>{q.userAnswer || '(לא נענה)'}</span>
                </div>
                {q.status !== 'CORRECT' && (
                  <div style={{ fontSize: '0.9rem', marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                    תשובה נכונה: <span className="english-text" style={{ fontWeight: 'bold' }}>{q.correctAnswer}</span>
                  </div>
                )}
                {q.status === 'ALMOST' && (
                  <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    * התשובה נספרה כנכונה, אך יש שגיאת כתיב קלה.
                  </div>
                )}
              </div>
              <div style={{ marginLeft: '1rem' }}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={onRestart}>
          <RefreshCw size={20} />
          נסה שוב
        </button>
        <button className="btn btn-primary" onClick={onEdit}>
          <Edit size={20} />
          ערוך רשימת מילים
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleSendResults}
          disabled={isSent}
          style={{
            borderColor: isSent ? 'var(--success)' : '',
            color: isSent ? 'var(--success)' : '',
            opacity: isSent ? 0.8 : 1
          }}
        >
          <Send size={20} />
          {isSent ? 'נשלח ✓' : 'שלח תוצאות למורה'}
        </button>
      </div>
    </div>
  );
};

export default ResultsScreen;
