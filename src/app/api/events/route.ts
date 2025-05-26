import { NextRequest, NextResponse } from "next/server";

import { EventSchema, ValidatedBoxUpdatePayloadSchema } from "@/domain";
import { getAIAgents } from "@/domain/aiAgent";
import { ValidatedEyeUpdatePayloadSchema } from "@/domain/event";
import { EYE_Y_POSITION } from "@/domain/sceneConstants";
import { env } from "@/lib/env";

import {
  broadcast,
  setEye,
  subscribe,
  unsubscribe,
  getEyes,
  setBox,
} from "./sseStore";

export const GET = async () => {
  // Initialize AI Agent positions if not already done
  const currentEyes = getEyes();
  const agents = getAIAgents();
  let agentEyesInitialized = false;

  // Filter agents to respect TOTAL_AGENTS limit
  const agentsToInitialize = agents.slice(0, env.TOTAL_AGENTS);

  if (
    env.TOTAL_AGENTS > 0 &&
    agentsToInitialize.length === 0 &&
    !process.env["AI_AGENTS_CONFIG"]
  ) {
    console.warn(
      `[API Events] TOTAL_AGENTS is ${env.TOTAL_AGENTS}, but AI_AGENTS_CONFIG is not set or is empty. No AI agents will be initialized from defaults if TOTAL_AGENTS was intended to use them.`,
    );
  } else if (
    agentsToInitialize.length > 0 &&
    !process.env["AI_AGENTS_CONFIG"]
  ) {
    console.log(
      `[API Events] AI_AGENTS_CONFIG not set. Initializing ${agentsToInitialize.length} default AI agent(s) (TOTAL_AGENTS limit: ${env.TOTAL_AGENTS}).`,
    );
  } else if (agentsToInitialize.length > 0 && process.env["AI_AGENTS_CONFIG"]) {
    console.log(
      `[API Events] Initializing ${agentsToInitialize.length} AI agent(s) from AI_AGENTS_CONFIG (TOTAL_AGENTS limit: ${env.TOTAL_AGENTS}).`,
    );
  }

  agentsToInitialize.forEach((agent, index) => {
    if (!currentEyes.get(agent.id)) {
      const xPosition = 20 * (index + 1) * (index % 2 === 0 ? 1 : -1); // Spread them out
      setEye(
        agent.id,
        [xPosition, EYE_Y_POSITION, 5],
        [xPosition, EYE_Y_POSITION, 0],
        agent.displayName,
      );
      agentEyesInitialized = true;
    }
  });

  if (agentEyesInitialized) {
    console.log(
      `[API Events] Successfully set initial eye positions for ${agentsToInitialize.length} AI agent(s).`,
    );
    // Broadcast an empty eyeUpdate to trigger clients to fetch all eyes including new AI agents
    // Or, more robustly, have clients fetch all on connect.
    // For now, let's rely on the fact that new connection will get all current eyes.
  }

  const encoder = new TextEncoder();
  let writer: { write: (data: string) => void; closed: boolean };

  const stream = new ReadableStream({
    start: (controller) => {
      writer = {
        write: (s: string) => controller.enqueue(encoder.encode(s)),
        closed: false,
      };
      console.log("GET /api/events - new subscriber");
      subscribe(writer);
    },
    cancel: () => {
      if (writer) {
        writer.closed = true;
        unsubscribe(writer);
        console.log("GET /api/events - subscriber disconnected");
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

export const POST = async (req: NextRequest) => {
  let payload;
  try {
    payload = await req.json();
    // Log the received payload for POST requests on a single line
    const payloadForLogging = { ...payload };
    if (
      payloadForLogging.type === "aiVision" &&
      payloadForLogging.imageDataUrl
    ) {
      payloadForLogging.imageDataUrl = "[imageDataUrl removed for brevity]";
    }

    console.log(
      "POST /api/events - Received payload:",
      JSON.stringify(payloadForLogging),
    );
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("POST /api/events - Invalid JSON payload:", error.message);
    return NextResponse.json(
      { error: "Invalid JSON payload", details: error.message },
      { status: 400 },
    );
  }

  const parsedEvent = EventSchema.safeParse(payload);

  if (!parsedEvent.success) {
    return NextResponse.json(
      {
        error: "Invalid event structure",
        details: parsedEvent.error.flatten(),
      },
      { status: 400 },
    );
  }

  const eventData = parsedEvent.data;

  if (eventData.type === "eyeUpdate") {
    const validatedEyeData =
      ValidatedEyeUpdatePayloadSchema.safeParse(eventData);
    if (!validatedEyeData.success) {
      return NextResponse.json(
        {
          error: "Invalid eyeUpdate payload",
          details: validatedEyeData.error.flatten(),
        },
        { status: 400 },
      );
    }
    if (validatedEyeData.data.p || validatedEyeData.data.l) {
      setEye(
        validatedEyeData.data.id,
        validatedEyeData.data.p,
        validatedEyeData.data.l,
        validatedEyeData.data.name,
      );
      // No need to broadcast eye updates here, sseStore handles broadcasting periodic snapshots
    }
  } else if (eventData.type === "chatMessage") {
    broadcast(eventData); // Broadcast all chat messages
  } else if (eventData.type === "boxUpdate") {
    const validatedBoxData =
      ValidatedBoxUpdatePayloadSchema.safeParse(eventData);

    if (!validatedBoxData.success) {
      return NextResponse.json(
        {
          error: "Invalid boxUpdate payload",
          details: validatedBoxData.error.flatten(),
        },
        { status: 400 },
      );
    }
    // We expect clients to send "boxUpdate" type, but setBox in sseStore works with the "box" event type for storage/broadcast.
    // The setBox function will construct the full BoxEventType with a new timestamp.
    if (validatedBoxData.data.p || validatedBoxData.data.o) {
      setBox(
        validatedBoxData.data.id,
        validatedBoxData.data.p,
        validatedBoxData.data.o,
      );
      // sseStore.setBox now handles broadcasting the BoxEventType
    }
  }

  return NextResponse.json({ ok: true });
};
