// Build the Lambda dependencies layer (lambda-layer.zip).
// Installs production deps from layer-dependencies/ into the AWS Lambda layer
// layout (nodejs/node_modules/...) and zips it.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync, mkdirSync, existsSync, cpSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layerSrc = join(root, 'layer-dependencies');
const stage = join(root, 'lambda-layer');
const nodeModulesOut = join(stage, 'nodejs', 'node_modules');
const zip = join(root, 'lambda-layer.zip');

console.log('📦 Installing layer dependencies…');
execSync('npm install --omit=dev --no-audit --no-fund', { cwd: layerSrc, stdio: 'inherit' });

console.log('🧱 Assembling layer…');
rmSync(stage, { recursive: true, force: true });
rmSync(zip, { force: true });
mkdirSync(nodeModulesOut, { recursive: true });
if (!existsSync(join(layerSrc, 'node_modules'))) throw new Error('layer node_modules missing after install');
cpSync(join(layerSrc, 'node_modules'), nodeModulesOut, { recursive: true });

console.log('🗜️  Zipping layer…');
execSync(`cd "${stage}" && zip -qr "${zip}" nodejs`, { stdio: 'inherit', shell: '/bin/bash' });
console.log('✅ lambda-layer.zip ready');
