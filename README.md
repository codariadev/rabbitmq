# Producer / Consumer com Node.js + RabbitMQ

Dois microsserviços Node.js que se comunicam de forma assíncrona por uma fila RabbitMQ:

- **Producer:** API HTTP (Express) que recebe requisições e publica mensagens na fila.
- **Consumer:** processa as mensagens da fila e registra o conteúdo em log.

## Arquitetura

```
Cliente HTTP ──POST /messages──▶ Producer ──▶ [ RabbitMQ: messages.queue ] ──▶ Consumer ──▶ log
```

Como a comunicação é assíncrona, o producer continua aceitando requisições mesmo que o consumer esteja fora do ar. As mensagens ficam na fila até serem consumidas.

## Requisitos

- Node.js 18+
- Docker e Docker Compose

## Estrutura

```
rabbitmq-node/
├── docker-compose.yml
├── producer/
│   ├── src/
│   │   ├── app.js        # createApp(channel, queue): rotas e validação
│   │   └── index.js      # conexão com o RabbitMQ e inicialização
│   └── test/
└── consumer/
    ├── src/
    │   ├── handler.js    # handleMessage(channel, msg): ack/nack
    │   └── index.js      # conexão com o RabbitMQ e consumo da fila
    └── test/
```

## Como rodar

1. Suba o RabbitMQ:

```bash
docker compose up -d
```

2. Em um terminal, inicie o producer (porta 3000):

```bash
cd producer
npm install
npm start
```

3. Em outro terminal, inicie o consumer:

```bash
cd consumer
npm install
npm start
```

O painel de gerenciamento do RabbitMQ fica em http://localhost:15672 (usuário `guest`, senha `guest`).

## Variáveis de ambiente

| Variável       | Padrão                              | Serviço           | Descrição             |
|----------------|-------------------------------------|-------------------|-----------------------|
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672` | producer/consumer | URL de conexão        |
| `QUEUE`        | `messages.queue`                    | producer/consumer | Nome da fila          |
| `PORT`         | `3000`                              | producer          | Porta da API HTTP     |

## API

### `POST /messages`

Publica uma mensagem na fila.

**Body**

```json
{ "content": "Olá, RabbitMQ!" }
```

**Respostas**

| Status | Quando                                              |
|--------|-----------------------------------------------------|
| `202`  | Mensagem publicada e confirmada pelo broker         |
| `400`  | `content` ausente, vazio ou que não seja string     |
| `500`  | Falha ao publicar no RabbitMQ                       |

**Exemplo**

```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"Olá, RabbitMQ!"}'
```

```json
{
  "status": "queued",
  "message": { "id": "294481a8-...", "content": "Olá, RabbitMQ!", "...": "..." }
}
```

### `GET /health`

Retorna `{ "status": "ok" }`.

## Testes

Os testes usam o test runner nativo do Node (`node:test`) e o `supertest` no producer. **Não precisam do RabbitMQ no ar**, porque usam um canal simulado.

```bash
cd producer && npm test
cd consumer && npm test
```

**Producer**
- Requisição válida retorna `202` e publica na fila com `persistent: true`
- Sem `content`, ou com `content` que não seja string, retorna `400` e não publica
- Falha na publicação retorna `500`

**Consumer**
- Mensagem válida recebe `ack`
- JSON inválido recebe `nack` sem reenfileirar
- Mensagem nula (consumer cancelado) é ignorada

## Decisões de projeto

- **Fila durável e mensagens persistentes:** as mensagens sobrevivem a uma reinicialização do broker.
- **`ConfirmChannel` no producer:** a API só responde `202` depois que o RabbitMQ confirma o recebimento.
- **`ack` manual e `prefetch(1)` no consumer:** a mensagem só sai da fila depois de processada, uma por vez.
- **Mensagem inválida recebe `nack` sem reenfileirar:** evita um loop infinito com mensagens que nunca vão ser processadas. Numa versão de produção, elas iriam para uma Dead Letter Queue.
- **Lógica separada da infraestrutura:** `createApp` e `handleMessage` recebem o canal como dependência, o que permite testar sem um broker real.
- **Graceful shutdown:** os dois serviços fecham canal e conexão ao receber `SIGINT` ou `SIGTERM`.

## Possíveis melhorias

- Dead Letter Queue com política de retry
- Reconexão automática ao RabbitMQ
- Teste de integração com Testcontainers
- Dockerfiles para os dois serviços
- Logs estruturados (por exemplo, com `pino`)