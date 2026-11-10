import { PrismaClient } from '@prisma/client';
// For an always-on Railway backend prefer Direct (IPv6) or Session pooler (IPv4).
// Transaction pooler (6543) is an alternative for ephemeral/serverless workers;
// it requires pgbouncer=true with Prisma. Use direct connection for migrations.
export const prisma = new PrismaClient({
  log: process.env.PRISMA_LOG_QUERIES === 'true' ? [{emit:'event',level:'query'},'error','warn'] : ['error','warn']
});
if(process.env.PRISMA_LOG_QUERIES === 'true'){
  prisma.$on('query',e=>{
    if(e.duration>=Number(process.env.SLOW_QUERY_MS||300)) console.warn('[SLOW_SQL]',e.duration+'ms',e.query.slice(0,250));
  });
}
