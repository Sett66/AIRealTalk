/**
 * pnpm hoists deps to repo root; React Native Android expects mobile/node_modules.
 * Creates directory junctions (Windows) or symlinks (Unix) after install.
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const rootNodeModules = path.join(repoRoot, 'node_modules');
const mobileNodeModules = path.join(repoRoot, 'mobile', 'node_modules');

const packagesToLink = [
  'react',
  'react-native',
  'react-native-safe-area-context',
  '@react-native/new-app-screen',
  '@airealtalk/shared',
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function linkPackage(pkgName) {
  const source = path.join(rootNodeModules, pkgName);
  const dest = path.join(mobileNodeModules, pkgName);

  if (!fs.existsSync(source)) {
    console.warn(`[link-mobile-deps] skip missing: ${pkgName}`);
    return;
  }

  ensureDir(path.dirname(dest));

  if (fs.existsSync(dest)) {
    const stat = fs.lstatSync(dest);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      return;
    }
    fs.rmSync(dest, { recursive: true, force: true });
  }

  const type = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(source, dest, type);
  console.log(`[link-mobile-deps] linked ${pkgName}`);
}

function linkScope(scopeName) {
  const source = path.join(rootNodeModules, scopeName);
  const dest = path.join(mobileNodeModules, scopeName);

  if (!fs.existsSync(source)) {
    console.warn(`[link-mobile-deps] skip missing scope: ${scopeName}`);
    return;
  }

  ensureDir(mobileNodeModules);

  if (fs.existsSync(dest)) {
    return;
  }

  const type = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(source, dest, type);
  console.log(`[link-mobile-deps] linked scope ${scopeName}`);
}

ensureDir(mobileNodeModules);
linkScope('@react-native');
linkScope('@airealtalk');
packagesToLink.forEach(linkPackage);
