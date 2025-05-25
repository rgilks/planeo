import fs from "fs"; // Import Node.js fs module
import path from "path"; // Import Node.js path module

import { NextRequest, NextResponse } from "next/server";

import { generateAiVisionResponse } from "@/app/actions/generateMessage";
import { EventSchema } from "@/domain";
import { AI_USER_ID } from "@/domain/aiConstants";
import {
  ValidatedEyeUpdatePayloadSchema,
  AiVisionEventType,
} from "@/domain/event";

import { broadcast, setEye, subscribe, unsubscribe } from "./sseStore";

export const GET = async () => {
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
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
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
      );
    }
  } else if (eventData.type === "chatMessage") {
    broadcast(eventData);
  } else if (eventData.type === "aiVision") {
    const visionEvent = eventData as AiVisionEventType;
    console.log(
      `Received aiVision event for user ${visionEvent.userId}, ` +
        `image length: ${visionEvent.imageDataUrl.length}, ` +
        `chat history length: ${visionEvent.chatHistory.length}`,
    );

    // Save the image for debugging
    try {
      const base64Data = visionEvent.imageDataUrl.split(",")[1];
      if (base64Data) {
        const imageBuffer = Buffer.from(base64Data, "base64");
        const imageName = `vision_${visionEvent.userId}_${Date.now()}.png`;
        const imageDir = path.join(process.cwd(), "debug_images"); // Save in project root/debug_images

        if (!fs.existsSync(imageDir)) {
          fs.mkdirSync(imageDir, { recursive: true });
        }

        const imagePath = path.join(imageDir, imageName);
        fs.writeFileSync(imagePath, imageBuffer);
        console.log(`Saved debug image to: ${imagePath}`);
      } else {
        console.error(
          "Could not extract base64 data from imageDataUrl for saving.",
        );
      }
    } catch (e) {
      console.error("Error saving debug image:", e);
    }

    // Asynchronously call the AI vision processing. Do not await.
    // The response will be sent back as a new 'chatMessage' event.
    generateAiVisionResponse(
      visionEvent.imageDataUrl,
      visionEvent.chatHistory,
      AI_USER_ID,
    ).catch((error) => {
      console.error(
        "[API Events] Error during generateAiVisionResponse call:",
        error,
      );
    });
  }

  return NextResponse.json({ ok: true });
};
