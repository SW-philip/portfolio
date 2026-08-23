// cousins/public/js/login.js
import { postLogin } from './api.js';

const CAST = [
  { slug: 'clementine', name: 'Clementine', color: '#87af87' },
  { slug: 'henry', name: 'Henry', color: '#c14f6a' },
  { slug: 'ivory', name: 'Ivory', color: '#afffff' },
  { slug: 'olivia', name: 'Olivia', color: '#d7afff' },
  { slug: 'theo', name: 'Theo', color: '#d75f00' },
  { slug: 'laine', name: 'Laine', color: '#5fafff' },
  { slug: 'wesley', name: 'Wesley', color: '#8787af' },
  { slug: 'elijah', name: 'Elijah', color: '#ffd787' },
];

let selectedSlug = null;
let pinDigits = '';
let isSubmitting = false;

function renderNames() {
  const grid = document.getElementById('name-grid');
  grid.innerHTML = '';
  for (const kid of CAST) {
    const btn = document.createElement('button');
    btn.className = 'name-tile';
    btn.style.borderColor = kid.color;
    btn.textContent = kid.name;
    btn.addEventListener('click', () => selectKid(kid));
    grid.appendChild(btn);
  }
}

function selectKid(kid) {
  selectedSlug = kid.slug;
  pinDigits = '';
  isSubmitting = false;
  document.getElementById('name-screen').hidden = true;
  document.getElementById('pin-screen').hidden = false;
  const label = document.getElementById('pin-name');
  label.textContent = kid.name;
  label.style.color = kid.color;
  document.getElementById('pin-error').hidden = true;
  renderPinDots();
}

function renderPinDots() {
  document.getElementById('pin-dots').textContent = '●'.repeat(pinDigits.length) + '○'.repeat(4 - pinDigits.length);
}

async function submitPin() {
  if (isSubmitting) {
    return;
  }
  isSubmitting = true;
  try {
    const result = await postLogin(selectedSlug, pinDigits);
    if (!result) {
      document.getElementById('pin-error').hidden = false;
      pinDigits = '';
      renderPinDots();
      return;
    }
    location.href = '/cousins/dashboard.html';
  } catch (error) {
    document.getElementById('pin-error').hidden = false;
    pinDigits = '';
    renderPinDots();
  } finally {
    isSubmitting = false;
  }
}

function renderPad() {
  const pad = document.getElementById('pin-pad');
  pad.innerHTML = '';
  for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '⏎']) {
    const btn = document.createElement('button');
    btn.className = 'pin-key';
    btn.textContent = key;
    btn.addEventListener('click', () => {
      if (isSubmitting) {
        return;
      }
      if (key === '⌫') {
        pinDigits = pinDigits.slice(0, -1);
      } else if (key === '⏎') {
        if (pinDigits.length === 4) submitPin();
        return;
      } else if (pinDigits.length < 4) {
        pinDigits += key;
      }
      document.getElementById('pin-error').hidden = true;
      renderPinDots();
      if (pinDigits.length === 4) submitPin();
    });
    pad.appendChild(btn);
  }
}

document.getElementById('back-to-names').addEventListener('click', () => {
  document.getElementById('pin-screen').hidden = true;
  document.getElementById('name-screen').hidden = false;
});

renderNames();
renderPad();
