#!/usr/bin/env node
/**
 * Проверяет материалы для консоли Яндекс Игр: длины текстов и размеры картинок.
 *
 * Форма считает символы и молча отказывается сохранять длинное поле, а
 * скриншот на пиксель мимо ориентации отваливается при загрузке — глазами ни
 * то, ни другое не ловится.
 *
 *   node store-check.mjs [папка-со-материалами]   # по умолчанию ./store
 *
 * Ждёт разметку, где у каждого поля в заголовке указан лимит, а текст лежит в
 * блоке кода сразу под ним:
 *
 *   ### Название (лимит 50)
 *
 *   ```
 *   Название игры
 *   ```
 *
 * Картинки распознаёт по имени файла:
 *   icon*.png            → 512×512
 *   cover*.png           → 800×470
 *   *mobile*.png         → 1080×1920 (портрет)
 *   всё остальное в screenshots/ → 1920×1080 (альбом)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const STORE = process.argv[2] ?? 'store';
const DOC = join(STORE, 'yandex.md');

let failures = 0;
const report = (ok, label, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(34)} ${detail}`);
};

/* --- Тексты -------------------------------------------------------- */

if (!existsSync(DOC)) {
  console.error(`Нет ${DOC} — положите туда тексты формы блоками с лимитами.`);
  process.exit(1);
}

const doc = readFileSync(DOC, 'utf8');
const field = /^#{2,4}\s+(.+?)\s+\((?:лимит|limit)\s+(\d+)\)\s*$\n+```\n([\s\S]*?)\n```/gm;

let match;
let fields = 0;
while ((match = field.exec(doc)) !== null) {
  const [, name, limit, body] = match;
  const text = body.trim();
  fields++;
  report(text.length <= Number(limit), name, `${text.length}/${limit}`);
}

if (fields === 0) {
  report(false, 'разметка полей', `в ${DOC} не найдено ни одного блока с лимитом`);
}

/* --- Название совпадает с игрой (§5.1.3) ---------------------------
 * Модерация сверяет поле «Название» с заголовком в самой игре и находит
 * расхождение по картинке — глазами оно не ловится, потому что поля формы,
 * локали кода и обложки никогда не открыты рядом. Проверяем механически:
 * значение из каждой языковой вкладки должно быть тем же, что и app.title
 * в src/core/i18n.js для этого языка. */

const I18N = 'src/core/i18n.js';
if (existsSync(I18N)) {
  const code = readFileSync(I18N, 'utf8');
  const titleOf = (locale) => {
    const block = code.match(new RegExp(`const ${locale} = \\{([\\s\\S]*?)\\n\\};`));
    const line = block && block[1].match(/'app\.title':\s*'([^']*)'/);
    return line ? line[1] : null;
  };
  const SECTIONS = [
    ['## Русский', 'ru'],
    ['## English', 'en']
  ];
  for (const [heading, locale] of SECTIONS) {
    const start = doc.indexOf(`${heading}\n`);
    if (start === -1) continue;
    const end = doc.indexOf('\n## ', start + heading.length);
    const section = doc.slice(start, end === -1 ? undefined : end);
    const nameField = section.match(/^#{2,4}\s+(?:Название|Name)\s+\(.*?\)\s*$\n+```\n([\s\S]*?)\n```/m);
    const formTitle = nameField ? nameField[1].trim() : null;
    const gameTitle = titleOf(locale);
    report(
      !!formTitle && !!gameTitle && formTitle === gameTitle,
      `§5.1.3 название (${locale})`,
      `форма «${formTitle}» ${formTitle === gameTitle ? '=' : '≠'} игра «${gameTitle}»`
    );
  }
} else {
  report(false, '§5.1.3 название', `${I18N} не найден`);
}

/* --- Картинки ------------------------------------------------------ */

/** Ширина и высота PNG — два больших слова начиная с 16-го байта. */
function pngSize(path) {
  const head = readFileSync(path).subarray(0, 24);
  if (head.toString('latin1', 1, 4) !== 'PNG') return null;
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

function expectedFor(name) {
  const file = basename(name).toLowerCase();
  if (file.startsWith('icon')) return [512, 512];
  if (file.startsWith('cover')) return [800, 470];
  if (file.includes('mobile') || file.includes('portrait')) return [1080, 1920];
  return [1920, 1080];
}

function checkImages(dir, label) {
  if (!existsSync(dir)) {
    report(false, label, `нет папки ${dir}`);
    return;
  }
  const files = readdirSync(dir).filter((name) => name.endsWith('.png')).sort();
  if (files.length === 0) report(false, label, `в ${dir} нет PNG`);
  for (const name of files) {
    const [w, h] = expectedFor(name);
    const size = pngSize(join(dir, name));
    report(
      Boolean(size) && size.width === w && size.height === h,
      name,
      `${size?.width}×${size?.height} (нужно ${w}×${h})`,
    );
  }
}

console.log('');
checkImages(STORE, 'иконка и обложки');
checkImages(join(STORE, 'screenshots'), 'скриншоты');

console.log(failures === 0 ? '\nМАТЕРИАЛЫ В ПОРЯДКЕ' : `\nпроблем: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
