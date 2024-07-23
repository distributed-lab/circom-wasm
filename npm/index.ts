import { WASI } from 'wasi';
import {WASIExitError} from "@wasmer/wasi";
import fs from 'fs';
import os from 'os';

const defaultPreopens = {
    '.': '.',
};

const nullDescriptor = fs.openSync(os.devNull, 'w');

interface CircomRunnerOptions {
    args?: string[];
    env?: object;
    preopens?: NodeJS.Dict<string>;
    quiet?: boolean;
}

class CircomRunner {
    private wasi: WASI;

    constructor({
        args = [],
        env,
        preopens = defaultPreopens,
        quiet = false,
    }: CircomRunnerOptions = {}) {
        this.wasi = new WASI({
            version: 'preview1',
            args: ['circom2', ...args],
            env,
            preopens,
            stdout: quiet ? nullDescriptor : 1,
            stderr: quiet ? nullDescriptor : 2,
        });
    }

    async execute(bufOrResponse: BufferSource): Promise<WebAssembly.Instance> {
        const mod = await WebAssembly.compile(bufOrResponse);
        const instance = await WebAssembly.instantiate(mod, { wasi_snapshot_preview1: this.wasi.wasiImport });

        try {
            this.wasi.start(instance);
        } catch (err) {
            // The circom devs decided to start forcing an exit call instead of exiting gracefully
            // so we look for WASIExitError with success code so we can actually be graceful
            if (err instanceof WASIExitError && err.code === 0) {
                return instance;
            }

            throw err;
        }

        // Return the instance in case someone wants to access exports or something
        return instance;
    }
}

export { CircomRunner, defaultPreopens };
