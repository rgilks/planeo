# Text-to-Speech (TTS) Functionality

This document outlines the Text-to-Speech (TTS) feature implemented in the application, enabling chat messages to be spoken aloud.

## Overview

The TTS system is designed to provide a distinct and consistent voice for each user in the chat.
When a new chat message is received, if it's not from the current user and not a command message (e.g., starting with `/`), the system will automatically synthesize the message text into speech and play it.

## Technical Implementation

### Server-Side (Action)

- **Action Location**: `src/app/actions/tts.ts`
- **Client Initialization**: `src/app/actions/ttsClient.ts` (handles Google Cloud TTS client setup using `GOOGLE_APP_CREDS_JSON` environment variable).
- **Function**: `synthesizeSpeechAction`
  - **Input**: `text` (string), `userId` (string), `voiceName` (optional string).
  - **Output**: `audioBase64` (string) or an `error` object.
- **Voice Assignment**:
  - A predefined list of Google Cloud 'Chirp3' voices is used (see `chirp3Voices` in `tts.ts`).
  - If `voiceName` is not provided in the parameters, a voice is deterministically assigned to a `userId` using a simple hashing mechanism on the `userId`. This ensures that each user consistently has the same voice.
  - The language code is derived from the selected voice name (e.g., `en-US`, `en-GB`).
- **Authentication**: The Google Cloud Text-to-Speech client is initialized using credentials provided via the `GOOGLE_APP_CREDS_JSON` environment variable. This JSON file contains the service account key for accessing the Google Cloud TTS API.

### Client-Side (React Components)

- **Chat Message Component**: `src/components/ChatMessage.tsx`

  - This component is responsible for rendering individual chat messages.
  - It receives the `currentUserId` as a prop.
  - **TTS Trigger**: When a new message is rendered, a `useEffect` hook checks if the message is from a different user. If so, it calls the `synthesizeSpeechAction` with the message text and the sender's `userId`.
  - **Audio Playback**:
    - The `audioBase64` data returned from the action is used to create an `HTMLAudioElement` (`new Audio("data:audio/mp3;base64," + audioBase64)`).
    - The audio is then played automatically.
  - **State Management**: The component manages `audioStatus` (`idle`, `loading`, `playing`, `error`) and `error` states to provide feedback.
  - **Visual Indicators**: Small icons (🎤) are displayed next to messages to indicate TTS status (loading, playing, error).

- **Chat Window Component**: `src/components/ChatWindow.tsx`
  - Passes the `myId` (current user's ID) prop to each `ChatMessage` instance as `currentUserId`.

### Environment Variables

- `GOOGLE_APP_CREDS_JSON`: **Required**. A JSON string containing the Google Cloud service account credentials necessary for the Text-to-Speech API. This should be set in your `.env.local` or server environment.
- `NEXT_PUBLIC_TTS_ENABLED`: **Optional**. Set to `"false"` to disable Text-to-Speech functionality across the application. If not set, or set to any other value (e.g., `"true"`), TTS will be enabled by default. This is useful for disabling TTS during development, testing (e.g., end-to-end tests), or if a user wishes to globally turn off the feature via environment configuration.

## Error Handling

- The `synthesizeSpeechAction` returns error objects for issues like invalid parameters, TTS synthesis failures, or rate limit errors from the Google Cloud API.
- The `ChatMessage` component handles these errors by displaying an error message and a visual indicator.
- Audio playback errors on the client-side are also caught and reported.

## Future Enhancements (Potential)

- User preference to disable TTS (via UI, complementing the environment variable for global control).
- User preference for voice selection.
- More sophisticated rate limiting and queueing if API limits become an issue.
- Admin panel to manage available voices.
