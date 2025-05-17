import Fastify from 'fastify'
import cors from '@fastify/cors'
import { v2 as cloudinary } from 'cloudinary'
import 'dotenv/config'
cloudinary.config({
  cloud_name: 'dzebbxo0l',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_API_KEY,
})
const fastify = Fastify()

await fastify.register(cors, {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
})

fastify.delete('/api/delete-image', async (request, reply) => {
  // @ts-ignore
  const public_id = request.query.public_id
  if (!public_id || typeof public_id !== 'string') {
    return reply.status(400).send({ error: 'Public ID is required' })
  }
  try {
    const result = await cloudinary.uploader.destroy(public_id)
    if (result.result === 'ok') {
      return { message: 'Image deleted successfully' }
    } else {
      console.log('Cloudinary destroy result:', result);
      console.log('DELETE public_id:', public_id);
      return reply.status(400).send({ error: 'Failed to delete image', result })
    }
  } catch (error) {
    const err = error as Error
    return reply.status(500).send({
      error: 'Internal server error',
      detail: err.message || err,
    })
  }
})
fastify.listen({ port: 3001 }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`🚀 Fastify server running at ${address}`)
})
