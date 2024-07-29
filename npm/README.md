[![npm](https://img.shields.io/npm/v/@distributedlab/circom2.svg)](https://www.npmjs.com/package/@distributedlab/circom2)
[![License: GPLv3](https://img.shields.io/badge/license-GPLv3-yellow)](https://opensource.org/license/gpl-3-0)

# Circom 2.0 WASM

This project is a version of Circom 2.0 compiled to WASM with AST serialization support.

## Installation

The package is distributed under Distributed Lab npm organization. Run the following commanad to install the compiler:

```bash
npm install --global @distributedlab/circom2
```

> [!WARNING]
> This is an experimental software. You may encounter nasty bugs.

## Usage

You can use the compiler in the following way:

```bash
circom2 <cli_arguments>
```

Or through using `CircomRunner` class directly. Check out `cli.ts` file to learn how it is done.

## Disclaimer

GLHF!
