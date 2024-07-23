#!/usr/bin/env node

import { CircomRunner } from './index';
import fs from 'fs';
import path from 'path';

async function main() {
    let args = process.argv
        .slice(2)
        .map((k) => (k.startsWith('-') ? k : k.endsWith('/') ? path.resolve(k) + '/' : path.resolve(k)));

    if (!(args.includes('-o') || args.includes('--output'))) {
        args.push('-o', process.cwd() + '/');
    }

    if (args.length === 0) {
        args.push('--help');
    }

    const circom = new CircomRunner({
        args,
        env: process.env,
        preopens: {"/":"/"},
    });

    const wasm_bytes = fs.readFileSync(require.resolve('./circom.wasm'));

    // There is a slight delay between this logging and the circom compiler version logging
    if (args.includes('--version')) {
        console.log('circom2 npm package', require('./package.json').version);
    }

    await circom.execute(wasm_bytes);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
})
