import { useEffect, useState } from 'react';
import { api } from './client';
import { Download, Sparkles } from 'lucide-react';

type Entry = { id: string; text: string; mood: string; include: boolean; created: string };
type Period = 'weekly' | 'monthly';
type Result = { text: string; count: number; start: string; end: string; moods: Record<string, number>; shortened: boolean; generated: string };
export function journalDay(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const part = (type: string) => parts.find(p => p.type === type)?.value || '';
  return part('year') + '-' + part('month') + '-' + part('day');
}
function bounds(period: Period, anchor: string) {
  const d = new Date(anchor + 'T12:00:00Z');
  const start = new Date(d);
  const end = new Date(d);
  if (period === 'weekly') {
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    end.setTime(start.getTime()); end.setUTCDate(end.getUTCDate() + 6);
  } else {
    start.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
  }
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
export default function JournalSummary({ demo, entries, timezone }: { demo: boolean; entries: Entry[]; timezone: string }) {
  const [period, setPeriod] = useState<Period>('weekly');
  const [anchor, setAnchor] = useState(journalDay(new Date().toISOString(), timezone));
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [available, setAvailable] = useState<number | null>(null);
  useEffect(() => { setResult(null); setAvailable(null); setError(''); }, [entries, period, anchor]);
  const range = anchor ? bounds(period, anchor) : null;
  async function generate() {
    if (!anchor || !range) { setError('Select a date for your summary.'); return; }
    setBusy(true); setError(''); setResult(null); setAvailable(null);
    try {
      let all = entries;
      if (!demo) {
        all = [];
        let cursor: string | undefined;
        let pages = 0;
        do {
          const response = await api.get('/api/entries' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''));
          all = [...all, ...response.data.items];
          cursor = response.data.nextToken;
          pages += 1;
          setProgress('Checking saved journal pages: ' + pages);
          if (cursor && pages >= 200) throw new Error('This journal is larger than the current summary scan limit. No partial summary was generated.');
        } while (cursor);
      }
      const unique = [...new Map(all.map(e => [e.id, e])).values()];
      const selected = unique.filter(e => {
        const day = journalDay(e.created, timezone);
        return e.include && day >= range.start && day <= range.end;
      }).sort((a, b) => b.created.localeCompare(a.created));
      setAvailable(selected.length);
      if (!selected.length) { setError('No included journal entries in this period. Write an entry or choose another period.'); return; }
      const source = selected.slice(0, 250);
      if (demo) {
        const moods: Record<string, number> = {};
        source.forEach(e => { moods[e.mood] = (moods[e.mood] || 0) + 1; });
        setResult({
          text: 'Sample ' + (period === 'weekly' ? 'weekly' : 'monthly') + ' summary\n\nHighlights\nThis sample demonstrates how key moments from your journal would be brought together. Your personal summary will refer to your included entries and their dates.\n\nFeelings and patterns\nMood counts above describe the feelings selected for these entries. They are not a mental-health score.\n\nWhat needs attention\nA real summary will distinguish reported challenges from possibilities, and acknowledge limited information.\n\nYour next small step\nChoose one helpful habit to repeat and one manageable action for the coming days.',
          count: source.length, start: range.start, end: range.end, moods, shortened: false, generated: new Date().toISOString(),
        });
      } else {
        setProgress('Preparing your journal summary…');
        const response = await api.post('/api/journal-summary', { period, anchor, ids: source.map(e => e.id) });
        setResult(response.data);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      setError(message.includes('scan limit') ? message : 'Could not generate your summary. Your journal is unchanged. Press Generate summary to retry.');
    } finally { setBusy(false); setProgress(''); }
  }
  function download() {
    if (!result) return;
    const text = [
      'NextMe ' + period + ' journal summary' + (demo ? ' — SAMPLE' : ''),
      result.start + ' to ' + result.end + ' (' + timezone + ')',
      result.count + ' included entries used. Generated ' + new Date(result.generated).toLocaleString(),
      available !== null && available > result.count ? 'Partial summary: uses the most recent 250 entries in this period.' : '',
      result.shortened ? 'Long entry text was shortened for AI processing.' : '',
      '', result.text, '', 'AI reflection, not a diagnosis or professional therapy.',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'nextme-' + period + '-summary-' + result.start + '.txt'; a.click(); URL.revokeObjectURL(url);
  }
  return (
    <section className="card" style={{ marginTop: 20, marginBottom: 22 }}>
      <div className="section-top"><span className="eyebrow purple">YOUR JOURNAL, IN PERSPECTIVE</span><Sparkles size={18}/></div>
      <h2 style={{ marginTop: 16 }}>Your week. Your month. Your story.</h2>
      <p>Bring together the moments you have recorded, notice patterns, and choose a small next step.</p>
      <div className="mode-row wrap" style={{ alignItems: 'center', gap: 12 }}>
        <button className={period === 'weekly' ? 'chip selected' : 'chip'} aria-pressed={period === 'weekly'} disabled={busy} onClick={() => setPeriod('weekly')}>Weekly summary</button>
        <button className={period === 'monthly' ? 'chip selected' : 'chip'} aria-pressed={period === 'monthly'} disabled={busy} onClick={() => setPeriod('monthly')}>Monthly summary</button>
        <label className="field-label" style={{ margin: 0 }}>Date within the period
          <input aria-label="Summary reference date" type="date" value={anchor} disabled={busy} style={{ marginTop: 5 }} onChange={e => setAnchor(e.target.value)}/>
        </label>
        <button className="primary" disabled={busy} onClick={generate}>{busy ? 'Preparing…' : 'Generate summary'}<Sparkles size={15}/></button>
      </div>
      {range && <p>{range.start} – {range.end} · {timezone}{period === 'weekly' ? ' · Monday–Sunday' : ' · Calendar month'}</p>}
      <small className="muted">Only included entries are sent to AI when you generate a summary. Summaries are created on request; reminders do not automatically generate or send journal content.</small>
      {busy && <p role="status">{progress}</p>}
      {error && <p role="alert" className="error-text">{error}</p>}
      {result && (
        <div aria-live="polite">
          <div className="section-top" style={{ marginTop: 20 }}>
            <h3>{demo ? 'Sample ' : ''}{period === 'weekly' ? 'Weekly' : 'Monthly'} journal summary</h3>
            <span className="tag">{result.count} included {result.count === 1 ? 'entry' : 'entries'}</span>
          </div>
          <div className="mode-row wrap" style={{ marginTop: 10 }}>
            {Object.entries(result.moods).map(([mood, count]) => <span className="mood-tag" key={mood}>{mood}: {count}</span>)}
          </div>
          {available !== null && available > result.count && <p className="error-text">Partial coverage: {result.count} of {available} included entries. The most recent 250 entries were selected.</p>}
          {result.shortened && <small className="muted">Long entry text was shortened for this summary. Mood counts cover all entries used.</small>}
          <p className="reflection-text" style={{ marginTop: 20 }}>{result.text}</p>
          <small className="muted">Generated {new Date(result.generated).toLocaleString()}. Based on the journal at that moment. Edit or delete an entry, then regenerate to update the summary. AI guidance is not a diagnosis or professional therapy.</small>
          <button className="secondary" style={{ marginTop: 12 }} onClick={download}><Download size={15}/>Download summary</button>
        </div>
      )}
    </section>
  );
}
