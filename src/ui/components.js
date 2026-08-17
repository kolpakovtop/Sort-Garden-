import { icon } from './icons.js';
import { t } from '../core/i18n.js';
import * as Sound from '../core/audio.js';

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'onClick') node.addEventListener('click', value);
    else if (key === 'style') Object.assign(node.style, value);
    else if (key.startsWith('aria') || key === 'role' || key === 'type' || key === 'disabled' || key === 'id' || key === 'tabindex')
      node.setAttribute(key === 'tabindex' ? 'tabindex' : key, value === true ? '' : value);
    else if (key.startsWith('data')) node.setAttribute(key, value);
    else node[key] = value;
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function withTap(node, onClick, sound = 'tap') {
  if (!onClick) return node;
  node.addEventListener('click', (e) => {
    if (node.disabled) return;
    if (sound) Sound.play(sound);
    onClick(e);
  });
  return node;
}

export function Button({ label, sub, iconName, chip, variant = 'ghost', onClick, disabled, aria, wide = true, size, center = true, sound = 'tap', cls: extraCls }) {
  const cls = ['btn', `btn--${variant}`];
  if (extraCls) cls.push(extraCls);
  if (wide) cls.push('btn--wide');
  if (size === 'sm') cls.push('btn--sm');
  if (center) cls.push('btn--center');
  const btn = el('button', { class: cls.join(' '), type: 'button', disabled: !!disabled, 'aria-label': aria || label });
  if (chip) btn.appendChild(IconChip({ name: chip.name || iconName, tone: chip.tone, size: chip.size }));
  else if (iconName) btn.appendChild(el('span', { class: 'icon', html: icon(iconName) }));
  const body = el('span', { class: 'btn__body' }, [el('span', { text: label })]);
  if (sub) body.appendChild(el('span', { class: 'btn__sub', text: sub }));
  btn.appendChild(body);
  return withTap(btn, onClick, sound);
}

export function IconChip({ name, tone = 'green', size = 'md' }) {
  return el('span', {
    class: `iconchip iconchip--${tone}${size !== 'md' ? ' iconchip--' + size : ''}`,
    html: `<span class="icon">${icon(name)}</span>`
  });
}

export function IconButton({ name, onClick, aria, variant = 'icon', disabled }) {
  const btn = el('button', {
    class: `btn btn--${variant === 'plain' ? 'plain' : 'icon'}${variant === 'plain' ? ' btn--icon' : ''}`,
    type: 'button',
    'aria-label': aria,
    disabled: !!disabled,
    html: `<span class="icon">${icon(name)}</span>`
  });
  return withTap(btn, onClick);
}

export function RewardButton({ label, sub, onClick, disabled, iconName = 'reward' }) {
  return Button({ label, sub, iconName, variant: 'reward', onClick, disabled, center: false });
}

export function Chip({ iconName, value, cls = '' }) {
  return el('span', { class: `chip ${cls}`.trim() }, [
    iconName ? el('span', { class: 'icon', html: icon(iconName) }) : null,
    el('span', { text: String(value) })
  ]);
}

export function Card(children, cls = '') {
  return el('div', { class: `card ${cls}`.trim() }, children);
}

export function Toggle({ label, iconName, checked, onChange }) {
  const btn = el('button', {
    class: 'btn btn--ghost btn--wide',
    type: 'button',
    role: 'switch',
    'aria-checked': checked ? 'true' : 'false'
  }, [
    el('span', { class: 'icon', html: icon(iconName) }),
    el('span', { class: 'grow', text: label, style: { textAlign: 'left' } }),
    el('span', { class: 'badge' + (checked ? ' badge--accent' : ''), html: checked ? `<span class="icon" style="width:14px;height:14px">${icon('check')}</span>` : '' })
  ]);
  return withTap(btn, () => onChange(!checked));
}

export function TopBar({ left, title, right }) {
  return el('div', { class: 'topbar' }, [
    left || el('span', { style: { width: '56px' } }),
    el('div', { class: 'grow topbar__title truncate', text: title || '' }),
    right || el('span', { style: { width: '56px' } })
  ]);
}

export function BackBar(title, onBack, right) {
  return TopBar({
    left: IconButton({ name: 'back', onClick: onBack, aria: t('button.back') }),
    title,
    right
  });
}

/* ---------------- modal ---------------- */

let modalCount = 0;

export function openModalsCount() {
  return modalCount;
}

export function Modal({ title, text, content, actions = [], onClose, dismissable = true }) {
  const host = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || '' });
  const box = el('div', { class: 'modal__box' });
  modalCount += 1;

  const close = () => {
    if (!host.isConnected) return;
    host.remove();
    modalCount = Math.max(0, modalCount - 1);
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose();
  };

  function onKey(e) {
    if (e.key === 'Escape' && dismissable) close();
  }

  if (title) {
    box.appendChild(el('div', { class: 'row row--between' }, [
      el('h2', { class: 'grow', text: title }),
      dismissable ? IconButton({ name: 'close', onClick: close, aria: t('button.close') }) : null
    ]));
  }
  if (text) box.appendChild(el('p', { text }));
  if (content) box.appendChild(content);

  for (const action of actions) {
    if (!action) continue;
    const btn = action instanceof HTMLElement
      ? action
      : Button({ ...action, onClick: () => { if (action.keepOpen !== true) close(); if (action.onClick) action.onClick(); } });
    box.appendChild(btn);
  }

  host.appendChild(box);
  if (dismissable) {
    host.addEventListener('click', (e) => { if (e.target === host) close(); });
  }
  document.addEventListener('keydown', onKey);
  document.body.appendChild(host);
  Sound.play('open');

  const focusable = box.querySelector('button');
  if (focusable) focusable.focus({ preventScroll: true });

  return { close, box, host };
}

export function confirmModal({ title, text, onYes }) {
  return Modal({
    title,
    text,
    actions: [
      { label: t('button.yes'), variant: 'danger', onClick: onYes },
      { label: t('button.no'), variant: 'ghost' }
    ]
  });
}

/* ---------------- toast ---------------- */

let toastHost = null;

export function toast(message, ms = 1900) {
  if (!toastHost) {
    toastHost = el('div', { class: 'toast-host' });
    document.body.appendChild(toastHost);
  }
  const node = el('div', { class: 'toast', role: 'status', text: message });
  toastHost.appendChild(node);
  setTimeout(() => {
    node.classList.add('toast--out');
    setTimeout(() => node.remove(), 220);
  }, ms);
  return node;
}
