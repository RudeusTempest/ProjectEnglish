import React, { useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

const WordInput = ({ onGenerate }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = () => {
    if (!text.trim()) {
      setError('אנא הזן לפחות מילה אחת');
      return;
    }
    const success = onGenerate(text);
    if (!success) {
      setError('לא הצלחנו לייצר בוחן. ודא שהזנת מילים באנגלית.');
    }
  };

  return (
    <div className="card">
      <div className="header">
        <h1>בוחן מילים חכם</h1>
        <p>הזן רשימת מילים באנגלית, ואנחנו נייצר עבורך בוחן מותאם אישית!</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <textarea
          className="input-area ltr-input"
          placeholder="be&#10;to&#10;of&#10;have&#10;it&#10;for"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
        />
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</p>}
      </div>

      <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleGenerate}>
        <Sparkles size={20} />
        צור בוחן עכשיו
      </button>

      <div style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
        <p>
          <BookOpen size={16} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '0.5rem' }} />
          תומך במעל 200 מילים נפוצות. מילים לא מוכרות ישולבו גם כן.
        </p>
      </div>
    </div>
  );
};

export default WordInput;
