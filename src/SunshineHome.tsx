import { ArrowRight, Frown, Laugh, Meh, Smile } from 'lucide-react';

import { moodEmoji } from './MoodLabel';

type Entry = { id: string; text: string; mood: string; include: boolean; created: string };
type Props = {
  mood: string;
  onMood: (mood: string) => void;
  entries: Entry[];
  demo: boolean;
  name: string;
  step: string;
  onChat: () => void;
  onGuide: () => void;
  onJournal: () => void;
  onReflection: () => void;
  busy: boolean;
  onFuture: () => void;
  onReminders: () => void;
  onEntry: (entry: Entry) => void;
};
const choices = [
  { name: 'Difficult', Icon: Frown, color: 'lilac' },
  { name: 'Low', Icon: Meh, color: 'coral' },
  { name: 'Okay', Icon: Smile, color: 'yellow' },
  { name: 'Good', Icon: Smile, color: 'green' },
  { name: 'Great', Icon: Laugh, color: 'blue' },
];
export default function SunshineHome(p: Props) {
 const today = new Date();
 return <div className="journal-home">
  <section className="journal-welcome"><div><p className="eyebrow">{today.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})} · YOUR DAILY JOURNAL</p><h1>Life happens.<br/><em>Let it out here.</em> 🌱</h1><p>A little space for your everyday stories, big feelings, small wins, and fresh starts. Welcome, {p.name}.</p><button className="primary" onClick={p.onChat}>✍️ Write today’s page <ArrowRight size={18}/></button><span className="journal-private">🔒 Your words. Your space. Your pace.</span></div><div className="journal-paper" aria-hidden="true"><span>dear journal,</span><p>Today wasn’t perfect.<br/>But there were little<br/>things worth keeping.</p><b>and that’s enough. ☀️</b><i>♡</i></div></section>
  <section className="journal-mood card"><div><h2>How are you arriving today?</h2><p>Every feeling is welcome.</p></div><div className="journal-mood-options">{choices.map(({name})=><button key={name} aria-pressed={p.mood===name} onClick={()=>p.onMood(name)} className={p.mood===name?'selected':''}><span>{moodEmoji[name]}</span>{name}</button>)}</div></section>
  <div className="journal-two"><section className="card journal-talk"><span className="journal-kicker">💬 A JOURNAL THAT LISTENS</span><h2>You don’t have to<br/>figure it all out alone.</h2><p>Share what happened. Your AI journal companion can help you untangle a thought, celebrate a win, or find a gentle way forward.</p><button className="secondary" onClick={p.onGuide}>Talk it through <ArrowRight size={16}/></button><small>AI uses your messages and entries you choose to include.</small></section><section className="card journal-birthday"><span className="journal-kicker">🎂 A LITTLE SOMETHING FOR FUTURE YOU</span><h2>One birthday.<br/>One meaningful minute.</h2><p>Your journal helps shape a conversation with a possible future self. A warm glimpse of what could be, grounded in the life you’re writing.</p><button className="secondary" onClick={p.onFuture}>My birthday moment <ArrowRight size={16}/></button><small>A possibility, never a prediction.</small></section></div>
  <section className="journal-recent"><div className="section-heading"><h2>Your recent pages {p.demo?'· sample':''}</h2><button className="text-button" onClick={p.onJournal}>All my entries <ArrowRight size={16}/></button></div>{p.entries.length?<div className="journal-two">{[...p.entries].sort((a,b)=>b.created.localeCompare(a.created)).slice(0,2).map(entry=><button className="card journal-preview" key={entry.id} onClick={()=>p.onEntry(entry)}><span>{moodEmoji[entry.mood]} {new Date(entry.created).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span><p>{entry.text.slice(0,180)}{entry.text.length>180?'…':''}</p><small>Open this page ↗</small></button>)}</div>:<div className="card"><p>📖 Your first page is waiting. A sentence is enough.</p><button className="text-button" onClick={p.onChat}>Start my journal →</button></div>}</section>
 </div>;
}
