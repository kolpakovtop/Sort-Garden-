import { state, persist } from './state.js';

let root = null;
let screens = {};
let currentName = null;
let currentParams = {};
const timers = new Set();
let leaveHooks = [];

export function initRouter(rootEl, map) {
  root = rootEl;
  screens = map;
}

function clearAll() {
  timers.forEach((id) => { clearTimeout(id); clearInterval(id); });
  timers.clear();
  leaveHooks.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
  leaveHooks = [];
}

export function go(name, params = {}) {
  const render = screens[name];
  if (!render) return;
  clearAll();
  currentName = name;
  currentParams = params;
  state.screen = name;
  persist();
  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(render(params));
  root.replaceChildren(shell);
  if (typeof window !== 'undefined') window.scrollTo(0, 0);
}

export function rerender() {
  if (currentName) go(currentName, currentParams);
}

export function current() {
  return currentName;
}

export function later(fn, ms) {
  const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
  timers.add(id);
  return id;
}

export function every(fn, ms) {
  const id = setInterval(fn, ms);
  timers.add(id);
  return id;
}

export function cancel(id) {
  clearTimeout(id);
  clearInterval(id);
  timers.delete(id);
}

export function onLeave(fn) {
  leaveHooks.push(fn);
}
