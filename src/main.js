// Entry point. Order matters: the UI module defines the globals the markup
// calls, the bridge replaces the timing-related ones with the shared autopilot,
// and only then does the app boot.
import './ui/styles.css';
import brand from './brand/active.json';
import { S, showOnboarding } from './ui/app.js';
import './ui/bridge.js';

applyBrand(brand);

document.getElementById('app').classList.toggle('dark', S.dark);
showOnboarding();

function applyBrand(b) {
  const root = document.documentElement;
  const c = b.colors;

  root.style.setProperty('--navy', c.navy);
  root.style.setProperty('--navy2', c.navy2);
  root.style.setProperty('--yellow', c.yellow);
  root.style.setProperty('--yellow2', c.yellow2);

  const app = document.getElementById('app');
  const light = { '--bg': c.bg, '--card': c.card, '--text': c.text, '--muted': c.muted, '--border': c.border };
  const dark = { '--bg': c.darkBg, '--card': c.darkCard, '--text': c.darkText, '--muted': c.darkMuted, '--border': c.darkBorder };

  const paint = () => {
    const vars = app.classList.contains('dark') ? dark : light;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  };
  paint();
  new MutationObserver(paint).observe(app, { attributes: true, attributeFilter: ['class'] });

  document.title = b.name;
  document.documentElement.lang = b.lang;
  document.querySelectorAll('[data-brand-name]').forEach(el => { el.textContent = b.name; });
}
