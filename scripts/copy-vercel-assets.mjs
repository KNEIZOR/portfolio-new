import { cpSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const source = path.resolve('frontend/dist/assets');
const destination = path.resolve('public/assets');

mkdirSync(path.dirname(destination), { recursive: true });
cpSync(source, destination, { recursive: true, force: true });
