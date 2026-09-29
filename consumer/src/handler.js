export function handleMessage(channel, msg) {
    if (!msg) return;
    try {
        const payload = JSON.parse(msg.content.toString());
        console.log("[consumer] mensagem recebida:", payload);
        channel.ack(msg);
    } catch (err) {
        console.error("[consumer] mensagem inválida, descartando:", err.message);
        channel.nack(msg, false, false);
    }
}