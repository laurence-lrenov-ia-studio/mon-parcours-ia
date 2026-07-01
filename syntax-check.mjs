import fs from 'node:fs';
import vm from 'node:vm';

for (const file of ['apprenant.html', 'formateur.html']) {
  const html = fs.readFileSync(file, 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((match, index) => new vm.Script(match[1], { filename: `${file}#script-${index + 1}` }));
  console.log(`${file}: ${scripts.length} scripts valides`);
}

new vm.Script(fs.readFileSync('apps-script-backend.gs', 'utf8'), { filename: 'apps-script-backend.gs' });
console.log('apps-script-backend.gs: syntaxe valide');
