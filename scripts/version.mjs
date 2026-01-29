#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const packageJsonPath = join(rootDir, 'package.json');
const tauriConfPath = join(rootDir, 'src-tauri', 'tauri.conf.json');
const versionFilePath = join(rootDir, 'version.json');

function getVersionInfo() {
  try {
    return JSON.parse(readFileSync(versionFilePath, 'utf8'));
  } catch {
    return { version: '1.0.0', build: 0 };
  }
}

function parseSemver(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function updateVersionFiles(version, build) {
  writeFileSync(versionFilePath, JSON.stringify({ version, build }, null, 2) + '\n');
  
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = version;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));
  tauriConf.package.version = version;
  writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  
  const display = build > 0 ? `${version}+${build}` : version;
  console.log(`✓ Version updated to ${display}`);
}

const command = process.argv[2];
const info = getVersionInfo();
const { major, minor, patch } = parseSemver(info.version);

switch (command) {
  case 'major':
    updateVersionFiles(`${major + 1}.0.0`, 0);
    break;
  case 'minor':
    updateVersionFiles(`${major}.${minor + 1}.0`, 0);
    break;
  case 'patch':
    updateVersionFiles(`${major}.${minor}.${patch + 1}`, 0);
    break;
  case 'build':
    updateVersionFiles(info.version, info.build + 1);
    break;
  case 'show':
    const display = info.build > 0 ? `${info.version}+${info.build}` : info.version;
    console.log(`Current version: ${display}`);
    console.log(`  Semver: ${info.version}`);
    console.log(`  Build:  ${info.build}`);
    break;
  default:
    console.log('Usage: npm run version:<major|minor|patch|build|show>');
    process.exit(1);
}
