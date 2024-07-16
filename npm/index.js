const isTypedArray = require('is-typed-array')
const { WASI, WASIExitError } = require('wasi')

const defaultPreopens = {
    '.': '.',
}

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
            quiet,
        })
    }

    async compile(bufOrResponse) {
        // TODO: Handle ArrayBuffer
        if (isTypedArray(bufOrResponse)) {
            return WebAssembly.compile(bufOrResponse)
        }

        // Require Response object if not a TypedArray
        const response = await bufOrResponse
        if (!(response instanceof Response)) {
            throw new Error('Expected TypedArray or Response object')
        }

        const contentType = response.headers.get('Content-Type') || ''

        if ('instantiateStreaming' in WebAssembly && contentType.startsWith('application/wasm')) {
            return WebAssembly.compileStreaming(response)
        }

        const buffer = await response.arrayBuffer()
        return WebAssembly.compile(buffer)
    }

    async execute(bufOrResponse) {
        const mod = await this.compile(bufOrResponse)
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
