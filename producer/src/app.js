import express from "express";
import { randomUUID } from "node:crypto";

export function createApp(channel, queue) {
  const app = express();
  app.use(express.json());

  app.post("/messages", async (req, res) => {
    const { content } = req.body ?? {};
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "O campo content é obrigatório (string)." });
    }

    const message = { id: randomUUID(), content, createdAt: new Date().toISOString() };

    try {
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        contentType: "application/json",
        messageId: message.id,
      });
      await channel.waitForConfirms();
      res.status(202).json({ status: "queued", message });
    } catch (err) {
      console.error("[producer] falha ao publicar:", err);
      res.status(500).json({ error: "Falha ao publicar mensagem." });
    }
  });

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  return app;
}