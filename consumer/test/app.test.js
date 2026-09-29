import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { handleMessage } from "../src/handler.js";

function fakeChannel() {
  return { ack: mock.fn(), nack: mock.fn() };
}

const fakeMsg = (content) => ({ content: Buffer.from(content) });

test("mensagem válida recebe ack", () => {
  const channel = fakeChannel();
  const msg = fakeMsg(JSON.stringify({ id: "1", content: "Olá" }));

  handleMessage(channel, msg);

  assert.equal(channel.ack.mock.callCount(), 1);
  assert.equal(channel.ack.mock.calls[0].arguments[0], msg);
  assert.equal(channel.nack.mock.callCount(), 0);
});

test("JSON inválido recebe nack sem reenfileirar", () => {
  const channel = fakeChannel();
  const msg = fakeMsg("isso não é json");

  handleMessage(channel, msg);

  assert.equal(channel.nack.mock.callCount(), 1);
  assert.deepEqual(channel.nack.mock.calls[0].arguments, [msg, false, false]);
  assert.equal(channel.ack.mock.callCount(), 0);
});

test("mensagem nula (consumer cancelado) é ignorada", () => {
  const channel = fakeChannel();
  handleMessage(channel, null);

  assert.equal(channel.ack.mock.callCount(), 0);
  assert.equal(channel.nack.mock.callCount(), 0);
});