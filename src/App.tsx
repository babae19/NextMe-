import { useEffect, useRef, useState } from 'react';
import { api, auth } from './client';
import ActivityCheckIn from './ActivityCheckIn';
import JournalSummary, { journalDay } from './JournalSummary';
import JournalTasks from './JournalTasks';
import FutureSelfStudio from './FutureSelfStudio';
import LifeGoals from './LifeGoals';
import ConnectedServices from './ConnectedServices';
import BirthdayChat from './BirthdayChat';
import { MoodLabel } from './MoodLabel';
import SunshineHome from './SunshineHome';
import PersonalSpace, { readPreferences } from './PersonalSpace';
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  Feather,
  Heart,
  Home,
  LockKeyhole,
  LogOut,
  Pause,
  Play,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

type Entry = {
  id: string;
  text: string;
  mood: string;
  include: boolean;
  created: string;
};
type Profile = {
  name: string;
  birthday: string;
  timezone: string;
  goals: string[];
  consent: boolean;
};
type Message = { role: string; content: string };
const sampleText =
  'I am one possible version of you, five years ahead. I cannot predict your life. This sample is an invitation to reflect on the choices you make today.\n\nSmall, consistent efforts can create room for growth. If you keep making time for what matters, you may find yourself living with more intention.\n\nWhen life gets difficult, pausing and asking for support can help. You do not have to solve every challenge at once or earn the right to rest.\n\nChoose one manageable step this week. Make a little time for something meaningful, or reach out to someone you trust. Your future is still taking shape.';
const samples: Entry[] = [
  {
    id: 'sample-1',
    text: 'I finally made time for a walk after a busy day. The fresh air helped me clear my head and return to my work with a little more patience.',
    mood: 'Good',
    include: true,
    created: new Date().toISOString(),
  },
  {
    id: 'sample-2',
    text: 'Shared a new idea with a friend. I was nervous, but talking it through helped me find a small first step.',
    mood: 'Great',
    include: true,
    created: new Date(Date.now() - 86400000).toISOString(),
  },
];
const moods = ['Difficult', 'Low', 'Okay', 'Good', 'Great'];
const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
const failText = (e: unknown) => {
  const err = e as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };
  return (
    err.response?.data?.error ||
    err.response?.data?.message ||
    err.message ||
    'Something went wrong. Please try again.'
  );
};
export default function App() {
  const [preferences, setPreferences] = useState(readPreferences);
  useEffect(() => {
    document.documentElement.dataset.palette = preferences.palette;
    document.documentElement.dataset.quiet = String(!preferences.motion);
    try { localStorage.setItem('nextme-preferences', JSON.stringify(preferences)); } catch { /* Preferences still work for this visit. */ }
  }, [preferences]);
  const [tab, setTab] = useState('Today');
  const [demo, setDemo] = useState(true);
  const [signed, setSigned] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[]>(samples);
  const [cursor, setCursor] = useState<string | undefined>();
  const [mood, setMood] = useState('Good');
  const [chat, setChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState('Help me reflect');
  const [include, setInclude] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [setup, setSetup] = useState(false);
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [goals, setGoals] = useState<string[]>(['Personal growth']);
  const [consent, setConsent] = useState(false);
  const [search, setSearch] = useState('');
  const [historyMonth, setHistoryMonth] = useState('');
  const [historyMood, setHistoryMood] = useState('All');
  const [historyOrder, setHistoryOrder] = useState('newest');
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [taskRefresh, setTaskRefresh] = useState(0);
  const [sampleReviewed, setSampleReviewed] = useState(false);
  const historyRunning = useRef(false);
  const accountEpoch = useRef(0);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [reflection, setReflection] = useState('');
  const [eligible, setEligible] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [encounter, setEncounter] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [meetingExpiresAt, setMeetingExpiresAt] = useState(0);
  const [meetingMessages, setMeetingMessages] = useState<Message[]>([]);
  const [goalRevision, setGoalRevision] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [narrate, setNarrate] = useState(false);
  const [step, setStep] = useState(localStorage.getItem('nextme-step') || '');
  const [stepDraft, setStepDraft] = useState('');
  useEffect(() => {
    if (auth.isSignedIn()) loadAccount().catch(e => setError(failText(e)));
  }, []);
  useEffect(() => {
    if (!encounter || !meetingExpiresAt || done) return;
    const tick = () => setSeconds(Math.max(0, Math.min(300, 300 - Math.ceil((meetingExpiresAt - Date.now()) / 1000))));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [encounter, meetingExpiresAt, done]);
  useEffect(() => {
    if (seconds === 300 && encounter && !done) {
      setPlaying(false);
      window.speechSynthesis?.cancel();
      if (demo) {
        setDone(true);
        setCompleted(true);
      } else
        api
          .post('/api/reveal/complete', {})
          .then(() => {
            setDone(true);
            setCompleted(true);
          })
          .catch(e => setError(failText(e)));
    }
  }, [seconds, encounter, done, demo]);
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    []
  );
  async function loadAccount() {
    accountEpoch.current += 1;
    const user = await auth.getUser();
    if (!user) return;
    setSigned(true);
    setDemo(false);
    setEntries([]);
    const [p, list] = await Promise.all([
      api.get('/api/profile'),
      api.get('/api/entries'),
    ]);
    setProfile(p.data.profile);
    setEntries(list.data.items);
    setCursor(list.data.nextToken);
    setName(p.data.profile?.name || user.name || '');
    if (!p.data.profile) setSetup(true);
    else {
      setBirthday(p.data.profile.birthday);
      setGoals(p.data.profile.goals);
      const result = await api.get('/api/reveal');
      setEligible(result.data.eligible);
      setCompleted(result.data.completed);
    }
  }
  async function loadPastJournals() {
    if (demo || !cursor || historyRunning.current) return;
    historyRunning.current = true;
    const epoch = accountEpoch.current;
    setHistoryBusy(true);
    setHistoryError('');
    let token: string | undefined = cursor;
    try {
      while (token) {
        const result = await api.get('/api/entries?cursor=' + encodeURIComponent(token));
        if (epoch !== accountEpoch.current) return;
        setEntries(prev => [...new Map([...prev, ...result.data.items].map(entry => [entry.id, entry])).values()]);
        token = result.data.nextToken;
        setCursor(token);
      }
    } catch {
      if (epoch === accountEpoch.current) setHistoryError('Could not load all past journals. Your loaded entries are still here. Retry to continue.');
    } finally {
      historyRunning.current = false;
      setHistoryBusy(false);
    }
  }
  useEffect(() => {
    if (tab === 'Journal' && !demo && cursor && !historyError) void loadPastJournals();
  }, [tab, demo, cursor]);
  function openJournalEntry(entry: Entry) {
    setEditing(entry);
    const timezone = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = journalDay(new Date().toISOString(), timezone);
    if (journalDay(entry.created, timezone) >= today) return;
    if (demo) { setSampleReviewed(true); return; }
    api.post('/api/journal-tasks/review', { id: entry.id }).then(() => {
      setTaskRefresh(value => value + 1);
    }).catch(() => setNotice('Entry opened. Task progress could not update; reopen it to retry.'));
  }
  async function signIn() {
    setError('');
    try {
      await auth.signIn();
      await loadAccount();
    } catch (e) {
      setError(
        'Sign-in could not finish. ' + failText(e)
      );
    }
  }
  async function saveProfile() {
    setBusy(true);
    setError('');
    try {
      const result = await api.put('/api/profile', {
        name,
        birthday,
        goals,
        consent,
        timezone:
          profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setProfile(result.data.profile);
      setSetup(false);
      setNotice('Your personal space is ready.');
      const r = await api.get('/api/reveal');
      setEligible(r.data.eligible);
      setCompleted(r.data.completed);
    } catch (e) {
      setError(failText(e));
    } finally {
      setBusy(false);
    }
  }
  async function send(wantGuide = false) {
    if (busy) return;
    const selectedMode = wantGuide ? 'Daily wellbeing guide' : mode;
    if (!draft.trim() && (!wantGuide || !messages.some(m => m.role === 'user'))) {
      if (wantGuide) setError('Share how you feel first, then ask for a guide.');
      return;
    }
    setMode(selectedMode);
    const next = draft.trim()
      ? [...messages, { role: 'user', content: draft.trim() }]
      : messages;
    setMessages(next);
    setDraft('');
    setBusy(true);
    setError('');
    try {
      if (demo)
        setMessages([
          ...next,
          {
            role: 'assistant',
            content:
              selectedMode === 'Daily wellbeing guide'
                ? 'Sample daily guide — Feeling: ' + mood + '\n\nNotice: Name one feeling without judging it.\n\nTry: If comfortable, look around and name three things you can see, two sounds you notice, and one thing you can feel against your skin. Skip anything uncomfortable.\n\nNext step: Choose one small thing that could support you today.\n\nCheck in: What feels manageable right now? This sample is general wellbeing support, not therapy.'
                : 'This is a sample response. In your own space, AI will reflect on what you share. What is one small thing that would make tomorrow feel a little easier?',
          },
        ]);
      else {
        const r = await api.post('/api/chat', { messages: next, mode: selectedMode, mood, tone: preferences.tone });
        setMessages([...next, { role: 'assistant', content: r.data.text }]);
      }
    } catch (e) {
      setError(failText(e));
    } finally {
      setBusy(false);
    }
  }
  async function retryChat() {
    setBusy(true);
    setError('');
    try {
      const r = await api.post('/api/chat', { messages, mode, mood });
      setMessages([...messages, { role: 'assistant', content: r.data.text }]);
    } catch (e) {
      setError(failText(e));
    } finally {
      setBusy(false);
    }
  }
  async function saveEntry() {
    const text =
      messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n\n') || draft.trim();
    if (!text) {
      setError('Write something before saving your reflection.');
      return;
    }
    if (text.length > 6000) {
      setError('Please keep each saved reflection under 6,000 characters.');
      return;
    }
    setBusy(true);
    setError('');
    const entry = {
      id: crypto.randomUUID(),
      text,
      mood,
      include,
      created: new Date().toISOString(),
    };
    try {
      if (!demo) await api.post('/api/entries', entry);
      setEntries(prev => [entry, ...prev]);
      setMessages([]);
      setDraft('');
      setChat(false);
      setNotice(
        demo
          ? 'Sample entry added for this session. Sign in to save your own journal.'
          : 'Reflection saved to your journal.'
      );
    } catch (e) {
      setError(failText(e));
    } finally {
      setBusy(false);
    }
  }
  async function updateEntry() {
    if (!editing?.text.trim()) {
      setError('Your entry cannot be empty.');
      return;
    }
    setBusy(true);
    try {
      if (!demo) await api.put('/api/entries/' + editing.id, editing);
      setEntries(entries.map(e => (e.id === editing.id ? editing : e)));
      setEditing(null);
      setNotice('Entry updated.');
    } catch (e) {
      setError(failText(e));
    } finally {
      setBusy(false);
    }
  }
  async function removeEntry(entry: Entry) {
    if (!confirm('Delete this journal entry? This cannot be undone.')) return;
    try {
      if (!demo) await api.delete('/api/entries/' + entry.id);
      setEntries(entries.filter(e => e.id !== entry.id));
      setNotice('Entry deleted.');
    } catch (e) {
      setError(failText(e));
    }
  }
  async function reflect() {
    setBusy(true);
    setError('');
    try {
      if (demo)
        setReflection(
          'Sample reflection\n\nYou made space for a walk and shared an idea with a friend. Both entries describe taking a manageable step rather than doing everything at once.\n\nWhat small action would you like to repeat this week?\n\nTry protecting ten minutes for something that helps you reset.'
        );
      else setReflection((await api.post('/api/reflection', {})).data.text);
    } catch (e) {
      setError(failText(e));
    } finally {
      setBusy(false);
    }
  }
  async function beginReveal() {
    setBusy(true);
    setError('');
    setDone(false);
    setSeconds(0);
    try {
      const meeting = demo ? {text: sampleText, expiresAt: Date.now() + 300000, messages: []} : (await api.post('/api/reveal', {})).data;
      if (meeting.completed) { setCompleted(true); throw new Error('This year’s meeting is complete.'); }
      const text = meeting.text;
      setMeetingExpiresAt(meeting.expiresAt);
      setMeetingMessages(meeting.messages || []);
      setEncounter(text);
      setPlaying(true);
      if (narrate && 'speechSynthesis' in window) {
        const voice = new SpeechSynthesisUtterance(text);
        voice.rate = 0.95;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(voice);
      }
    } catch (e) {
      setError(failText(e));
    } finally {
      setBusy(false);
    }
  }
  function exportJournal() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            profile,
            entries,
            note: cursor
              ? 'Partial export: load more journal entries before exporting all.'
              : 'All currently available entries.',
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nextme-journal.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  const nameLabel = profile?.name.split(' ')[0] || 'friend';
  const sorted = [...entries].sort((a, b) =>
    historyOrder === 'oldest' ? a.created.localeCompare(b.created) : b.created.localeCompare(a.created)
  );
  const filteredEntries = sorted.filter(entry =>
    entry.text.toLowerCase().includes(search.toLowerCase()) &&
    (historyMood === 'All' || entry.mood === historyMood) &&
    (!historyMonth || journalDay(entry.created, profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone).startsWith(historyMonth))
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={e => {
            e.preventDefault();
            setTab('Today');
          }}
        >
          <span className="brand-mark">
            <Sparkles size={22} />
          </span>
          nextme<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR PERSONAL SPACE</div>
        <nav aria-label="NextMe workspace">
          {[
            ['Today', Home],
            ['Journal', BookOpen],
            ['Future Me', Sparkles],
            ['Profile', Settings],
          ].map(([label, Icon]) => {
            const I = Icon as typeof Home;
            return (
              <button
                key={String(label)}
                aria-current={tab === label ? 'page' : undefined}
                className={tab === label ? 'nav-item active' : 'nav-item'}
                onClick={() => {
                  setTab(String(label));
                  setError('');
                }}
              >
                <I size={19} />
                {String(label)}
                {label === 'Future Me' && <span className="tiny-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-note">
            <ShieldCheck size={20} />
            <div>
              A little space, just for you.
              <small>You choose what to share.</small>
            </div>
          </div>
          <button className="user-pill" onClick={() => setTab('Profile')}>
            <span className="avatar">
              {demo ? 'S' : nameLabel[0]?.toUpperCase()}
            </span>
            <span>
              {demo ? 'Sample space' : profile?.name || 'Your account'}
              <small>
                {demo ? 'Explore the experience' : 'Your personal journal'}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <button className="text-button" onClick={() => setTab('Profile')}><CalendarDays size={17}/>Reminders</button>
          <div>
            <span className="private-badge">
              <LockKeyhole size={12} />
              {demo ? 'Sample tour' : 'Personal space'}
            </span>
            {demo ? (
              <button className="text-button" onClick={signIn}>
                Sign in <ArrowUpRight size={15} />
              </button>
            ) : (
              <span className="avatar small">
                {nameLabel[0]?.toUpperCase()}
              </span>
            )}
          </div>
        </header>
        {demo && (
          <div className="demo-strip">
            <span>
              <Sparkles size={14} /> You’re exploring a sample. Your own story
              starts when you sign in.
            </span>
            <button onClick={signIn}>
              Create my space <ArrowRight size={14} />
            </button>
          </div>
        )}
        <div className="content" data-page={tab}>
          {error && (
            <div role="alert" className="alert error">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {tab === 'Today' && <PersonalSpace mood={mood} preferences={preferences} onPreferences={setPreferences} onStart={(prompt, selectedMode) => { setDraft(current => current.trim() ? current : prompt + '\n\n'); setMode(selectedMode); setChat(true); }} />}
          {tab === 'Today' && (
            <SunshineHome
              mood={mood}
              onMood={setMood}
              entries={entries}
              demo={demo}
              name={nameLabel}
              step={step}
              onChat={() => setChat(true)}
              onGuide={() => { setMode('Daily wellbeing guide'); setChat(true); }}
              onJournal={() => setTab('Journal')}
              onReflection={reflect}
              busy={busy}
              onFuture={() => setTab('Future Me')}
              onReminders={() => setTab('Profile')}
              onEntry={entry => { setTab('Journal'); openJournalEntry(entry); }}
            />
          )}
          {tab === 'Today' && (
            <JournalTasks
              demo={demo}
              entries={entries}
              timezone={profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
              refresh={taskRefresh}
              sampleReviewed={sampleReviewed}
              completeHistory={!cursor && !historyBusy}
              onWrite={() => setChat(true)}
              onHistory={() => setTab('Journal')}
            />
          )}
          {tab === 'Journal' && (
            <>
              <div className="chapter-banner journal-banner">
                <p className="eyebrow">YOUR STORY, IN YOUR WORDS</p>
                <div className="section-heading">
                  <div>
                    <h1>
                      Pages of <em>your life.</em>
                    </h1>
                    <p className="subtitle">
                      Keep the moments. Notice what changes.
                    </p>
                  </div>
                  <button className="primary" onClick={() => setChat(true)}>
                    <Plus size={17} />
                    New entry
                  </button>
                </div>
              </div>
              <JournalSummary
                demo={demo}
                entries={entries}
                timezone={profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
              />
              <div className="journal-archive-heading">
                <h2>All past journals</h2>
                <p>{demo ? 'Sample history · ' : ''}{entries.length} saved {entries.length === 1 ? 'entry' : 'entries'}{cursor ? ' loaded so far' : ' · complete history loaded'}</p>
              </div>
              {historyBusy && <p role="status">Loading all past journals… {entries.length} entries available so far.</p>}
              {historyError && <p role="alert" className="error-text">{historyError}</p>}
              <div className="journal-history-filters">
                <label>Month<input type="month" aria-label="Filter journals by month" value={historyMonth} onChange={e => setHistoryMonth(e.target.value)}/></label>
                <label>Feeling<select aria-label="Filter journals by feeling" value={historyMood} onChange={e => setHistoryMood(e.target.value)}><option>All</option>{moods.map(m => <option key={m}>{m}</option>)}</select></label>
                <label>Order<select aria-label="Journal order" value={historyOrder} onChange={e => setHistoryOrder(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
                <button className="secondary" onClick={() => { setSearch(''); setHistoryMonth(''); setHistoryMood('All'); }}>Clear filters</button>
              </div>
              <input
                className="search"
                aria-label="Search journal"
                placeholder="Search your moments…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="journal-list">
                {filteredEntries.map(e => (
                    <article className="card journal-entry" key={e.id}>
                      <div className="section-top">
                        <span className="entry-date">
                          {dateLabel(e.created)}
                          {demo && ' · Sample'}
                        </span>
                        <span className="mood-tag"><MoodLabel mood={e.mood}/></span>
                      </div>
                      <p>{e.text}</p>
                      <div className="entry-actions">
                        <small>
                          <ShieldCheck size={13} />
                          {e.include
                            ? 'Included in AI reflections'
                            : 'Excluded from AI reflections'}
                        </small>
                        <div>
                          <button
                            className="text-button"
                            onClick={() => openJournalEntry(e)}
                          >
                            Edit entry
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label="Delete entry"
                            disabled={historyBusy}
                            onClick={() => removeEntry(e)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              {!filteredEntries.length && !historyBusy && (
                <div className="empty card">
                  <BookOpen />
                  <h3>
                    {search || historyMonth || historyMood !== 'All'
                      ? 'No matching moments.'
                      : 'Your journal starts here.'}
                  </h3>
                  <p>Try a different search or write a new entry.</p>
                </div>
              )}
              {cursor && (
                <button className="secondary" disabled={historyBusy} onClick={loadPastJournals}>
                  {historyBusy ? 'Loading history…' : 'Load all remaining journals'}
                </button>
              )}
            </>
          )}
          {tab === 'Future Me' && (
            <>
              <section className="monthly-plan-link"><div><h3>A plan for your next month</h3><p>Turn your diary and life goals into practical recommendations.</p></div><button className="secondary" onClick={() => setTab('Journal')}>Open monthly advice<ArrowRight size={16}/></button></section>
              <LifeGoals key={demo ? "sample-goals" : "account-goals"} demo={demo} onSaved={() => setGoalRevision(v => v + 1)} />
              <FutureSelfStudio
                goalRevision={goalRevision}
                demo={demo}
                entries={entries}
                onStep={value => { setStep(value); localStorage.setItem('nextme-step', value); }}
              />
              <div className="annual-encounter-heading">
                <p className="eyebrow">YOUR BIRTHDAY RITUAL</p>
                <h2>Your annual five-minute meeting.</h2>
                <p>The birthday experience stays separate from everyday future-self chat.</p>
              </div>
              <div className="future-page">
                <section className="future-card reveal-card">
                  <div className="orb-scene">
                    <div className="orbit one" />
                    <div className="orbit two" />
                    <div className="orb" />
                  </div>
                  <span className="tag dark">
                    {demo
                      ? 'SAMPLE EXPERIENCE'
                      : completed
                        ? 'THIS YEAR’S ENCOUNTER COMPLETE'
                        : eligible
                          ? 'HAPPY BIRTHDAY'
                          : 'YOUR ANNUAL ENCOUNTER'}
                  </span>
                  <h2>
                    Five minutes.
                    <br />A different perspective.
                  </h2>
                  <p>
                    {demo
                      ? 'Try a sample encounter. It does not use your personal information.'
                      : completed
                        ? 'Carry one useful insight into your next chapter.'
                        : eligible
                          ? 'Your possible future self is ready to meet you.'
                          : 'Your personal encounter unlocks on your birthday. Keep sharing the moments that matter.'}
                  </p>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={narrate}
                      onChange={e => setNarrate(e.target.checked)}
                    />
                    Optional browser narration (voice availability varies)
                  </label>
                  <button
                    className="light-button"
                    disabled={busy || (!demo && (!eligible || completed))}
                    onClick={beginReveal}
                  >
                    {busy
                      ? 'Preparing your encounter…'
                      : demo
                        ? 'Try the sample meeting'
                        : completed
                          ? 'See you next birthday'
                          : eligible
                            ? 'Begin my five minutes'
                            : 'Opens on your birthday'}
                    {!demo && !eligible ? (
                      <LockKeyhole size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                  </button>
                  <small>Five minutes to read and chat. Pause narration whenever you need.</small>
                </section>
                <section className="card chapter">
                  <span className="icon-box teal">
                    <Feather size={20} />
                  </span>
                  <h2>Your next chapter</h2>
                  <p>
                    Your future isn’t fixed. Choose a small action that supports
                    the life you want.
                  </p>
                  <div className="principle">
                    <span>01</span>
                    <div>
                      <h3>Keep what helps</h3>
                      <p>Notice a habit you want to carry forward.</p>
                    </div>
                  </div>
                  <div className="principle">
                    <span>02</span>
                    <div>
                      <h3>Make room for change</h3>
                      <p>
                        Choose one pattern you’d like to approach differently.
                      </p>
                    </div>
                  </div>
                  <label className="field-label" htmlFor="step">
                    My next small step
                  </label>
                  <input
                    id="step"
                    maxLength={180}
                    value={stepDraft}
                    onChange={e => setStepDraft(e.target.value)}
                    placeholder={step || 'e.g. Take a ten-minute walk tomorrow'}
                  />
                  <button
                    className="primary wide"
                    onClick={() => {
                      if (!stepDraft.trim()) {
                        setError('Write a small step first.');
                        return;
                      }
                      setStep(stepDraft.trim());
                      localStorage.setItem('nextme-step', stepDraft.trim());
                      setNotice('Your next step is saved on this device.');
                    }}
                  >
                    Save my next step
                    <Check size={16} />
                  </button>
                  <small className="muted">
                    Your action card is stored on this device.
                  </small>
                </section>
              </div>
              <ConnectedServices demo={demo} />
              <div className="info-note">
                <CircleHelp size={18} />
                <p>
                  This is a reflective experience, not a prediction or therapy.
                  Your meeting uses up to 2,000 included diary entries and your saved life goals. Long entries may be shortened. With limited evidence, it will acknowledge that it knows less.
                </p>
              </div>
            </>
          )}
          {tab === 'Profile' && (
            <>
              <div className="chapter-banner profile-banner">
                <p className="eyebrow">YOU’RE IN CONTROL</p>
                <h1>
                  Your space. <em>Your choices.</em>
                </h1>
                <p className="subtitle">
                  Choose what you share and what you keep.
                </p>
              </div>
              <button className="secondary" style={{marginBottom: 20}} onClick={() => setTab('Future Me')}><Sparkles size={16}/>Manage my life goals</button>
              <ActivityCheckIn
                key={demo ? 'sample-checkin' : profile?.name || 'personal-checkin'}
                demo={demo}
                onSaved={entry => setEntries(prev => [entry, ...prev.filter(e => e.id !== entry.id)])}
              />
              <div className="profile-grid">
                <section className="card">
                  <span className="icon-box lavender">
                    <Settings size={20} />
                  </span>
                  <h2>
                    {demo
                      ? 'Make this space yours.'
                      : profile?.name || 'Finish your setup'}
                  </h2>
                  <p>
                    {demo
                      ? 'Sign in to keep your journal across visits and create a personal birthday encounter.'
                      : 'Your journal belongs to your account. Sign out on shared devices.'}
                  </p>
                  {demo ? (
                    <button className="primary" onClick={signIn}>
                      Create my space
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <>
                      <p>
                        <CalendarDays size={15} /> Birthday:{' '}
                        {profile?.birthday || 'Not set'}
                      </p>
                      <p className="muted">Time zone: {profile?.timezone}</p>
                      <button
                        className="secondary"
                        onClick={() => {
                          setConsent(true);
                          setSetup(true);
                        }}
                      >
                        Edit name and interests
                      </button>
                      <button
                        className="text-button"
                        onClick={async () => {
                          accountEpoch.current += 1;
                          await auth.signOut();
                          setCursor(undefined);
                          setHistoryError('');
                          setSampleReviewed(false);
                          setSigned(false);
                          setProfile(null);
                          setDemo(true);
                          setEntries(samples);
                          setMessages([]);
                          setReflection('');
                          setEncounter('');
                          setTab('Today');
                        }}
                      >
                        Sign out
                        <LogOut size={16} />
                      </button>
                    </>
                  )}
                </section>
                <section className="card">
                  <span className="icon-box teal">
                    <ShieldCheck size={20} />
                  </span>
                  <h2>Privacy, in plain language.</h2>
                  <p>
                    Your signed-in entries are stored by this service and
                    restricted to your account. AI processes messages you send
                    in chat. Only entries you include are used for journal
                    reflections and your birthday message.
                  </p>
                  <p>
                    You can edit, exclude, or delete entries in your journal.
                    Excluding an entry does not erase AI responses or a birthday
                    message already generated from it.
                  </p>
                  <button className="secondary" onClick={exportJournal}>
                    <Download size={16} />
                    Export loaded journal
                  </button>
                  <small className="muted">
                    Load all journal pages first for a complete export. This
                    pilot is not end-to-end encrypted. Account deletion is not
                    yet available.
                  </small>
                </section>
              </div>
              <ConnectedServices demo={demo} />
              <div className="info-note">
                <CircleHelp size={18} />
                <p>
                  Adult pilot, ages 18+. Text journaling and optional browser
                  narration are available. Voice recording and realistic avatars are planned for a later release. Optional weekly and monthly browser reminders are available on supported devices. App-owned
                  legal policies must be supplied before a wider launch.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
      {chat && (
        <div className="modal-backdrop">
          <section
            className="modal chat-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Daily reflection"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow purple">
                  {demo ? 'SAMPLE CONVERSATION' : 'YOUR DAILY REFLECTION'}
                </span>
                <h2>A little space to talk.</h2>
              </div>
              <button
                aria-label="Close chat"
                className="icon-button"
                onClick={() => setChat(false)}
              >
                <X />
              </button>
            </div>
            <div className="mode-row">
              {['Just listen', 'Help me reflect', 'Suggest a next step', 'Daily wellbeing guide'].map(
                m => (
                  <button
                    className={mode === m ? 'chip selected' : 'chip'}
                    onClick={() => setMode(m)}
                    disabled={busy}
                    key={m}
                  >
                    {m}
                  </button>
                )
              )}
            </div>
            <div className="mode-row wrap" style={{ marginTop: 14, alignItems: 'center' }}>
              <label className="field-label" style={{ margin: 0 }}>
                Feeling today
                <select aria-label="Feeling today" value={mood} disabled={busy} onChange={e => setMood(e.target.value)}
                  style={{ marginLeft: 10, padding: 8, borderRadius: 8, border: '1px solid #e3dfea', background: '#fff' }}>
                  {moods.map(m => <option key={m}>{m}</option>)}
                </select>
              </label>
              <button className="secondary" disabled={busy} onClick={() => send(true)}>
                <Heart size={15} /> Get my daily guide
              </button>
            </div>
            {mode === 'Daily wellbeing guide' && (
              <div className="info-note" style={{ marginTop: 12, padding: 12 }}>
                <p>Optional AI wellbeing support, not professional therapy. Share how you feel for a short reflection, a coping exercise, and one manageable next step. You can skip any exercise. Advice uses this conversation and your selected feeling; it is not saved to your journal automatically.</p>
              </div>
            )}
            <div className="chat-thread" aria-live="polite">
              <div className="bubble assistant">
                What would you like to share today—a win, a challenge, or
                something on your mind?
              </div>
              {messages.map((m, i) => (
                <div key={i} className={'bubble ' + m.role}>
                  {m.content}
                </div>
              ))}
              {busy && <div className="muted">Taking a moment…</div>}
            </div>
            {error && (
              <div role="alert" className="alert error">
                {error}
                {!demo && messages.length > 0 && (
                  <button onClick={retryChat} disabled={busy}>
                    Retry reply
                  </button>
                )}
              </div>
            )}
            <form
              className="composer"
              onSubmit={e => {
                e.preventDefault();
                send();
              }}
            >
              <textarea
                aria-label="Chat message"
                maxLength={6000}
                placeholder="What’s on your mind?"
                value={draft}
                onChange={e => setDraft(e.target.value)}
              />
              <button
                type="submit"
                className="primary icon-button"
                disabled={busy || !draft.trim()}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </form>
            <label className="check-label">
              <input
                type="checkbox"
                checked={include}
                onChange={e => setInclude(e.target.checked)}
              />
              Include saved entry in AI reflections and birthday message
            </label>
            <div className="modal-footer">
              <small>Your words are saved only when you choose.</small>
              <button className="primary" disabled={busy} onClick={saveEntry}>
                Save reflection
                <Check size={16} />
              </button>
            </div>
          </section>
        </div>
      )}
      {setup && signed && (
        <div className="modal-backdrop">
          <form
            className="modal setup-modal"
            onSubmit={e => {
              e.preventDefault();
              saveProfile();
            }}
          >
            <span className="icon-box lavender">
              <Sparkles />
            </span>
            <h2>Let’s make this your space.</h2>
            <p>A few details to begin your next chapter.</p>
            <label className="field-label">
              Preferred name
              <input
                required
                maxLength={60}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </label>
            <label className="field-label">
              Birthday (18+)
              <input
                required
                disabled={!!profile}
                type="date"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
              />
            </label>
            <small className="muted">
              Birthday and device time zone are fixed after setup in this pilot.
              February 29 birthdays open February 28 in other years.
            </small>
            <label className="field-label">
              What matters to you? Choose up to three.
            </label>
            <div className="mode-row wrap">
              {[
                'Personal growth',
                'Work',
                'Relationships',
                'Wellbeing',
                'Money',
                'Learning',
              ].map(g => (
                <button
                  type="button"
                  key={g}
                  className={goals.includes(g) ? 'chip selected' : 'chip'}
                  onClick={() =>
                    setGoals(
                      goals.includes(g)
                        ? goals.filter(x => x !== g)
                        : goals.length < 3
                          ? [...goals, g]
                          : goals
                    )
                  }
                >
                  {g}
                </button>
              ))}
            </div>
            <label className="check-label">
              <input
                required
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
              />
              I am 18+ and agree to storage of my entries and AI processing of
              messages and included reflections.
            </label>
            <p className="muted">
              Possible futures, never predictions. You control which journal
              entries inform your reflections.
            </p>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <button className="primary wide" disabled={busy} type="submit">
              {busy ? 'Saving…' : 'Save my space'}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      )}
      {editing && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="modal-heading">
              <h2>Your moment, in your words.</h2>
              <button
                aria-label="Close editor"
                className="icon-button"
                onClick={() => setEditing(null)}
              >
                <X />
              </button>
            </div>
            <textarea
              aria-label="Edit entry text"
              className="editor"
              maxLength={6000}
              value={editing.text}
              onChange={e => setEditing({ ...editing, text: e.target.value })}
            />
            <label className="check-label">
              <input
                type="checkbox"
                checked={editing.include}
                onChange={e =>
                  setEditing({ ...editing, include: e.target.checked })
                }
              />
              Include in AI reflections and birthday message
            </label>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <button
              className="primary wide"
              onClick={updateEntry}
              disabled={busy || historyBusy}
            >
              Save changes
              <Check size={16} />
            </button>
          </section>
        </div>
      )}
      {reflection && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="modal-heading">
              <div>
                <span className="eyebrow purple">
                  {demo ? 'SAMPLE REFLECTION' : 'FROM YOUR INCLUDED ENTRIES'}
                </span>
                <h2>A thread worth noticing.</h2>
              </div>
              <button
                aria-label="Close reflection"
                className="icon-button"
                onClick={() => setReflection('')}
              >
                <X />
              </button>
            </div>
            <p className="reflection-text">{reflection}</p>
            <button
              className="primary"
              onClick={() => {
                setReflection('');
                setTab('Future Me');
              }}
            >
              Choose a next step
              <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
      {encounter && (
        <div
          className="encounter-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Future self encounter"
        >
          <button
            className="encounter-close icon-button"
            aria-label="Close encounter"
            onClick={() => {
              setPlaying(false);
              window.speechSynthesis?.cancel();
              setEncounter('');
            }}
          >
            <X />
          </button>
          <span className="eyebrow">
            {demo
              ? 'SAMPLE ENCOUNTER · NO PERSONAL DATA'
              : 'ONE POSSIBLE FUTURE · FIVE YEARS AHEAD'}
          </span>
          <div className="encounter-orb" />
          <h2>
            {done ? 'Your next chapter is yours.' : 'A moment with future you.'}
          </h2>
          <p className="encounter-caption">
            {done
              ? 'Carry one small action into the days ahead.'
              : encounter.split(/\n\s*\n/)[
                  Math.min(3, Math.floor(seconds / 75))
                ] || encounter}
          </p>
          <div className="progress">
            <span style={{ width: (seconds / 300) * 100 + '%' }} />
          </div>
          <span className="timer">
            {Math.floor((300 - seconds) / 60)}:{String((300 - seconds) % 60).padStart(2, '0')} remaining
          </span>
          {!done && (
            <button
              className="light-button"
              onClick={() => {
                if (playing) window.speechSynthesis?.pause();
                else window.speechSynthesis?.resume();
                setPlaying(!playing);
              }}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}{' '}
              {playing ? 'Pause narration' : 'Continue narration'}
            </button>
          )}
          {done && (
            <button
              className="light-button"
              onClick={() => {
                setEncounter('');
                setTab('Future Me');
              }}
            >
              Choose my next step
              <ArrowRight size={16} />
            </button>
          )}
          <BirthdayChat key={meetingExpiresAt} demo={demo} active={!done && seconds < 300} initialMessages={meetingMessages} />
          <small>
            A possibility, not a prediction. Your birthday meeting lasts five minutes.
          </small>
          {error && (
            <p role="alert">
              {error}
              <button
                className="light-button"
                onClick={async () => {
                  try {
                    await api.post('/api/reveal/complete', {});
                    setDone(true);
                    setCompleted(true);
                    setError('');
                  } catch (e) {
                    setError(failText(e));
                  }
                }}
              >
                Retry saving completion
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
