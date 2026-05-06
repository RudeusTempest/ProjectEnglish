import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, RefreshCw, Search, Trash2, X } from 'lucide-react';

const RESULTS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzOw-jGRRjhQnO8o9v2fGTUl_JAL5CP8ZTTX9n2LLleeK_vJyADq7SUzGZNQnNO_KZmLw/exec";

const scoreFilters = [
  { value: 'all', label: 'כל הציונים' },
  { value: 'low', label: 'מתחת ל-50' },
  { value: 'mid', label: '50-80' },
  { value: 'high', label: '80+' }
];

const bulkScoreFilters = [
  { value: 'all', label: 'כל הציונים' },
  { value: 'low', label: 'מתחת ל-50' },
  { value: 'mid', label: '50-80' },
  { value: 'high', label: '80+' }
];

const parseNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return 'לא ידוע';

  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
};

const formatDateInputValue = (value) => {
  const date = parseDate(value);
  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeWords = (words) => {
  if (Array.isArray(words)) return words;
  if (typeof words === 'string') {
    return words
      .split(',')
      .map(word => word.trim())
      .filter(Boolean);
  }
  return [];
};

const getFirstValue = (row, keys, fallback = '') => {
  const normalizedEntries = Object.entries(row).reduce((entries, [key, value]) => {
    entries[key] = value;
    entries[key.trim()] = value;
    entries[key.trim().toLowerCase()] = value;
    return entries;
  }, {});

  for (const key of keys) {
    const normalizedKey = key.trim().toLowerCase();
    const value = normalizedEntries[key] ?? normalizedEntries[key.trim()] ?? normalizedEntries[normalizedKey];

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return fallback;
};

const normalizeMistakes = (row) => {
  const raw = getFirstValue(row, ['mistakes', 'wrongAnswersText', 'Wrong Answers', 'שגיאות', 'Mistakes'], '');
  if (typeof raw === 'string') return raw.trim();
  if (!Array.isArray(raw)) return '';

  return raw
    .map((item, index) => {
      const question = item.question || item.word || 'שאלה לא ידועה';
      const userAnswer = item.userAnswer || item.answer || '(לא נענה)';
      const correctAnswer = item.correctAnswer || item.correct || '';
      return `${index + 1}. ${item.section || ''}\nשאלה: ${question}\nתשובת תלמיד: ${userAnswer}\nתשובה נכונה: ${correctAnswer}`;
    })
    .join('\n\n');
};

const normalizeRow = (row, index) => {
  const total = parseNumber(getFirstValue(row, ['total', 'Total', 'סהכ'], 0));
  const correct = parseNumber(getFirstValue(row, ['correct', 'Correct', 'נכונות'], 0));
  const almostCorrect = parseNumber(getFirstValue(row, ['almostCorrect', 'Almost Correct', 'שגיאות כתיב'], 0));
  const receivedScore = parseNumber(getFirstValue(row, ['score', 'Score', 'ציון'], 0));
  const calculatedScore = total ? Math.round(((correct + almostCorrect) / total) * 100) : 0;

  const normalized = {
    id: getFirstValue(row, ['id', 'ID'], `result-${index}`),
    rowNumber: parseNumber(getFirstValue(row, ['rowNumber', 'Row Number', 'row'], 0)),
    timestamp: getFirstValue(row, ['timestamp', 'TimeStamp', 'Timestamp', 'תאריך'], ''),
    name: getFirstValue(row, ['name', 'Name', 'שם'], 'אנונימי'),
    score: receivedScore || calculatedScore,
    total,
    correct,
    almostCorrect,
    wrong: parseNumber(getFirstValue(row, ['wrong', 'Wrong', 'שגיאות'], 0)),
    words: normalizeWords(getFirstValue(row, ['words', 'Words', 'מילים'], [])),
    mistakes: normalizeMistakes(row)
  };

  normalized.sortTime = parseDate(normalized.timestamp)?.getTime() || 0;
  return normalized;
};

const normalizeResults = (payload) => {
  const rows = Array.isArray(payload)
    ? payload
    : payload?.results || payload?.data || payload?.rows || [];

  return rows
    .map(normalizeRow)
    .sort((a, b) => b.sortTime - a.sortTime);
};

const fetchJsonp = (url) => new Promise((resolve, reject) => {
  const callbackName = `adminResultsCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const script = document.createElement('script');
  const separator = url.includes('?') ? '&' : '?';
  const timeoutId = window.setTimeout(() => {
    cleanup();
    reject(new Error('טעינת הנתונים נכשלה'));
  }, 12000);

  const cleanup = () => {
    window.clearTimeout(timeoutId);
    delete window[callbackName];
    script.remove();
  };

  window[callbackName] = (payload) => {
    cleanup();
    resolve(payload);
  };

  script.src = `${url}${separator}callback=${callbackName}&cacheBust=${Date.now()}`;
  script.onerror = () => {
    cleanup();
    reject(new Error('לא ניתן להתחבר למקור הנתונים'));
  };

  document.body.appendChild(script);
});

const loadResults = async () => {
  return normalizeResults(await fetchJsonp(RESULTS_ENDPOINT));
};

const getScoreClass = (score) => {
  if (score >= 80) return 'score-high';
  if (score >= 50) return 'score-mid';
  return 'score-low';
};

const matchesScoreFilter = (score, filter) => {
  return (
    filter === 'all' ||
    (filter === 'low' && score < 50) ||
    (filter === 'mid' && score >= 50 && score < 80) ||
    (filter === 'high' && score >= 80)
  );
};

const matchesBulkDelete = (result, criteria) => {
  const userMatches = result.name.trim().toLowerCase() === criteria.name.trim().toLowerCase();
  const scoreMatches = matchesScoreFilter(result.score, criteria.scoreFilter);
  const resultDate = formatDateInputValue(result.timestamp);
  const fromMatches = !criteria.dateFrom || (resultDate && resultDate >= criteria.dateFrom);
  const toMatches = !criteria.dateTo || (resultDate && resultDate <= criteria.dateTo);

  return userMatches && scoreMatches && fromMatches && toMatches;
};

const SummaryCard = ({ label, value, hint }) => (
  <div className="admin-summary-card">
    <div className="admin-summary-label">{label}</div>
    <div className="admin-summary-value">{value}</div>
    {hint && <div className="admin-summary-hint">{hint}</div>}
  </div>
);

const ScoreChart = ({ results }) => {
  const chartResults = results.slice().reverse().slice(-12);
  const points = chartResults.map((result, index) => {
    const x = chartResults.length === 1 ? 50 : (index / (chartResults.length - 1)) * 100;
    const y = 100 - Math.max(0, Math.min(result.score, 100));
    return `${x},${y}`;
  });

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2>ציונים לאורך זמן</h2>
        <BarChart3 size={18} />
      </div>
      <div className="admin-chart">
        {chartResults.length > 0 ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="ציונים לאורך זמן">
            <polyline points={points.join(' ')} />
            {chartResults.map((result, index) => {
              const x = chartResults.length === 1 ? 50 : (index / (chartResults.length - 1)) * 100;
              const y = 100 - Math.max(0, Math.min(result.score, 100));
              return <circle key={`${result.id}-${index}`} cx={x} cy={y} r="1.8" />;
            })}
          </svg>
        ) : (
          <div className="admin-empty-chart">אין נתונים להצגה</div>
        )}
      </div>
    </div>
  );
};

const TopMistakes = ({ results }) => {
  const mistakes = useMemo(() => {
    const counts = new Map();
    results.forEach(result => {
      result.words.forEach(word => {
        if (result.mistakes.includes(word)) {
          counts.set(word, (counts.get(word) || 0) + 1);
        }
      });
    });

    return Array.from(counts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [results]);

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2>טעויות נפוצות</h2>
        <AlertTriangle size={18} />
      </div>
      {mistakes.length > 0 ? (
        <div className="top-mistakes-list">
          {mistakes.map(item => (
            <div className="top-mistake-row" key={item.word}>
              <span className="english-text">{item.word}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">אין טעויות מזוהות עדיין</div>
      )}
    </div>
  );
};

const ResultDetails = ({ result, onClose }) => {
  if (!result) return null;

  return (
    <div className="admin-details-backdrop" onClick={onClose}>
      <div className="admin-details-panel" onClick={(event) => event.stopPropagation()}>
        <button className="admin-icon-button" onClick={onClose} aria-label="סגור">
          <X size={18} />
        </button>
        <div className="admin-details-header">
          <div>
            <h2>{result.name}</h2>
            <p>{formatDate(result.timestamp)}</p>
          </div>
          <span className={`score-badge ${getScoreClass(result.score)}`}>{result.score}%</span>
        </div>

        <div className="admin-details-grid">
          <div>
            <span>נכונות</span>
            <strong>{result.correct}</strong>
          </div>
          <div>
            <span>שגיאות</span>
            <strong>{result.wrong}</strong>
          </div>
          <div>
            <span>שגיאות כתיב</span>
            <strong>{result.almostCorrect}</strong>
          </div>
          <div>
            <span>סה"כ</span>
            <strong>{result.total}</strong>
          </div>
        </div>

        <section className="admin-details-section">
          <h3>רשימת מילים</h3>
          <div className="word-chip-list">
            {result.words.length > 0
              ? result.words.map(word => <span className="word-chip english-text" key={word}>{word}</span>)
              : <span className="admin-muted">אין מילים להצגה</span>}
          </div>
        </section>

        <section className="admin-details-section">
          <h3>פירוט טעויות</h3>
          {result.mistakes ? (
            <pre className="mistakes-box">{result.mistakes}</pre>
          ) : (
            <div className="admin-empty-state">לא נרשמו טעויות</div>
          )}
        </section>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [results, setResults] = useState([]);
  const [search, setSearch] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [selectedResult, setSelectedResult] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [deletingId, setDeletingId] = useState('');
  const [bulkDelete, setBulkDelete] = useState({
    name: '',
    dateFrom: '',
    dateTo: '',
    scoreFilter: 'all'
  });

  const fetchResults = async () => {
    setStatus({ loading: true, error: '' });
    try {
      setResults(await loadResults());
      setStatus({ loading: false, error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || 'לא ניתן לטעון נתונים'
      });
    }
  };

  const handleDeleteResult = async (event, result) => {
    event.stopPropagation();

    if (!result.rowNumber) {
      setStatus({ loading: false, error: 'לא ניתן למחוק תוצאה ללא מספר שורה מהגיליון' });
      return;
    }

    const confirmed = window.confirm(`למחוק את התוצאה של ${result.name}?`);
    if (!confirmed) return;

    setDeletingId(result.id);
    try {
      await fetch(RESULTS_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete',
          rowNumber: result.rowNumber
        })
      });

      setResults(currentResults => currentResults.filter(item => item.id !== result.id));
      if (selectedResult?.id === result.id) {
        setSelectedResult(null);
      }
      setStatus({ loading: false, error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || 'המחיקה נכשלה'
      });
    } finally {
      setDeletingId('');
    }
  };

  const handleBulkDeleteChange = (key, value) => {
    setBulkDelete(current => ({
      ...current,
      [key]: value
    }));
  };

  useEffect(() => {
    let isActive = true;

    loadResults()
      .then(data => {
        if (!isActive) return;
        setResults(data);
        setStatus({ loading: false, error: '' });
      })
      .catch(error => {
        if (!isActive) return;
        setStatus({
          loading: false,
          error: error.message || 'לא ניתן לטעון נתונים'
        });
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredResults = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return results.filter(result => {
      const matchesSearch = !cleanSearch || result.name.toLowerCase().includes(cleanSearch);
      const matchesScore = matchesScoreFilter(result.score, scoreFilter);

      return matchesSearch && matchesScore;
    });
  }, [results, search, scoreFilter]);

  const participantOptions = useMemo(() => {
    return Array.from(new Set(results.map(result => result.name).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'he'));
  }, [results]);

  const bulkDeleteMatches = useMemo(() => {
    if (!bulkDelete.name.trim()) return [];
    return results.filter(result => matchesBulkDelete(result, bulkDelete));
  }, [results, bulkDelete]);

  const handleBulkDelete = async () => {
    if (!bulkDelete.name.trim()) {
      setStatus({ loading: false, error: 'בחר שם משתמש למחיקה' });
      return;
    }

    if (bulkDeleteMatches.length === 0) {
      setStatus({ loading: false, error: 'לא נמצאו תוצאות שמתאימות למחיקה' });
      return;
    }

    const confirmed = window.confirm(`למחוק ${bulkDeleteMatches.length} תוצאות של ${bulkDelete.name}?`);
    if (!confirmed) return;

    setDeletingId('bulk-delete');
    try {
      await fetch(RESULTS_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'bulkDelete',
          criteria: bulkDelete
        })
      });

      const deletedIds = new Set(bulkDeleteMatches.map(result => result.id));
      setResults(currentResults => currentResults.filter(result => !deletedIds.has(result.id)));
      if (selectedResult && deletedIds.has(selectedResult.id)) {
        setSelectedResult(null);
      }
      setStatus({ loading: false, error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || 'מחיקת ההיסטוריה נכשלה'
      });
    } finally {
      setDeletingId('');
    }
  };

  const summary = useMemo(() => {
    const participantNames = new Set(
      results
        .map(result => result.name.trim().toLowerCase())
        .filter(Boolean)
    );
    const participantCount = participantNames.size;
    const average = results.length ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length) : 0;
    const totalQuestions = results.reduce((sum, result) => sum + result.total, 0);
    const totalCorrect = results.reduce((sum, result) => sum + result.correct + result.almostCorrect, 0);
    const successRate = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return { participantCount, average, successRate };
  }, [results]);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p>לוח ניהול</p>
          <h1>תוצאות בוחן אוצר מילים</h1>
        </div>
        <button className="btn btn-secondary" onClick={fetchResults} disabled={status.loading}>
          <RefreshCw size={18} className={status.loading ? 'spin' : ''} />
          רענן נתונים
        </button>
      </header>

      {status.error && (
        <div className="admin-error">
          <AlertTriangle size={18} />
          {status.error}
        </div>
      )}

      <section className="admin-summary-grid">
        <SummaryCard label="ממוצע ציונים" value={`${summary.average}%`} />
        <SummaryCard label="מספר משתתפים" value={summary.participantCount} />
        <SummaryCard label="אחוז הצלחה כללי" value={`${summary.successRate}%`} hint="כולל שגיאות כתיב קלות" />
      </section>

      <section className="admin-insights-grid">
        <ScoreChart results={results} />
        <TopMistakes results={results} />
      </section>

      <section className="admin-bulk-delete">
        <div>
          <h2>מחיקת היסטוריה לפי משתמש</h2>
          <p>בחר משתמש, ואפשר לצמצם את המחיקה לפי תאריך וציון.</p>
        </div>

        <div className="admin-bulk-delete-grid">
          <label>
            שם משתמש
            <select
              value={bulkDelete.name}
              onChange={(event) => handleBulkDeleteChange('name', event.target.value)}
            >
              <option value="">בחר משתמש</option>
              {participantOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          <label>
            מתאריך
            <input
              type="date"
              value={bulkDelete.dateFrom}
              onChange={(event) => handleBulkDeleteChange('dateFrom', event.target.value)}
            />
          </label>

          <label>
            עד תאריך
            <input
              type="date"
              value={bulkDelete.dateTo}
              onChange={(event) => handleBulkDeleteChange('dateTo', event.target.value)}
            />
          </label>

          <label>
            ציון
            <select
              value={bulkDelete.scoreFilter}
              onChange={(event) => handleBulkDeleteChange('scoreFilter', event.target.value)}
            >
              {bulkScoreFilters.map(filter => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-bulk-delete-footer">
          <span>{bulkDelete.name ? `${bulkDeleteMatches.length} תוצאות מתאימות` : 'בחר משתמש כדי לראות כמה תוצאות יימחקו'}</span>
          <button
            className="admin-delete-button"
            onClick={handleBulkDelete}
            disabled={!bulkDelete.name || bulkDeleteMatches.length === 0 || deletingId === 'bulk-delete'}
            type="button"
          >
            <Trash2 size={16} />
            מחק היסטוריה
          </button>
        </div>
      </section>

      <section className="admin-table-section">
        <div className="admin-table-toolbar">
          <label className="admin-search">
            <Search size={18} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="חיפוש לפי שם"
            />
          </label>

          <div className="score-filter-group" aria-label="סינון לפי ציון">
            {scoreFilters.map(filter => (
              <button
                key={filter.value}
                className={scoreFilter === filter.value ? 'active' : ''}
                onClick={() => setScoreFilter(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-results-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>ציון</th>
                <th>נכונות</th>
                <th>שגיאות</th>
                <th>שגיאות כתיב</th>
                <th>תאריך</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map(result => (
                <tr key={result.id} onClick={() => setSelectedResult(result)}>
                  <td>{result.name}</td>
                  <td><span className={`score-badge ${getScoreClass(result.score)}`}>{result.score}%</span></td>
                  <td>{result.correct}</td>
                  <td>{result.wrong}</td>
                  <td>{result.almostCorrect}</td>
                  <td>{formatDate(result.timestamp)}</td>
                  <td>
                    <button
                      className="admin-delete-button"
                      onClick={(event) => handleDeleteResult(event, result)}
                      disabled={deletingId === result.id}
                      type="button"
                      aria-label="מחק תוצאה"
                    >
                      <Trash2 size={16} />
                      מחק
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!status.loading && filteredResults.length === 0 && (
            <div className="admin-empty-state">לא נמצאו תוצאות מתאימות</div>
          )}

          {status.loading && (
            <div className="admin-empty-state">טוען נתונים...</div>
          )}
        </div>
      </section>

      <ResultDetails result={selectedResult} onClose={() => setSelectedResult(null)} />
    </main>
  );
};

export default AdminDashboard;
