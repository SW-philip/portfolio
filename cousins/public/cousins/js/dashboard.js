// cousins/public/js/dashboard.js
import { getMe, postLogout } from './api.js';

function readPower(story, me) {
  const cast = story.cast.find(c => c.accountSlug === me.slug);
  if (!cast) return null;
  if (cast.powerStateKey) return me.state[cast.powerStateKey] || null;
  if (cast.revealChapter && me.chaptersCompleted.includes(cast.revealChapter)) return cast.revealedPower;
  return null;
}

async function main() {
  const me = await getMe('shorestorm');
  if (!me) {
    location.href = '/cousins/';
    return;
  }

  const greeting = document.getElementById('greeting');
  greeting.textContent = `Hi, ${me.name}.`;
  greeting.style.color = me.color;

  const story = await (await fetch('/cousins/stories/shorestorm.json')).json();

  const cast = story.cast.find(c => c.accountSlug === me.slug);
  document.getElementById('role').textContent = cast ? cast.role : '';

  const power = readPower(story, me);
  document.getElementById('power').textContent = power ? `Power: ${power}` : 'Power: not discovered yet';

  const list = document.getElementById('chapter-list');
  list.innerHTML = '';
  for (const chapter of story.chapters) {
    const item = document.createElement('li');
    const done = me.chaptersCompleted.includes(chapter.number);
    const unlocked = chapter.number === 1 || me.chaptersCompleted.includes(chapter.number - 1);
    if (done) {
      item.textContent = `✓ Chapter ${chapter.number}: ${chapter.title}`;
    } else if (unlocked) {
      const link = document.createElement('a');
      link.href = `/cousins/play.html?story=shorestorm&chapter=${chapter.number}`;
      link.textContent = `▶ Chapter ${chapter.number}: ${chapter.title}`;
      item.appendChild(link);
    } else {
      item.textContent = `🔒 Chapter ${chapter.number}: ${chapter.title}`;
      item.className = 'locked';
    }
    list.appendChild(item);
  }

  document.getElementById('logout').addEventListener('click', async () => {
    await postLogout();
    location.href = '/cousins/';
  });
}

main();
