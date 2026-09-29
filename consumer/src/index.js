import amqp from "amqplib";
import { handleMessage } from "./handler";

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://localhost:5672";
const QUEUE = process.env.QUEUE ?? "messages.queue";


async function bootstrap() {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.prefetch(1);

    console.log(`[consumer] aguardando mensagens em "${QUEUE}"...`);

    await channel.consume(QUEUE, (msg) => handleMessage(channel, msg));

    const shutdown = async () => {
        console.log("[consumer] encerrando...");
        await channel.close();
        await connection.close();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
    console.error("[consumer] erro fatal:", err);
    process.exit(1);
})