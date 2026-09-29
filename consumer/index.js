import amqp from "amqplib";
import { createApp } from "./app.js";

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672";
const QUEUE = process.env.QUEUE ?? "messages.queue";
const PORT = Number(process.env.PORT ?? 3000);

async function bootstrap() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createConfirmChannel();
  await channel.assertQueue(QUEUE, { durable: true });

  const server = createApp(channel, QUEUE).listen(PORT, () =>
    console.log(`[producer] http://localhost:${PORT}`)
  );

  const shutdown = async () => {
    server.close();
    await channel.close();
    await connection.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("[producer] erro fatal:", err);
  process.exit(1);
});