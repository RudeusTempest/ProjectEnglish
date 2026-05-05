import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

const QuizScreen = ({ quizData, onFinish, onCancel }) => {
  const [answers, setAnswers] = useState({});

  const handleAnswer = (id, answer) => {
    setAnswers(prev => ({ ...prev, [id]: answer }));
  };

  const handleSubmit = () => {
    onFinish(answers);
  };

  const renderSectionA = () => {
    if (!quizData.sectionA.length) return null;
    return (
      <div className="card">
        <h2 className="section-title">חלק א': בחירה מרובה (אנגלית -&gt; עברית)</h2>
        {quizData.sectionA.map(q => (
          <div key={q.id} className="question-box">
            <div className="question-text">
              מה הפירוש של המילה <span className="english-text">{q.word}</span>?
            </div>
            <div className="options-grid">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  className={`option-btn ${answers[q.id] === opt ? 'selected' : ''}`}
                  onClick={() => handleAnswer(q.id, opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSectionB = () => {
    if (!quizData.sectionB.length) return null;
    return (
      <div className="card">
        <h2 className="section-title">חלק ב': השלם את החסר</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
          השלם את המילה החסרה באנגלית על סמך המשמעות: <strong>{quizData.sectionB[0]?.he}</strong> (לדוגמה)
        </p>
        {quizData.sectionB.map(q => {
          const parts = q.sentence.split('___');
          return (
            <div key={q.id} className="question-box">
              <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--primary)' }}>
                פירוש מבוקש: {q.he}
              </div>
              <div className="question-text ltr-input" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span className="english-text">{parts[0]}</span>
                <input
                  type="text"
                  className="text-input ltr-input"
                  style={{ width: '120px', padding: '0.5rem', display: 'inline-block' }}
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  placeholder="word"
                />
                <span className="english-text">{parts[1]}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSectionC = () => {
    if (!quizData.sectionC.length) return null;
    return (
      <div className="card">
        <h2 className="section-title">חלק ג': תרגום (עברית -&gt; אנגלית)</h2>
        {quizData.sectionC.map(q => (
          <div key={q.id} className="question-box">
            <div className="question-text">
              תרגם לאנגלית: <strong>{q.he}</strong>
            </div>
            <input
              type="text"
              className="text-input ltr-input"
              value={answers[q.id] || ''}
              onChange={(e) => handleAnswer(q.id, e.target.value)}
              placeholder="English word"
            />
          </div>
        ))}
      </div>
    );
  };

  const renderSectionD = () => {
    if (!quizData.sectionD.length) return null;
    return (
      <div className="card">
        <h2 className="section-title">חלק ד': זיהוי משפט</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
          בחר את המילה המתאימה ביותר להשלמת המשפט באנגלית.
        </p>
        {quizData.sectionD.map(q => {
          const parts = q.sentence.split('___');
          return (
            <div key={q.id} className="question-box">
              <div className="question-text ltr-input">
                <span className="english-text">{parts[0]}</span>
                <span style={{ borderBottom: '2px solid var(--primary)', display: 'inline-block', width: '50px', margin: '0 8px' }}></span>
                <span className="english-text">{parts[1]}</span>
              </div>
              <div className="options-grid ltr-input">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    className={`option-btn english-text ${answers[q.id] === opt ? 'selected' : ''}`}
                    style={{ textAlign: 'center' }}
                    onClick={() => handleAnswer(q.id, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <button className="btn btn-secondary" onClick={onCancel}>ערוך רשימת מילים</button>
      </div>

      {renderSectionA()}
      {renderSectionB()}
      {renderSectionC()}
      {renderSectionD()}

      <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '4rem' }}>
        <button className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.25rem' }} onClick={handleSubmit}>
          <CheckCircle size={24} />
          בדוק תשובות
        </button>
      </div>
    </div>
  );
};

export default QuizScreen;
