import { describe, it, expect } from "vitest";
import { RealtimeResource } from "../src/realtime.js";

describe("realtime.subscribe", () => {
  it("delivers events and awaits async onEvent handlers in order", async () => {
    const ssePayload = [
      "event: order.created\nid: 1\ndata: {\"orderId\":\"o1\"}\n\n",
      "event: order.settled\nid: 2\ndata: {\"orderId\":\"o2\"}\n\n",
    ].join("");

    const mockFetch = (async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(ssePayload));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    }) as typeof fetch;

    const realtime = new RealtimeResource("http://test.local", () => "test-token", mockFetch);
    const seen: string[] = [];

    const sub = await realtime.subscribe({
      onEvent: async (e) => {
        // simulate async processing delay
        await new Promise((resolve) => setTimeout(resolve, 10));
        seen.push(`${e.event}:${e.id}:${e.data}`);
      },
    });

    // Wait briefly for the stream loop to finish processing
    await new Promise((resolve) => setTimeout(resolve, 50));
    sub.close();

    expect(seen).toEqual([
      'order.created:1:{"orderId":"o1"}',
      'order.settled:2:{"orderId":"o2"}',
    ]);
  });

  it("propagates async onEvent errors to onError", async () => {
    const ssePayload = "event: message\ndata: hello\n\n";
    const mockFetch = (async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(ssePayload));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    }) as typeof fetch;

    const realtime = new RealtimeResource("http://test.local", () => "test-token", mockFetch);
    let capturedError: unknown;

    const sub = await realtime.subscribe({
      onEvent: async () => {
        throw new Error("async handler failure");
      },
      onError: (err) => {
        capturedError = err;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 30));
    sub.close();

    expect(capturedError).toBeInstanceOf(Error);
    expect((capturedError as Error).message).toBe("async handler failure");
  });
});
