// cousins/public/js/play.js
import { getMe, postProgress } from './api.js';
import { createPlayer } from './engine.js';

async function main() {
  const params = new URLSearchParams(location.search);
  const storyId = params.get('story') || 'shorestorm';
  const chapter = Number(params.get('chapter') || '1');

  const me = await getMe(storyId);
  if (!me) {
    location.href = '/cousins/';
    return;
  }
  const unlocked = chapter <= 3 || me.chaptersCompleted.includes(chapter - 1);
  if (!unlocked) {
    location.href = '/cousins/dashboard.html';
    return;
  }

  const story = await (await fetch(`/cousins/stories/${storyId}.json`)).json();
  const chapterData = story.chapters.find(c => c.number === chapter);

  const storyMode = me.chaptersCompleted.includes(chapter);
  document.title = `${story.title} — Chapter ${chapter}${storyMode ? ' (replay)' : ''}`;
  const container = document.getElementById('beats');
  const player = createPlayer(container, story.cast, { storyMode, knownState: me.state });
  const effects = await player.playBeats(chapterData.beats);

  if (!storyMode) {
    await postProgress({ storyId, chapter, effects });
  }

  container.innerHTML = '';
  const done = document.createElement('div');
  done.className = 'chapter-complete';
  done.innerHTML = `<p>Chapter ${chapter} complete.</p><a href="/cousins/dashboard.html">Back to dashboard</a>`;
  container.appendChild(done);
}

main();
