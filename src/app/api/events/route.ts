import { NextRequest, NextResponse } from "next/server";

import { EventSchema } from "@/domain";
import { getAIAgents } from "@/domain/aiAgent";
import { ValidatedEyeUpdatePayloadSchema } from "@/domain/event";
import { EYE_Y_POSITION } from "@/domain/sceneConstants";

import { broadcast, setEye, subscribe, unsubscribe, getEyes } from "./sseStore";

export const GET = async () => {
  // Initialize AI Agent positions if not already done
  const currentEyes = getEyes();
  const agents = getAIAgents();
  let agentEyesInitialized = false;

  agents.forEach((agent, index) => {
    if (!currentEyes.get(agent.id)) {
      const xPosition = 20 * (index + 1) * (index % 2 === 0 ? 1 : -1); // Spread them out
      setEye(
        agent.id,
        [xPosition, EYE_Y_POSITION, 5],
        [xPosition, EYE_Y_POSITION, 0]
      );
      agentEyesInitialized = true;
    }
  });

  if (agentEyesInitialized) {
    console.log("[API Events] Initialized default AI agent eye positions.");
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
    console.log(
      "POST /api/events - Received payload:",
      JSON.stringify(payload)
    );
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("POST /api/events - Invalid JSON payload:", error.message);
    return NextResponse.json(
      { error: "Invalid JSON payload", details: error.message },
      { status: 400 }
    );
  }

  const parsedEvent = EventSchema.safeParse(payload);

  if (!parsedEvent.success) {
    return NextResponse.json(
      {
        error: "Invalid event structure",
        details: parsedEvent.error.flatten(),
      },
      { status: 400 }
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
        { status: 400 }
      );
    }
    if (validatedEyeData.data.p || validatedEyeData.data.l) {
      setEye(
        validatedEyeData.data.id,
        validatedEyeData.data.p,
        validatedEyeData.data.l
      );
      // No need to broadcast eye updates here, sseStore handles broadcasting periodic snapshots
    }
  } else if (eventData.type === "chatMessage") {
    broadcast(eventData); // Broadcast all chat messages
  }

  return NextResponse.json({ ok: true });
};
