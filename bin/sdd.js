#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const pkg = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf-8'))

console.log(`sdd-kit v${pkg.version}`)
console.log('CLI aún no implementada (Fase 6 del task-list).')
process.exit(1)
