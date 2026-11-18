import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

dotenv.config();

const server = Fastify({
  logger: true,
});

await server.register(cors, {
  origin: true,
});

server.get('/health', async () => {
  return {
    status: 'ok',
    service: 'codesync-oauth-backend',
    timestamp: new Date().toISOString(),
  };
});

// OAuth exchange placeholder (to be completed in Phase 4)
server.post('/api/oauth/exchange', async (_request, reply) => {
  return reply.status(501).send({
    error: 'Not Implemented',
    message: 'OAuth exchange flow will be implemented in Phase 4',
  });
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    await server.listen({ port, host });
    console.log(`[CodeSync OAuth] Server listening on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

