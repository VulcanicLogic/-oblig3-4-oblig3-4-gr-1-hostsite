function initSootEasterEgg() {
  const sprites = document.querySelectorAll('.soot-sprite');
  sprites.forEach((sprite) => {
    sprite.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerSootExplosion(sprite, e);
    });
  });
}

function triggerSootExplosion(sprite, clickEvent) {
  if (sprite.classList.contains('soot-exploding')) return;
  const clickX = clickEvent.clientX;
  const clickY = clickEvent.clientY;

  sprite.classList.add('soot-exploding');
  sprite.style.animation = 'sootDisintegrate 1100ms ease-out forwards';

  const particles = 22 + Math.floor(Math.random() * 16);
  for (let i = 0; i < particles; i++) createParticle(clickX, clickY);

  setTimeout(() => {
    sprite.classList.add('soot-hidden');
    sprite.classList.remove('soot-exploding');
    sprite.style.animation = '';
  }, 1100);
}

function createParticle(x, y) {
  const p = document.createElement('div');
  p.className = 'soot-particle';
  const size = 4 + Math.random() * 4;
  p.style.width = size + 'px';
  p.style.height = size + 'px';

  const angle = Math.random() * Math.PI * 2;
  const dist = 40 + Math.random() * 120;
  const upwardBias = -20 + -Math.random() * 60;
  const tx = Math.round(Math.cos(angle) * dist) + 'px';
  const ty = Math.round(Math.sin(angle) * dist + upwardBias) + 'px';
  const rot = Math.round((Math.random() - 0.5) * 720) + 'deg';

  p.style.left = x - size / 2 + 'px';
  p.style.top = y - size / 2 + 'px';
  p.style.setProperty('--tx', tx);
  p.style.setProperty('--ty', ty);
  p.style.setProperty('--r', rot);
  document.body.appendChild(p);

  setTimeout(() => p.remove(), 1450);
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initSootEasterEgg, 200));
