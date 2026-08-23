// cousins/public/js/story.js
import { getStoryState } from './api.js';
import { createPlayer } from './engine.js';

async function main() {
  const storyId = 'shorestorm';
  const story = await (await fetch(`/cousins/stories/${storyId}.json`)).json();
  const stateResult = await getStoryState(storyId);
  const knownState = (stateResult && stateResult.state) || {};

  const picker = document.getElementById('chapter-picker');
  const list = document.getElementById('chapter-list');
  const beats = document.getElementById('beats');

  const params = new URLSearchParams(location.search);
  const chapterNumber = Number(params.get('chapter') || '0');
  const chapterData = story.chapters.find(c => c.number === chapterNumber);

  if (chapterData) {
    picker.hidden = true;
    beats.hidden = false;
    document.title = `${story.title} — Story Mode — Chapter ${chapterNumber}`;
    const player = createPlayer(beats, story.cast, { knownState });
    await player.playBeats(chapterData.beats);
    beats.innerHTML = '';
    const done = document.createElement('div');
    done.className = 'chapter-complete';
    done.innerHTML = `<p>Chapter ${chapterNumber} complete.</p><a href="/cousins/story.html">&larr; pick another chapter</a>`;
    beats.appendChild(done);
    return;
  }

  list.innerHTML = '';
  for (const chapter of story.chapters) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `/cousins/story.html?chapter=${chapter.number}`;
    link.textContent = `▶ Chapter ${chapter.number}: ${chapter.title}`;
    item.appendChild(link);
    list.appendChild(item);
  }
}

main();
