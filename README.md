# API para Vercel com Fastify + Drizzle + Neon

## Stack
- Fastify
- Drizzle ORM
- Postgres (Neon)
- Zod (validação)
- JWT + bcryptjs (login com senha criptografada)

## Requisitos
- Node.js 20+
- Banco Postgres (Neon)

## Configuração
1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Preencha no `.env`:
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT` (opcional)

## Comandos
```bash
make dev
make migrate
make generate
```

## Rotas
- `GET /api/health`
- `POST /api/login`
- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

## Vercel
- O entrypoint de Function é `api/[...route].ts`.
- A Vercel detecta automaticamente funções Node dentro da pasta `api`.
