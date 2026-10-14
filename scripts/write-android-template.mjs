import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = new URL('../android-template/', import.meta.url);
const files = {};
async function walk(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory()) await walk(path.join(directory, entry.name), `${name}/`);
    else if (entry.name.endsWith('.jar')) files[name] = { base64: (await readFile(path.join(directory, entry.name))).toString('base64') };
    else files[name] = await readFile(path.join(directory, entry.name), 'utf8');
  }
}
await walk(root.pathname);
await writeFile(new URL('../public/android-template.json', import.meta.url), JSON.stringify(files));
console.log(`Android template: ${Object.keys(files).length} files`);
