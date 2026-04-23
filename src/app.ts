import bcrypt from 'bcryptjs';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { and, eq, ne } from 'drizzle-orm';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';

import { getDb } from './db/client.js';
import { usersTable } from './db/schema.js';
import { getEnv } from './env.js';

const publicUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.email(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
});

const updateUserSchema = z
  .object({
    name: z.string().min(2).optional(),
    email: z.email().optional(),
    password: z.string().min(8).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Send at least one field to update.',
  });

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

function toPublicUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

export function buildApp() {
  const env = getEnv();
  const db = getDb();

  const app = Fastify({
    logger: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  app.get('/', async () => ({
    message: 'Welcome to API',
    docsHint: 'Use /api/health, /api/users and /api/login',
  }));

  app.get('/api/welcome', async () => ({
    message: 'Welcome to API',
    docsHint: 'Use /api/health, /api/users and /api/login',
  }));

  app.get('/api/health', async () => ({ ok: true }));

  app.post(
    '/api/login',
    {
      schema: {
        body: loginSchema,
        response: {
          200: z.object({
            token: z.string(),
            user: publicUserSchema,
          }),
          401: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

      if (!user) {
        return reply.status(401).send({ message: 'Invalid email or password.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return reply.status(401).send({ message: 'Invalid email or password.' });
      }

      const token = await reply.jwtSign({ sub: String(user.id), email: user.email });

      return {
        token,
        user: toPublicUser(user),
      };
    },
  );

  app.post(
    '/api/users',
    {
      schema: {
        body: createUserSchema,
        response: {
          201: publicUserSchema,
          409: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body;
      const passwordHash = await bcrypt.hash(password, 10);

      try {
        const [createdUser] = await db
          .insert(usersTable)
          .values({
            name,
            email,
            passwordHash,
          })
          .returning();

        return reply.status(201).send(toPublicUser(createdUser));
      } catch (error) {
        if (isUniqueViolation(error)) {
          return reply.status(409).send({ message: 'Email already in use.' });
        }

        throw error;
      }
    },
  );

  app.get(
    '/api/users',
    {
      schema: {
        response: {
          200: z.array(publicUserSchema),
        },
      },
    },
    async () => {
      const users = await db.select().from(usersTable);

      return users.map(toPublicUser);
    },
  );

  app.get(
    '/api/users/:id',
    {
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
        response: {
          200: publicUserSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));

      if (!user) {
        return reply.status(404).send({ message: 'User not found.' });
      }

      return toPublicUser(user);
    },
  );

  app.put(
    '/api/users/:id',
    {
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: updateUserSchema,
        response: {
          200: publicUserSchema,
          404: z.object({ message: z.string() }),
          409: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, email, password } = request.body;

      const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.id, id));

      if (!existingUser) {
        return reply.status(404).send({ message: 'User not found.' });
      }

      if (email) {
        const [emailInUse] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(and(eq(usersTable.email, email), ne(usersTable.id, id)));

        if (emailInUse) {
          return reply.status(409).send({ message: 'Email already in use.' });
        }
      }

      const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

      const [updatedUser] = await db
        .update(usersTable)
        .set({
          name: name ?? existingUser.name,
          email: email ?? existingUser.email,
          passwordHash: passwordHash ?? existingUser.passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, id))
        .returning();

      return toPublicUser(updatedUser);
    },
  );

  app.delete(
    '/api/users/:id',
    {
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
        response: {
          204: z.null(),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [deletedUser] = await db
        .delete(usersTable)
        .where(eq(usersTable.id, id))
        .returning({ id: usersTable.id });

      if (!deletedUser) {
        return reply.status(404).send({ message: 'User not found.' });
      }

      return reply.status(204).send(null);
    },
  );

  return app;
}
