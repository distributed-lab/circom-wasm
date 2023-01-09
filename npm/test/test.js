const { execSync } = require('child_process')
const path = require('path')
const assert = require('assert')
const fs = require('fs')
const binFileUtils = require('@iden3/binfileutils')
const r1csfile = require('r1csfile')

function circom2(args) {
    const cmd = path.join('../', require('../package.json')['bin']['circom2'])
    return execSync(cmd + ' ' + args, {
        cwd: __dirname,
    }).toString('utf-8')
}

const tests = []

function test(name, fn) {
    tests.push({ name, fn })
}

async function run() {
    for (let { name, fn } of tests) {
        const filters = process.argv.slice(2).join(' ').trim()
        if (!name.includes(filters)) {
            console.log('⏭️ ', name)
            continue
        }
        try {
            if (!fs.existsSync(__dirname + '/out')) fs.mkdirSync(__dirname + '/out')
            await fn()
            console.log('✅', name)
        } catch (e) {
            console.log('❌', name)
            console.log(e.stack)
        } finally {
            if (fs.existsSync(__dirname + '/out'))
                fs.rmSync(__dirname + '/out', { recursive: true })
        }
    }
}

test('circom2 command executes', () => {
    const stdout = circom2('--help')
    assert(stdout.includes('circom compiler'), 'missing stdout')
})

test('basic compile', () => {
    const stdout = circom2('basic.circom')
    assert(stdout.includes('Everything went okay'), 'compilation failed')
})

test('mimc compile', () => {
    const stdout = circom2('mimc.circom')
    assert(stdout.includes('Everything went okay'), 'compilation failed')
})

test('tuple compile', () => {
    const stdout = circom2('tuples.circom')
    assert(stdout.includes('Everything went okay'), 'compilation failed')
})


test('basic wat', () => {
    const stdout = circom2('basic.circom --wat --output out')
    assert(stdout.includes('Everything went okay'), 'compilation failed')
    const wat = fs.readFileSync(__dirname + '/out/basic_js/basic.wat').toString('utf8')
    assert(wat.startsWith('(module(import "runtime"'), 'wat file does not begin with module')
})

test('basic c', () => {
    const stdout = circom2('basic.circom --c --output out')
    assert(stdout.includes('Everything went okay'), 'compilation failed')
    const asmFile = fs.readFileSync(__dirname + '/out/basic_cpp/fr.asm').toString('utf8')
    assert(asmFile.includes('section .data'), 'asm file does not include section .data')
})

test('basic json', () => {
    const stdout = circom2('basic.circom --json --output out')
    assert(stdout.includes('Everything went okay'), 'compilation failed')
    const jsonFile = fs.readFileSync(__dirname + '/out/basic_constraints.json').toString('utf8')
    const data = JSON.parse(jsonFile)
    assert.equal(data.constraints[0].length, 3, 'expected 3 constraints')
})

test('basic sym', () => {
    const stdout = circom2('basic.circom --sym --output out')
    assert(stdout.includes('Everything went okay'), 'compilation failed')
    const symFile = fs.readFileSync(__dirname + '/out/basic.sym').toString('utf8')
    assert.equal(symFile.trim().split('\n').length, 3, 'expected 3 signals')
})

test('basic wasm', async () => {
    const stdout = circom2('basic.circom --wasm --output out')
    assert(stdout.includes('Everything went okay'), 'compilation failed')

    const input = {
        a: '43112609',
        b: '2147483647',
    }
    fs.writeFileSync(__dirname + '/out/basic_js/input.json', JSON.stringify(input))

    const result = execSync(
        [
            'node',
            __dirname + '/out/basic_js/generate_witness.js',
            __dirname + '/out/basic_js/basic.wasm',
            __dirname + '/out/basic_js/input.json',
            __dirname + '/out/basic_js/output.wtns',
        ].join(' ')
    )

    const wtns = fs.readFileSync(__dirname + '/out/basic_js/output.wtns')

    const expectedOutput = Array.from(
        (BigInt(input.a) * BigInt(input.b)).toString(16).padStart(64, '0').matchAll('..')
    )
        .reverse()
        .map((k) => k[0])
        .join('')

    assert(
        wtns.toString('hex').includes(expectedOutput),
        'could not find expected result in witness'
    )

    const wtnsBin = await binFileUtils.readBinFile(
        __dirname + '/out/basic_js/output.wtns',
        'wtns',
        2,
        1 << 25,
        1 << 23
    )
    const wtnsData = await readWtnsHeader(wtnsBin.fd, wtnsBin.sections)
    assert(wtnsData.nWitness === 4)

    const buffWitness = await binFileUtils.readSection(wtnsBin.fd, wtnsBin.sections, 2)

    // console.log(buffWitness)
    const witnessAt = (i) =>
        fromRprLE(buffWitness.slice(i * wtnsData.n8, i * wtnsData.n8 + wtnsData.n8))

    assert(witnessAt(1) === BigInt(input.a) * BigInt(input.b))

    await wtnsBin.fd.close()
})

function fromRprLE(buff, o, n8) {
    n8 = n8 || buff.byteLength
    o = o || 0
    const v = new Uint32Array(buff.buffer, o, n8 / 4)
    const a = new Array(n8 / 4)
    v.forEach((ch, i) => (a[a.length - i - 1] = ch.toString(16).padStart(8, '0')))

    return BigInt('0x' + a.join(''))
}

async function readWtnsHeader(fd, sections) {
    await binFileUtils.startReadUniqueSection(fd, sections, 1)
    const n8 = await fd.readULE32()
    const q = await binFileUtils.readBigInt(fd, n8)
    const nWitness = await fd.readULE32()
    await binFileUtils.endReadSection(fd)
    return { n8, q, nWitness }
}

test('basic r1cs', async () => {
    const stdout = circom2('basic.circom --r1cs --output out')
    assert(stdout.includes('Everything went okay'), 'compilation failed')
    const r1cs = fs.readFileSync(__dirname + '/out/basic.r1cs').toString('hex')
    assert(r1cs.startsWith('7231637301'), 'r1cs magic number missing')
    assert(!r1cs.includes('030303030'), 'wasmer wasi r1cs generation bug found')

    const result = await binFileUtils.readBinFile(
        __dirname + '/out/basic.r1cs',
        'r1cs',
        1,
        1 << 22,
        1 << 24
    )
    const r1csdata = await r1csfile.readR1csHeader(
        result.fd,
        result.sections,
        /* singleThread */ true
    )
    await result.fd.close()
    assert(r1csdata.curve.name === 'bn128', 'wrong curve')
    assert(r1csdata.nVars == 4)
    assert(r1csdata.nOutputs == 1)
})

run()
