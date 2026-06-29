import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  readdirSync,
  symlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const appRoot = process.cwd();
const standaloneRoot = join(appRoot, '.next', 'standalone');
const serverPath = join(standaloneRoot, 'server.js');

const copyDirectoryIfExists = (source, destination) => {
  if (!existsSync(source)) {
    return;
  }

  const copyEntry = (from, to) => {
    const stat = lstatSync(from);

    if (stat.isDirectory()) {
      mkdirSync(to, { recursive: true });

      for (const entry of readdirSync(from, { withFileTypes: true })) {
        copyEntry(join(from, entry.name), join(to, entry.name));
      }

      return;
    }

    if (stat.isSymbolicLink()) {
      try {
        symlinkSync(readlinkSync(from), to);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }

      return;
    }

    mkdirSync(join(to, '..'), { recursive: true });
    copyFileSync(from, to);
  };

  copyEntry(source, destination);
};

const ensureStandaloneServer = () => {
  if (!existsSync(serverPath)) {
    console.error('Standalone server not found. Run `npm run build` before `npm run start`.');
    process.exit(1);
  }
};

ensureStandaloneServer();

console.log('Preparing standalone assets...');
copyDirectoryIfExists(join(appRoot, 'public'), join(standaloneRoot, 'public'));
copyDirectoryIfExists(join(appRoot, '.next', 'static'), join(standaloneRoot, '.next', 'static'));

const env = {
  ...process.env,
  HOSTNAME: process.env.HOSTNAME || '127.0.0.1',
  PORT: process.env.PORT || '5173',
};

process.env.HOSTNAME = env.HOSTNAME;
process.env.PORT = env.PORT;

console.log(`Starting standalone server on ${env.HOSTNAME}:${env.PORT}...`);
const child = spawn(process.execPath, [serverPath], {
  cwd: appRoot,
  env,
  stdio: ['ignore', 'inherit', 'inherit'],
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(0);
  }

  process.exit(code ?? 0);
});
