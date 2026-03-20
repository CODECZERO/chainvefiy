type PrismaClientType = import('@prisma/client').PrismaClient;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };

const prismaDisabled = () =>
  new Proxy(
    {},
    {
      get() {
        throw new Error('Prisma is disabled in test mode (set NODE_ENV!=test to enable).');
      },
    },
  ) as unknown as PrismaClientType;

let prismaInstance: PrismaClientType;

if (process.env.NODE_ENV === 'test') {
  prismaInstance = prismaDisabled();
} else {
  const [{ PrismaClient }, { PrismaPg }] = await Promise.all([
    import('@prisma/client'),
    import('@prisma/adapter-pg'),
  ]);

  const databaseUrl = process.env.DATABASE_URL || '';
  if (databaseUrl.startsWith('http://') || databaseUrl.startsWith('https://')) {
    throw new Error(
      'Invalid DATABASE_URL: Prisma requires a Postgres connection string (postgresql://...), not a Supabase project HTTPS URL. ' +
      'In Supabase Dashboard go to Project Settings → Database → Connection string (URI).'
    );
  }

  const adapter = new PrismaPg({
    connectionString:
      databaseUrl,
  });

  prismaInstance =
    globalForPrisma.prisma ||
    new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance;
}

export const prisma = prismaInstance;
