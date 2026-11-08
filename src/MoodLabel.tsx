export const moodEmoji: Record<string, string> = {
  Difficult: '😞', Low: '😔', Okay: '😐', Good: '🙂', Great: '😄',
};
export function MoodLabel({ mood }: { mood: string }) {
  return <span className="journal-mood-label"><span role="img" aria-label={mood + ' mood'}>{moodEmoji[mood] || '📝'}</span><span>{mood}</span></span>;
}
