import { ArrowRight, BookOpen, CalendarDays, Cloud, Frown, Heart, Laugh, Meh, MessageCircle, Smile, Sparkles, Sun } from 'lucide-react';

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
function dayKey(date: Date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
export default function SunshineHome(p: Props) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (today.getDay() + 6) % 7);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
  return (
    <>
      <section className="sun-hero">
        <div className="sun-intro">
          <p className="eyebrow">{today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</p>
          <h1>A little check-in.<br/><span className="coral-word">A brighter</span> <span className="blue-word">perspective.</span></h1>
          <p className="sun-subtitle">However life feels today, there’s room for it here.<br/>Take a moment to check in, {p.name === 'friend' ? 'or chat about your day' : p.name}.</p>
          <div className="sun-checkin">
            <div className="section-top"><h2>HOW IS LIFE FEELING TODAY?</h2><span className="tag">A moment for you</span></div>
            <div className="sun-moods">
              {choices.map(({ name, Icon, color }) => (
                <button key={name} aria-label={name} aria-pressed={p.mood === name} className={'sun-mood ' + color + (p.mood === name ? ' is-selected' : '')} onClick={() => p.onMood(name)}>
                  <span className="sun-face"><Icon size={56} strokeWidth={1.65}/></span>
                  <span>{name}</span>
                </button>
              ))}
            </div>
            <button className="primary wide" onClick={p.onChat}><MessageCircle size={22}/>Let’s talk about it<ArrowRight size={22}/></button>
            <button className="text-button sun-guide" onClick={p.onGuide}><Heart size={16}/>Open my daily wellbeing guide<ArrowRight size={15}/></button>
          </div>
        </div>
        <div className="sun-illustration">
          <p className="sun-handwritten">Same you.<br/>Brighter tomorrows.</p>
          <img src="./resources/sunshine-hero.png" alt="A cheerful sunshine character with plants, books and a warm drink" />
        </div>
      </section>
      <div className="sun-support-grid">
        <section className="sun-week">
          <div className="section-top"><p className="eyebrow">YOUR WEEKLY JOURNAL {p.demo ? '· SAMPLE' : ''}</p><button className="text-button" onClick={p.onJournal}>Read my weekly summary<ArrowRight size={17}/></button></div>
          <h2>A look back at your week.</h2>
          <p>Moments, thoughts and feelings—all part of your story.</p>
          <div className="sun-week-days">
            {days.map(day => {
              const entry = p.entries.find(e => dayKey(new Date(e.created)) === dayKey(day));
              const isToday = dayKey(day) === dayKey(today);
              const future = day > today;
              const Icon = entry ? (entry.mood === 'Difficult' || entry.mood === 'Low' ? Cloud : entry.mood === 'Great' ? Heart : Sun) : isToday ? Sun : CalendarDays;
              return (
                <button key={dayKey(day)} className={'sun-day' + (isToday ? ' today' : '') + (entry ? ' has-entry' : '')} onClick={() => entry ? p.onEntry(entry) : p.onChat()} aria-label={day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) + (entry ? ': open entry' : ': write a reflection')}>
                  <span className="sun-day-date">{day.toLocaleDateString(undefined, { weekday: 'short' })}<br/>{day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                  <Icon size={29} strokeWidth={1.8}/>
                  <span className="sun-day-copy">{entry ? (moodEmoji[entry.mood] || '📝') + ' ' + entry.mood + ' moment' : isToday ? 'Today. Let’s check in.' : future ? 'A new day ahead.' : 'A page to write.'}</span>
                </button>
              );
            })}
          </div>
          <button className="text-button" disabled={p.busy} onClick={p.onReflection} style={{ marginTop: 12 }}>Read my reflection<ArrowRight size={15}/></button>
          <small className="muted">{p.demo ? 'Sample journal entries. ' : ''}This view shows loaded journal entries. Open Journal for more pages and monthly summaries.</small>
        </section>
        <section className="sun-birthday">
          <p className="eyebrow">A LETTER FROM TOMORROW</p>
          <img className="sun-letter-art" src="./resources/birthday-letter.png" alt="" />
          <h2>Your next chapter<br/>is <span>still yours</span><br/>to write.</h2>
          <p>One birthday. One minute.<br/>A new way to see your next chapter.</p>
          <button className="text-button" onClick={p.onFuture}>Explore the birthday experience<ArrowRight size={17}/></button>
          <small>A possibility, never a prediction.</small>
        </section>
      </div>
      <div className="sun-bottom-actions">
        <button onClick={p.onReminders}><CalendarDays size={23}/><span>Your check-in rhythm<small>Weekly or monthly. Make it yours.</small></span><ArrowRight size={18}/></button>
        <button onClick={p.onJournal}><BookOpen size={23}/><span>Your journal, in perspective<small>Weekly & monthly summaries</small></span><ArrowRight size={18}/></button>
        <button onClick={p.onFuture}><Sparkles size={23}/><span>{p.step || 'One small step forward'}<small>{p.step ? 'Your chosen next step' : 'Choose something kind for yourself.'}</small></span><ArrowRight size={18}/></button>
      </div>
    </>
  );
}
