import { test, mock } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

const QUEUE = "test.queue";

function fakeChannel(overrides = {}) {
  return {
    sendToQueue: mock.fn(() => true),
    waitForConfirms: mock.fn(async () => {}),
    ...overrides,
  };
}

test("POST /messages válido retorna 202 e publica na fila", async () => {
  const channel = fakeChannel();
  const res = await request(createApp(channel, QUEUE))
    .post("/messages")
    .send({ content: "Olá" });

  assert.equal(res.status, 202);
  assert.equal(res.body.status, "queued");
  assert.equal(res.body.message.content, "Olá");

  assert.equal(channel.sendToQueue.mock.callCount(), 1);
  const [queue, buffer, options] = channel.sendToQueue.mock.calls[0].arguments;
  assert.equal(queue, QUEUE);
  assert.equal(options.persistent, true);
  assert.equal(JSON.parse(buffer.toString()).content, "Olá");
});

test("POST /messages sem content retorna 400 e não publica", async () => {
  const channel = fakeChannel();
  const res = await request(createApp(channel, QUEUE)).post("/messages").send({});

  assert.equal(res.status, 400);
  assert.equal(channel.sendToQueue.mock.callCount(), 0);
});

test("POST /messages com content não-string retorna 400", async () => {
  const channel = fakeChannel();
  const res = await request(createApp(channel, QUEUE))
    .post("/messages")
    .send({ content: 123 });

  assert.equal(res.status, 400);
  assert.equal(channel.sendToQueue.mock.callCount(), 0);
});

test("POST /messages retorna 500 se a publicação falhar", async (t) => {
    t.mock.method(console, "error", () => {});
    const channel = fakeChannel({
        waitForConfirms: mock.fn(async () => {
        throw new Error("broker indisponível");
        }),
    });
    const res = await request(createApp(channel, QUEUE))
        .post("/messages")
        .send({ content: "Olá" });

    assert.equal(res.status, 500);
});