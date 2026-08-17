// Cat mascot. Sizing is controlled by CSS. `size` maps to a preset class.

const VARIANTS = {
  default: { body: '#E8A96B', belly: '#F4CBA1', ears: '#C88854' },
  ginger:  { body: '#E89A5D', belly: '#F4CBA1', ears: '#C97A3E' },
  luna:    { body: '#8A88B1', belly: '#D6D5E7', ears: '#6B6996' },
  moma:    { body: '#33302B', belly: '#7A7367', ears: '#33302B' }
};

export function catMascot({ variant = 'default', size = 'md', mood = 'idle' } = {}) {
  const c = VARIANTS[variant] || VARIANTS.default;
  const wrap = document.createElement('div');
  wrap.className = `cat cat--${size} cat--${mood}`;
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `
<svg viewBox="0 0 120 100" preserveAspectRatio="xMidYMax meet" focusable="false">
  <g class="cat__tail" fill="none" stroke="${c.body}" stroke-width="8" stroke-linecap="round">
    <path d="M92 66 C 108 56 106 40 100 32"/>
  </g>
  <ellipse class="cat__shadow" cx="60" cy="94" rx="34" ry="4" fill="rgba(51,48,43,0.14)"/>
  <path class="cat__body" fill="${c.body}" d="M28 70 Q 28 46 60 46 Q 92 46 92 70 Q 92 92 60 92 Q 28 92 28 70 Z"/>
  <path class="cat__belly" fill="${c.belly}" d="M40 74 Q 40 62 60 62 Q 80 62 80 74 Q 80 88 60 88 Q 40 88 40 74 Z"/>
  <circle class="cat__head" cx="60" cy="40" r="24" fill="${c.body}"/>
  <path class="cat__ear cat__ear--l" fill="${c.body}" d="M40 22 L 34 6 L 52 18 Z"/>
  <path class="cat__ear cat__ear--r" fill="${c.body}" d="M80 22 L 86 6 L 68 18 Z"/>
  <path fill="${c.ears}" d="M42 18 L 40 10 L 48 18 Z"/>
  <path fill="${c.ears}" d="M78 18 L 80 10 L 72 18 Z"/>
  <g class="cat__face" fill="var(--text)">
    <ellipse class="cat__eye cat__eye--l" cx="51" cy="42" rx="2" ry="2.6"/>
    <ellipse class="cat__eye cat__eye--r" cx="69" cy="42" rx="2" ry="2.6"/>
    <circle cx="51" cy="41.2" r="0.7" fill="#FFFDF8"/>
    <circle cx="69" cy="41.2" r="0.7" fill="#FFFDF8"/>
    <path d="M57 49 Q 60 51 63 49" stroke="var(--text)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M60 47 L 60 49" stroke="var(--text)" stroke-width="1.2" stroke-linecap="round"/>
  </g>
  <g class="cat__cheeks" opacity="0.4">
    <circle cx="46" cy="47" r="2.6" fill="#D98BB6"/>
    <circle cx="74" cy="47" r="2.6" fill="#D98BB6"/>
  </g>
</svg>`;
  return wrap;
}
