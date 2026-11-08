import { useEffect, useState } from 'react';
import { api, notifications } from './client';
import { Award, Bell, BookOpen, CheckCircle2, Circle, Feather, Trophy } from 'lucide-react';
import { journalDay } from './JournalSummary';

type Entry = { id: string; text: string; mood: string; include: boolean; created: string };
type Progress = { dailyReminder: boolean; lastReviewed: string | null };
type Props = { demo: boolean; entries: Entry[]; timezone: string; refresh: number; sampleReviewed: boolean; completeHistory: boolean; onWrite: () => void; onHistory: () => void };
export default function JournalTasks(p: Props) {
  const [progress, setProgress] = useState<Progress>({ dailyReminder: false, lastReviewed: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    setError('');
    if (p.demo) {
      setProgress({ dailyReminder: false, lastReviewed: null });
      setLoaded(true);
      return;
    }
    api.get('/api/journal-tasks').then(r => {
      if (active) { setProgress(r.data); setLoaded(true); }
    }).catch(() => { if (active) setError('Could not load task settings. Reopen Today to retry.'); });
    return () => { active = false; };
  }, [p.demo, p.refresh]);
  const today = journalDay(new Date().toISOString(), p.timezone);
  const start = new Date(today + 'T12:00:00Z');
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  const monday = start.toISOString().slice(0, 10);
  const recordedDays = new Set(p.entries.map(e => journalDay(e.created, p.timezone)));
  const weeklyDays = [...recordedDays].filter(d => d >= monday && d <= today).length;
  const written = recordedDays.has(today);
  const reviewed = p.demo ? p.sampleReviewed : progress.lastReviewed === today;
  const completed = Number(written) + Number(reviewed) + Number(weeklyDays >= 3);
  async function toggleReminder() {
    if (p.demo) { setStatus('Sign in to enable your personal daily journal reminder. No notification is sent in the sample tour.'); return; }
    setBusy(true); setError(''); setStatus('');
    try {
      const enabled = !progress.dailyReminder;
      if (enabled) await notifications.subscribe();
      const result = await api.put('/api/journal-tasks/reminder', { enabled });
      setProgress(prev => ({ ...prev, dailyReminder: result.data.dailyReminder }));
      setStatus(enabled ? 'Daily reminder enabled for 18:00 UTC (6 PM Freetown). Delivery depends on browser permission and a registered device.' : 'Daily journal reminders turned off. Weekly and monthly reminders keep their separate settings.');
    } catch { setError('Could not change daily reminders. Check browser notification permissions and try again.'); }
    finally { setBusy(false); }
  }
  const tasks = [
    { title: 'Write today’s page', detail: written ? 'You made space for your day.' : 'A sentence or two is a great start.', done: written, Icon: Feather, action: p.onWrite, cta: written ? 'Write another reflection' : 'Start journaling' },
    { title: 'Revisit a past moment', detail: reviewed ? 'You looked back at an earlier day.' : 'Open an entry from before today.', done: reviewed, Icon: BookOpen, action: p.onHistory, cta: 'Browse past journals' },
    { title: 'Three writing days this week', detail: Math.min(weeklyDays, 3) + ' of 3 days. Every small step counts.', done: weeklyDays >= 3, Icon: Trophy, action: p.onWrite, cta: 'Make time to write' },
  ];
  return (
    <section className="card journal-quests">
      <div className="section-top"><span className="eyebrow purple">YOUR JOURNAL QUESTS {p.demo ? '· SAMPLE' : ''}</span><span className="tag">{completed} of 3 complete</span></div>
      <h2 style={{ marginTop: 18 }}>Small steps. A story worth keeping.</h2>
      <p>Choose a gentle task for today. Miss a day? You can start again whenever you like.</p>
      <label className="quest-progress-label">Today’s task progress<progress aria-label="Journal task progress" max={3} value={completed}/></label>
      <div className="quest-list">{tasks.map(task => (
        <div className={'quest-row' + (task.done ? ' complete' : '')} key={task.title}>
          {task.done ? <CheckCircle2 size={25}/> : <Circle size={25}/>}
          <div><h3>{task.title}</h3><p>{task.detail}</p></div>
          <button className="secondary" onClick={task.action}>{task.cta}</button>
        </div>
      ))}</div>
      <div className="quest-badges" aria-label="Journal milestones">
        <span className={p.entries.length >= 1 ? 'earned' : ''}><Award size={20}/>{p.entries.length >= 1 ? 'First page earned' : 'First page · save 1 entry'}</span>
        <span className={recordedDays.size >= 3 ? 'earned' : ''}><Trophy size={20}/>{recordedDays.size >= 3 ? 'Finding rhythm earned' : 'Finding rhythm · write on 3 days'}</span>
        <span className={p.entries.length >= 10 ? 'earned' : ''}><BookOpen size={20}/>{p.entries.length >= 10 ? 'Page collector earned' : 'Page collector · save 10 entries'}</span>
      </div>
      {!p.completeHistory && <p className="muted">Progress currently uses loaded entries. Open Journal to load your complete history and update milestones.</p>}
      <div className="quest-reminder"><div><h3>Make a little time for your journal.</h3><p>Optional daily reminder: 18:00 UTC (6 PM Freetown). Your journal content never appears in the notification.</p></div>
        <button className="primary" disabled={busy || (!p.demo && !loaded)} onClick={toggleReminder}><Bell size={18}/>{busy ? 'Saving…' : progress.dailyReminder ? 'Turn off daily reminder' : 'Enable daily reminder'}</button>
      </div>
      {status && <p role="status">{status}</p>}
      {error && <p role="alert" className="error-text">{error}</p>}
    </section>
  );
}
