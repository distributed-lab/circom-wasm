# Circom 2.0 WASM

This is a proof of concept of Circom 2.0 compiled to WASM.

# Getting Started

```
cd circom

# Compiling to WASM with rustwasmc/wasmedge
npm install -g rustwasmc
rustwasmc build --dev # fast compile, slow to run
rustwasmc build --enable-aot # slow but optimized build

# Testing out the compiled version with wasmedge
mkdir -p output
~/.wasmedge/bin/wasmedge --dir .:. pkg/circom.wasm --output output basic.circom --wasm
cd output/basic_js
node generate_witness.js basic.wasm input.json out.wtns

# Testing out the compiled version with wasmtime
wasmtime --dir . pkg/circom.wasm --output output basic.circom --wasm
cd output/basic_js
node generate_witness.js basic.wasm input.json out.wtns
