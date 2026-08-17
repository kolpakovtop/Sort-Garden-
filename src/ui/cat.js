// Cat mascot: a single SVG, tail attached to the body and fully inside the viewBox.

const VARIANTS = {
  default: { body: '#E8A96B', belly: '#F6D4AE', ear: '#C8834C', line: '#33302B' },
  ginger:  { body: '#E89A5D', belly: '#F6D4AE', ear: '#C2743A', line: '#33302B' },
  luna:    { body: '#8F8DB6', belly: '#DAD9EC', ear: '#6D6B99', line: '#2E2C3A' },
  moma:    { body: '#5C574F', belly: '#A79E90', ear: '#413D37', line: '#2A2823' }
};

export function catMascot({ variant = 'default', size = 'md', mood = 'idle' } = {}) {
  const c = VARIANTS[variant] || VARIANTS.default;
  const wrap = document.createElement('div');
  wrap.className = `cat cat--${size} cat--${mood}`;
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `
<svg viewBox="0 0 96 96" focusable="false">
  <ellipse class="cat__shadow" cx="48" cy="88" rx="27" ry="4" fill="rgba(51,48,43,.13)"/>

  <!-- tail grows out of the body's right hip and curls back inside the frame -->
  <path class="cat__tail" fill="none" stroke="${c.body}" stroke-width="7" stroke-linecap="round"
        d="M69 78 C 82 76 87 64 82 55 C 79 49 73 48 71 52"/>

  <g class="cat__breath">
    <path class="cat__body" fill="${c.body}"
          d="M24 66 C 24 47 34 39 48 39 C 62 39 72 47 72 66 C 72 80 62 86 48 86 C 34 86 24 80 24 66 Z"/>
    <path class="cat__belly" fill="${c.belly}"
          d="M36 70 C 36 60 41 56 48 56 C 55 56 60 60 60 70 C 60 78 55 82 48 82 C 41 82 36 78 36 70 Z"/>
    <path class="cat__paw" fill="${c.belly}" d="M34 82 h9 a4.5 4.5 0 0 1 0 5 h-9 a2.5 2.5 0 0 1 0-5 Z"/>
    <path class="cat__paw" fill="${c.belly}" d="M53 82 h9 a2.5 2.5 0 0 1 0 5 h-9 a4.5 4.5 0 0 1 0-5 Z"/>

    <path class="cat__ear" fill="${c.ear}" d="M30 26 L27 11 L42 20 Z"/>
    <path class="cat__ear" fill="${c.ear}" d="M66 26 L69 11 L54 20 Z"/>
    <circle class="cat__head" cx="48" cy="32" r="20" fill="${c.body}"/>

    <g class="cat__face">
      <ellipse class="cat__eye" cx="41" cy="32" rx="2.3" ry="3" fill="${c.line}"/>
      <ellipse class="cat__eye" cx="55" cy="32" rx="2.3" ry="3" fill="${c.line}"/>
      <circle cx="41.7" cy="30.8" r="0.8" fill="#FFFDF8"/>
      <circle cx="55.7" cy="30.8" r="0.8" fill="#FFFDF8"/>
      <path d="M48 37 v2" stroke="${c.line}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
      <path d="M44.5 40 Q 48 42.5 51.5 40" stroke="${c.line}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
      <circle cx="35" cy="37" r="2.6" fill="#D98BB6" opacity=".38"/>
      <circle cx="61" cy="37" r="2.6" fill="#D98BB6" opacity=".38"/>
    </g>
  </g>
</svg>`;
  return wrap;
}
