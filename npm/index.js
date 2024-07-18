const { WASI, WASIExitError } = require('wasi')
const fs = require('fs')
const os = require('node:os')

const defaultPreopens = {
    '.': '.',
}

const nullDescriptor = fs.openSync(os.devNull)

class CircomRunner {
    constructor({
        args,
        env,
        preopens = defaultPreopens,
        quiet = false,
    } = {}) {
        this.wasi = new WASI({
            version: 'preview1',
            args: ['circom2', ...args],
            env,
            preopens,
            stdout: quiet ? nullDescriptor : 1,
            stderr: quiet ? nullDescriptor : 2,
        })
    }

    async execute(bufOrResponse) {
        const mod = await WebAssembly.compile(bufOrResponse)
        const instance = await WebAssembly.instantiate(mod, {
            ...this.wasi.getImportObject(),
        })

        try {
            this.wasi.start(instance)
        } catch (err) {
            // The circom devs decided to start forcing an exit call instead of exiting gracefully
            // so we look for WASIExitError with success code so we can actually be graceful
            if (err instanceof WASIExitError && err.code === 0) {
                return instance
            }

            throw err
        }

        // Return the instance in case someone wants to access exports or something
        return instance
    }
}

module.exports.CircomRunner = CircomRunner
module.exports.preopens = defaultPreopens
