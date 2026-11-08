import { useEffect, useState } from 'react';
import { ArrowRight, Check, Pause, Play, RotateCcw, Shuffle, SlidersHorizontal, Sparkles } from 'lucide-react';
export type Preferences = { tone: 'gentle' | 'playful' | 'direct'; palette: 'sunshine' | 'ocean' | 'rose'; motion: boolean };
const defaults: Preferences = { tone: 'gentle', palette: 'sunshine', motion: true };
export function readPreferences(): Preferences {
 try { const p = JSON.parse(localStorage.getItem('nextme-preferences') || '{}'); return { tone: ['gentle','playful','direct'].includes(p.tone) ? p.tone : defaults.tone, palette: ['sunshine','ocean','rose'].includes(p.palette) ? p.palette : defaults.palette, motion: typeof p.motion === 'boolean' ? p.motion : true }; } catch { return defaults; }
}
const prompts = {
 gentle: ['What would make today feel a little lighter?', 'What is one small thing you want to remember?', 'What do you need more of—and less of—today?'],
 playful: ['If today had a movie title, what would it be?', 'Give your day a weather forecast. Umbrella optional.', 'What tiny win deserves a ridiculously small trophy?'],
 direct: ['What happened, how did it feel, and what comes next?', 'What is taking most of your energy?', 'What is one thing within your control today?'],
};
export default function PersonalSpace({ mood, preferences, onPreferences, onStart }: {mood:string; preferences:Preferences; onPreferences:(p:Preferences)=>void; onStart:(prompt:string, mode:string)=>void}) {
 const [settings,setSettings]=useState(false);
 const [index,setIndex]=useState(0);
 const [need,setNeed]=useState('Reflect');
 const [remaining,setRemaining]=useState(60);
 const [running,setRunning]=useState(false);
 const [started,setStarted]=useState(false);
 useEffect(()=>{if(!running)return;const end=Date.now()+remaining*1000;const timer=window.setInterval(()=>{const left=Math.max(0,Math.ceil((end-Date.now())/1000));setRemaining(left);if(left===0)setRunning(false);},250);return()=>clearInterval(timer);},[running]);
 const low=mood==='Low'||mood==='Difficult';
 const prompt=need==='Unwind'?'What can you set down for a moment?':need==='Celebrate'?'What went well, even if it was small?':low&&preferences.tone==='playful'?'No need to make today sound cheerful. What has been weighing on you?':prompts[preferences.tone][index];
 return <section className="personal-space" aria-labelledby="personal-title">
  <div className="personal-heading"><div><p className="eyebrow">YOUR SPACE, YOUR PACE</p><h2 id="personal-title">{low?'Come as you are.':'A little more you.'}</h2><p>{low?'You can have a hard day here. No silver lining required.':'A small moment counts. Choose what feels useful.'}</p></div><button className="preference-toggle" aria-expanded={settings} onClick={()=>setSettings(!settings)}><SlidersHorizontal size={17}/>Make it mine</button></div>
  {settings&&<div className="preference-panel"><fieldset><legend>How should NextMe sound?</legend>{(['gentle','playful','direct'] as const).map(t=><button key={t} aria-pressed={preferences.tone===t} onClick={()=>onPreferences({...preferences,tone:t})}>{t==='gentle'?'🌱 Gentle':t==='playful'?'✨ Playful':'🎯 Straight to it'}</button>)}</fieldset><fieldset><legend>Pick your colours</legend>{(['sunshine','ocean','rose'] as const).map(p=><button key={p} aria-pressed={preferences.palette===p} onClick={()=>onPreferences({...preferences,palette:p})}>{p==='sunshine'?'☀️ Sunshine':p==='ocean'?'🌊 Ocean':'🌷 Rose'}</button>)}</fieldset><label><input type="checkbox" checked={!preferences.motion} onChange={e=>onPreferences({...preferences,motion:!e.target.checked})}/> Keep movement quiet</label><small>Saved in this browser. No journal text is stored with these preferences.</small></div>}
  <div className="personal-grid"><div className="prompt-card"><div className="need-options" role="group" aria-label="What do you need right now?">{['Reflect','Unwind','Celebrate'].map(n=><button key={n} aria-pressed={need===n} onClick={()=>setNeed(n)}>{n==='Reflect'?'💭':n==='Unwind'?'🍃':'🎉'} {n}</button>)}</div><p className="prompt-question" aria-live="polite">{prompt}</p><div className="prompt-actions"><button className="primary" onClick={()=>onStart(prompt,need==='Unwind'?'Just listen':'Help me reflect')}>Start with this<ArrowRight size={18}/></button><button className="text-button" disabled={need!=='Reflect'} onClick={()=>setIndex((index+1)%3)}><Shuffle size={16}/>Another idea</button></div><small>Opens a writing prompt. Nothing is sent until you choose Send.</small></div>
  <div className="reset-card"><span className={'reset-orb'+(running?' active':'')} aria-hidden="true"><Sparkles size={30}/></span><h3>{remaining===0?'A moment, just for you.':'The one-minute pause'}</h3><p>{remaining===0?'No score. No perfect way to do it. Notice how you feel.':'Let your shoulders soften. Notice something around you. Breathe at your own pace.'}</p><output aria-label={`${remaining} seconds remaining`}>{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</output><div className="reset-controls"><button onClick={()=>{if(remaining===0)setRemaining(60);setStarted(true);setRunning(!running);}}>{running?<Pause size={16}/>:remaining===0?<Check size={16}/>:<Play size={16}/>} {running?'Pause':remaining===0?'Again':started?'Continue':'Take a minute'}</button><button aria-label="Reset pause timer" onClick={()=>{setRunning(false);setStarted(false);setRemaining(60);}}><RotateCcw size={16}/></button></div><span className="sr-only" role="status">{started&&remaining===0?'Your one-minute pause is complete.':''}</span></div></div>
 </section>;
}
