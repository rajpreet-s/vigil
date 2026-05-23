// app.js
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import AutoLoad from '@fastify/autoload'
import type { FastifyInstance } from 'fastify';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function app(fastify: FastifyInstance, opts: any) {

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts)
  })

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({ prefix: '/api' }, opts)
  })
}