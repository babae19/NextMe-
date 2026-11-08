import { useEffect, useRef, useState } from 'react';
import { api } from '@appdeploy/client';
import { ArrowRight, Check, MessageCircle, RefreshCw, Send, Sparkles, Trash2, UserRound, Volume2 } from 'lucide-react';

type Entry = { id: string; text: string; mood: string; include: boolean; created: string };
type Portrait = { title: string; introduction: string; strengths: { label: string; evidence: string }[]; patterns: { label: string; evidence: string }[]; focus: string; nextSteps: string[] };
type Built = { portrait: Portrait; count: number; shortened: boolean; created: string };
type Message = { role: string; content: string };
type Avatar = { data: string; mimeType: string; created: string };
const sample: Portrait = {
  title: 'The steady explorer',
  introduction: 'I’m one possible future version of you. This sample shows how reflection could connect small everyday choices with the life you want to build.',
  strengths: [
    { label: 'Making space to reset', evidence: 'Sample entry: taking a walk helped create a little breathing room.' },
    { label: 'Willingness to explore', evidence: 'Sample entry: sharing an idea with a friend made a first step clearer.' },
  ],
  patterns: [{ label: 'Small actions can open possibilities', evidence: 'In the sample entries, a walk and a conversation each helped shift perspective. This is limited evidence, not a fixed personality trait.' }],
  focus: 'Make room for meaningful effort and time to recover.',
  nextSteps: ['Protect ten minutes for a quiet reset.', 'Choose one manageable step for an idea you care about.', 'Check in with someone you trust this week.'],
};
export default function FutureSelfStudio({ demo, entries, onStep }: { demo: boolean; entries: Entry[]; onStep: (step: string) => void }) {
  const [built, setBuilt] = useState<Built | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [presentation, setPresentation] = useState('gender-neutral');
  const [complexion, setComplexion] = useState('medium');
  const [removedSample, setRemovedSample] = useState(false);
  const ids = useRef<string[]>([]);
  useEffect(() => {
    setBuilt(null); setMessages([]); ids.current = [];
  }, [entries]);
  useEffect(() => {
    let active = true;
    if (!demo) api.get('/api/future-self/avatar').then(r => {
      if (active) setAvatar(r.data.avatar);
    }).catch(() => { if (active) setStatus('Saved avatar could not load. You can retry by reopening Future Me.'); });
    return () => { active = false; window.speechSynthesis?.cancel(); };
  }, [demo]);
  async function build() {
    if (!consent) { setError('Choose whether to use your included journals before building.'); return; }
    setBusy('persona'); setError(''); setStatus('');
    try {
      let all = entries;
      if (!demo) {
        all = [];
        let cursor: string | undefined;
        do {
          const r = await api.get('/api/entries' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''));
          all = [...all, ...r.data.items]; cursor = r.data.nextToken;
          setStatus('Reading your journal history… ' + all.length + ' entries checked.');
          if (all.length > 10000) throw new Error('History is too large for this pilot. No partial persona was created.');
        } while (cursor);
      }
      const included = [...new Map(all.filter(e => e.include).map(e => [e.id, e])).values()];
      if (!included.length) throw new Error('No included journal entries yet. Save an entry and include it in AI reflections first.');
      if (included.length > 2000) throw new Error('This pilot supports up to 2,000 included entries per persona. No partial persona was created.');
      ids.current = included.map(e => e.id);
      const result = demo
        ? { portrait: sample, count: included.length, shortened: false, created: new Date().toISOString() }
        : (await api.post('/api/future-self/persona', { ids: ids.current })).data;
      setBuilt(result); setMessages([]); setStatus('Your reflective portrait is ready. You can disagree with it or rebuild it as your story changes.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not build your persona. Please retry.'); }
    finally { setBusy(''); }
  }
  async function send(text?: string, retry = false) {
    const value = (text || draft).trim();
    if (!built || busy || (!retry && !value)) return;
    const next = retry ? messages : [...messages, { role: 'user', content: value }];
    setMessages(next); setDraft(''); setBusy('chat'); setError('');
    try {
      const response = demo
        ? { text: 'Sample future-self reply: I’m a possible version of you, not a prediction. The small steps in this sample point toward making room for both effort and rest. Which one manageable action would you like to try today?' }
        : (await api.post('/api/future-self/chat', { ids: ids.current, messages: next })).data;
      setMessages([...next, { role: 'assistant', content: response.text }]);
    } catch { setError('Could not get a reply. Your message is kept below. Use Retry reply to try again.'); }
    finally { setBusy(''); }
  }
  async function generateAvatar() {
    if (!built) return;
    setBusy('avatar'); setError(''); setStatus('');
    try {
      if (demo) { setRemovedSample(false); setStatus('This is a fictional sample character. Sign in to generate an avatar inspired by your own included journals.'); }
      else {
        const r = await api.post('/api/future-self/avatar', { ids: ids.current, presentation, complexion });
        setAvatar(r.data.avatar); setStatus('Your private symbolic avatar is ready.');
      }
    } catch { setError('Avatar generation is unavailable. Your current avatar is unchanged. Please retry.'); }
    finally { setBusy(''); }
  }
  async function removeAvatar() {
    if (!confirm('Remove this avatar? You can generate a new one later.')) return;
    try {
      if (!demo) await api.delete('/api/future-self/avatar');
      setAvatar(null); setRemovedSample(true); setStatus('Avatar removed.');
    } catch { setError('Could not remove the avatar. Please retry.'); }
  }
  const image = avatar ? 'data:' + avatar.mimeType + ';base64,' + avatar.data : demo && !removedSample ? './resources/sample-future-avatar.png' : null;
  const lastReply = [...messages].reverse().find(m => m.role === 'assistant')?.content;
  return (
    <section className="future-studio">
      <div className="persona-banner">
        <span className="eyebrow">YOUR STORY. A NEW PERSPECTIVE.</span>
        <h1>A conversation with<br/><em>who you could become.</em></h1>
        <p>Meet a reflective version of you, inspired by the experiences you choose to share. Explore your patterns, see a symbolic self, and choose what comes next.</p>
      </div>
      <div className="persona-grid">
        <aside className="card persona-figure">
          <span className="tag">{demo ? 'Fictional sample avatar' : 'Your symbolic avatar'}</span>
          {image ? <img className="persona-avatar-image" src={image} alt={demo ? 'Fictional adult sample avatar holding a journal' : 'Generated fictional adult avatar inspired by your journal themes'}/> : <div className="persona-avatar-empty"><UserRound size={70}/><p>Your possible self starts with your story.</p></div>}
          <h2>{built?.portrait.title || 'A reflection, not a prediction.'}</h2>
          <p>The human-like figure is symbolic. It does not show your actual future appearance.</p>
          <div className="avatar-options">
            <label>Presentation<select value={presentation} onChange={e => setPresentation(e.target.value)} disabled={!!busy}><option value="gender-neutral">Gender-neutral</option><option value="masculine">Masculine</option><option value="feminine">Feminine</option></select></label>
            <label>Skin tone<select value={complexion} onChange={e => setComplexion(e.target.value)} disabled={!!busy}><option value="light">Light</option><option value="medium">Medium</option><option value="deep">Deep</option></select></label>
          </div>
          <button className="primary wide" disabled={!built || !!busy} onClick={generateAvatar}><Sparkles size={18}/>{busy === 'avatar' ? 'Creating your avatar…' : demo ? 'Explore sample avatar' : 'Generate my avatar'}</button>
          <small className="muted">Choose your appearance. Journal themes shape the setting and accessories. Generated images are saved privately to your account.</small>
          {image && <button className="text-button" disabled={!!busy} onClick={removeAvatar}><Trash2 size={17}/>Remove avatar</button>}
        </aside>
        <div className="persona-main">
          <section className="card">
            <span className="eyebrow purple">YOUR REFLECTIVE PERSONALITY PORTRAIT</span>
            <h2>Discover the threads in your story.</h2>
            <p>See tentative strengths, recurring patterns, and a focus for your next chapter. You decide what feels true.</p>
            <label className="check-label"><input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); if (!e.target.checked) { setBuilt(null); setMessages([]); ids.current = []; } }} disabled={!!busy}/>Use all my included journal entries for this portrait and future-self chat. Excluded entries stay out.</label>
            <button className="primary" disabled={!!busy} onClick={build}>{built ? <RefreshCw size={18}/> : <Sparkles size={18}/>} {busy === 'persona' ? 'Building your portrait…' : built ? 'Rebuild my persona' : 'Build my persona'}</button>
            <small className="muted">Reflective personality insights are interpretations, not a psychological assessment. This pilot supports up to 2,000 included entries; long text may be shortened. Portraits and conversations stay in this page session.</small>
            {status && <p role="status">{status}</p>}
            {error && <p role="alert" className="error-text">{error}</p>}
          </section>
          {built && <>
            <section className="card">
              <div className="section-top"><h2>{demo ? 'Sample portrait' : 'Your portrait'}</h2><span className="tag">{built.count} included entries</span></div>
              <p className="persona-introduction">{built.portrait.introduction}</p>
              {built.shortened && <p className="muted">Every selected entry is represented, but long text was shortened for processing.</p>}
              <h3>Strengths you may be practising</h3>
              {built.portrait.strengths.map((item, i) => <div className="persona-evidence" key={i}><h4>{item.label}</h4><p>{item.evidence}</p></div>)}
              <h3>Patterns worth exploring</h3>
              {built.portrait.patterns.map((item, i) => <div className="persona-evidence" key={i}><h4>{item.label}</h4><p>{item.evidence}</p></div>)}
              <div className="persona-focus"><h3>Your possible next focus</h3><p>{built.portrait.focus}</p></div>
              {built.portrait.nextSteps.map((step, i) => <div className="persona-action" key={i}><p>{step}</p><button className="secondary" onClick={() => { onStep(step); setStatus('Next step saved on this device and shown on Today.'); }}><Check size={16}/>Choose this step</button></div>)}
            </section>
            <section className="card persona-chat">
              <span className="eyebrow purple">A POSSIBLE FUTURE VOICE</span><h2>Talk it through with future you.</h2>
              <p>Your AI conversation draws on the included entries used to build this portrait. New entries need a rebuild. Each reply rechecks inclusion and deletion controls.</p>
              <div className="mode-row wrap">{['What should I focus on next?', 'What patterns can I change?', 'What strengths should I keep?'].map(q => <button className="chip" disabled={!!busy} key={q} onClick={() => send(q)}>{q}</button>)}</div>
              <div className="persona-chat-thread" aria-live="polite">{messages.length === 0 && <p>Ask a question about your goals, habits or next step.</p>}{messages.map((m, i) => <div className={'bubble ' + m.role} key={i}>{m.content}</div>)}</div>
              {busy === 'chat' && <p role="status">Reflecting on your story…</p>}
              <form className="composer" onSubmit={e => { e.preventDefault(); send(); }}><textarea aria-label="Message future self" maxLength={4000} placeholder="What would you like to ask your possible future self?" value={draft} onChange={e => setDraft(e.target.value)}/><button className="primary icon-button" type="submit" aria-label="Send to future self" disabled={!draft.trim() || !!busy}><Send size={20}/></button></form>
              {messages[messages.length - 1]?.role === 'user' && !busy && <button className="secondary" onClick={() => send(undefined, true)}>Retry reply</button>}
              {lastReply && <button className="text-button" onClick={() => { if (!('speechSynthesis' in window)) { setStatus('Read aloud is not supported in this browser.'); return; } window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(lastReply)); }}><Volume2 size={18}/>Read latest reply aloud</button>}
              <small className="muted">AI wellbeing reflection, not professional therapy. Your real-life choices remain yours.</small>
            </section>
          </>}
          {!built && <div className="persona-empty-note"><MessageCircle size={25}/><p>Build your portrait to unlock journal-based chat, suggested next steps, and your personalised avatar.</p><ArrowRight size={22}/></div>}
        </div>
      </div>
    </section>
  );
}
