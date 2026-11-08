import { useEffect, useRef, useState } from 'react';
import { api, notifications } from './client';
import { ArrowRight, Bell, CalendarDays, Check, X } from 'lucide-react';

type Cadence = 'off' | 'weekly' | 'monthly';
type Settings = { cadence: Cadence; nextAt: string | null };
type Entry = { id: string; text: string; mood: string; include: boolean; created: string };
type Props = { demo: boolean; onSaved: (entry: Entry) => void };
const sampleGuide = 'Sample review guide\n\nWhat I noticed\nYou are making space to notice both effort and challenges. This demonstration does not analyse your activities.\n\nAn exercise to try\nIf comfortable, write down one thing within your control and one thing you can set aside for now. Skip the exercise if it does not help.\n\nYour next small step\nChoose a manageable action you can take in the next few days.\n\nA question for next time\nWhat helped you feel supported?';
function nextDate(cadence: Cadence) {
  const now = new Date();
  if (cadence === 'off') return null;
  const d = cadence === 'weekly'
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 18));
  if (cadence === 'weekly') {
    d.setUTCDate(d.getUTCDate() + (7 - d.getUTCDay()) % 7);
    if (d <= now) d.setUTCDate(d.getUTCDate() + 7);
  } else if (d <= now) d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString();
}
export default function ActivityCheckIn({ demo, onSaved }: Props) {
  const [settings, setSettings] = useState<Settings>({ cadence: 'off', nextAt: null });
  const [cadence, setCadence] = useState<Cadence>('weekly');
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState('');
  const [mood, setMood] = useState('Okay');
  const [include, setInclude] = useState(true);
  const [guide, setGuide] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [pushInfo, setPushInfo] = useState('');
  const savedId = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    if (demo) {
      const raw = localStorage.getItem('nextme-sample-reminders');
      if (raw) {
        try { const s = JSON.parse(raw) as Settings; setSettings(s); setCadence(s.cadence); } catch { /* Ignore invalid sample settings. */ }
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get('/api/reminders').then(r => {
      if (!active) return;
      setSettings(r.data); setCadence(r.data.cadence);
    }).catch(() => { if (active) setError('Could not load reminders. Refresh to retry.'); })
      .finally(() => { if (active) setLoading(false); });
    notifications.getEnableGuidance().then(g => { if (active) setPushInfo([g.message, ...g.steps].join(' ')); }).catch(() => {});
    return () => { active = false; };
  }, [demo]);
  const due = settings.nextAt !== null && new Date(settings.nextAt).getTime() <= Date.now();
  async function saveSettings(withPush: boolean) {
    setError(''); setStatus(''); setBusy(true);
    try {
      if (!demo && withPush && cadence !== 'off') {
        await notifications.subscribe();
      }
      const next = demo
        ? { cadence, nextAt: nextDate(cadence) }
        : (await api.put('/api/reminders', { cadence })).data;
      setSettings(next);
      if (demo) localStorage.setItem('nextme-sample-reminders', JSON.stringify(next));
      setStatus(demo ? 'Sample reminder preference saved. No notification will be sent.' : cadence === 'off' ? 'Check-in reminders are off.' : withPush ? 'Reminder schedule saved and browser notifications enabled.' : 'Reminder schedule saved. In-app reminders are on; push reaches only devices you have enabled.');
    } catch {
      setError('Could not finish enabling or saving reminders. Check notification permission and try again, or save in-app reminders instead.');
    } finally { setBusy(false); }
  }
  function downloadCalendar() {
    if (cadence === 'off') { setError('Choose weekly or monthly before adding a calendar reminder.'); return; }
    const date = nextDate(cadence)!.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const text = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NextMe//Check-in//EN',
      'BEGIN:VEVENT', 'UID:' + crypto.randomUUID() + '@nextme.app',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'),
      'DTSTART:' + date, 'DURATION:PT15M',
      'RRULE:FREQ=' + (cadence === 'weekly' ? 'WEEKLY;BYDAY=SU' : 'MONTHLY;BYMONTHDAY=1'),
      'SUMMARY:NextMe personal check-in',
      'DESCRIPTION:Reflect on your activities and choose your next small step.',
      'URL:' + window.location.origin + '/',
      'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:Time for a personal check-in', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
    const a = document.createElement('a'); a.href = url; a.download = 'nextme-check-in.ics'; a.click(); URL.revokeObjectURL(url);
    setStatus('Calendar reminder downloaded. Import it into your calendar. Calendar reminders are managed separately there.');
  }
  async function getGuide() {
    if (!activities.trim()) { setError('Share your activities before asking for guidance.'); return; }
    setError(''); setBusy(true); setGuide('');
    try {
      const response = demo ? { text: sampleGuide } : (await api.post('/api/checkin', { text: activities, period, mood })).data;
      setGuide(response.text);
    } catch { setError('Your review guide is unavailable. Your activities are still here. Press Get my review guide to retry.'); }
    finally { setBusy(false); }
  }
  async function finish() {
    if (!activities.trim()) { setError('Write your activities before saving.'); return; }
    setBusy(true); setError('');
    try {
      if (!savedId.current) savedId.current = crypto.randomUUID();
      const entry = { id: savedId.current, text: (period === 'weekly' ? 'Weekly' : 'Monthly') + ' activity check-in\n\n' + activities, mood, include, created: new Date().toISOString() };
      if (!demo) await api.post('/api/entries', entry);
      const next = demo ? { cadence: settings.cadence, nextAt: nextDate(settings.cadence) } : (await api.post('/api/reminders/complete', {})).data;
      setSettings(next);
      if (demo) localStorage.setItem('nextme-sample-reminders', JSON.stringify(next));
      onSaved(entry);
      setOpen(false); setActivities(''); setGuide(''); savedId.current = null;
      setStatus(demo ? 'Sample check-in saved for this session.' : 'Check-in saved to your journal. Your next reminder is scheduled.');
    } catch { setError('Could not finish saving. Your activities are still here. Retry Save check-in and finish; it will reuse the same entry.'); }
    finally { setBusy(false); }
  }
  return (
    <section className="card" style={{ marginBottom: 24, marginTop: 24 }}>
      <div className="section-top">
        <span className="eyebrow purple"><Bell size={13} style={{ display: 'inline', marginRight: 6 }}/> YOUR REGULAR CHECK-IN</span>
        <span className="tag">{demo ? 'Sample preferences' : due ? 'Check-in due' : settings.cadence === 'off' ? 'Reminders off' : settings.cadence + ' reminders'}</span>
      </div>
      <h2 style={{ marginTop: 16 }}>Make room to look back—and move forward.</h2>
      <p>Reflect on your activities, feelings, wins and challenges. Ask AI for an optional wellbeing exercise and a next step.</p>
      <div className="mode-row wrap" style={{ alignItems: 'center', gap: 10 }}>
        <label className="field-label" style={{ margin: 0 }}>
          Reminder frequency
          <select aria-label="Reminder frequency" value={cadence} disabled={busy || loading} onChange={e => setCadence(e.target.value as Cadence)}
            style={{ marginLeft: 8, padding: 10, border: '1px solid #e3dfea', borderRadius: 8, background: '#fff' }}>
            <option value="off">Off</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
          </select>
        </label>
        <button className="secondary" disabled={busy || loading} onClick={() => saveSettings(false)}>Save reminder preference</button>
        {!demo && cadence !== 'off' && <button className="secondary" disabled={busy || loading} onClick={() => saveSettings(true)}><Bell size={14}/>Enable browser reminders</button>}
        <button className="text-button" onClick={downloadCalendar}><CalendarDays size={14}/>Add to calendar</button>
      </div>
      <small className="muted">Weekly: Sundays at 18:00 UTC (6 PM Freetown). Monthly: the 1st at 18:00 UTC. Push needs browser permission and a supported device. Turning reminders off stops app check-in pushes; remove downloaded calendar events separately.</small>
      {settings.nextAt && <p>{due ? 'Your check-in is ready whenever you are.' : 'Next reminder: ' + new Date(settings.nextAt).toLocaleString()}</p>}
      {!demo && pushInfo && <small className="muted">{pushInfo}</small>}
      <button className="primary" style={{ marginTop: 14 }} onClick={() => { setPeriod(settings.cadence === 'monthly' ? 'monthly' : 'weekly'); setOpen(true); setError(''); }}>Start activity check-in<ArrowRight size={15}/></button>
      {status && <p role="status" style={{ color: '#497c58' }}>{status}</p>}
      {error && !open && <p role="alert" className="error-text">{error}</p>}
      {open && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-label="Activity check-in">
            <div className="modal-heading"><div><span className="eyebrow purple">{demo ? 'SAMPLE ACTIVITY REVIEW' : 'YOUR ACTIVITY REVIEW'}</span><h2>How has this chapter felt?</h2></div><button className="icon-button" aria-label="Close activity check-in" disabled={busy} onClick={() => setOpen(false)}><X/></button></div>
            <div className="mode-row wrap">
              {(['weekly', 'monthly'] as const).map(p => <button key={p} disabled={busy || savedId.current !== null} className={period === p ? 'chip selected' : 'chip'} onClick={() => { setPeriod(p); setGuide(''); }}>{p === 'weekly' ? 'This week' : 'This month'}</button>)}
            </div>
            <label className="field-label">How are you feeling?
              <select aria-label="Review feeling" value={mood} disabled={busy || savedId.current !== null} onChange={e => { setMood(e.target.value); setGuide(''); }} style={{ marginLeft: 10, padding: 8 }}>
                {['Difficult', 'Low', 'Okay', 'Good', 'Great'].map(m => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="field-label" htmlFor="activity-report">Activities, wins, challenges, and what you need next</label>
            <textarea id="activity-report" aria-label="Activities report" maxLength={5000} rows={6} placeholder="What did you do? What went well? What was hard? What support would help?" value={activities} disabled={busy || savedId.current !== null} onChange={e => { setActivities(e.target.value); setGuide(''); }}/>
            <p className="muted">AI uses this report and your selected feeling. Getting a guide sends them for AI processing. This is optional wellbeing support, not professional therapy. You may skip any exercise.</p>
            {error && <p role="alert" className="error-text">{error}</p>}
            <button className="secondary" disabled={busy} onClick={getGuide}>{busy ? 'Working…' : 'Get my review guide'}</button>
            {guide && <div aria-live="polite" className="reflection-text" style={{ marginTop: 20 }}>{guide}</div>}
            <label className="check-label"><input type="checkbox" checked={include} disabled={busy || savedId.current !== null} onChange={e => setInclude(e.target.checked)}/>Include my saved activity report in future AI reflections and my birthday message.</label>
            <small className="muted">Saving keeps your activity report in your journal. AI advice stays in this dialog only. Completing a check-in keeps your recurring reminder schedule.</small>
            <button className="primary wide" style={{ marginTop: 14 }} disabled={busy} onClick={finish}>Save check-in and finish<Check size={15}/></button>
          </section>
        </div>
      )}
    </section>
  );
}
