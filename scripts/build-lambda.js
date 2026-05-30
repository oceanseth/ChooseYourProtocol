// Build the Lambda function package (lambda-package.zip) — code only.
// Dependencies live in the layer, so this just stages api/ + utils/ and zips.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync, mkdirSync, cpSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stage = join(root, 'lambda-package');
const zip = join(root, 'lambda-package.zip');

console.log('🧱 Staging Lambda code…');
rmSync(stage, { recursive: true, force: true });
rmSync(zip, { force: true });
mkdirSync(stage, { recursive: true });
cpSync(join(root, 'api'), join(stage, 'api'), { recursive: true });
cpSync(join(root, 'utils'), join(stage, 'utils'), { recursive: true });

console.log('🗜️  Zipping function…');
execSync(`cd "${stage}" && zip -qr "${zip}" api utils`, { stdio: 'inherit', shell: '/bin/bash' });
console.log('✅ lambda-package.zip ready');
