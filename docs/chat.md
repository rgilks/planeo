# Chat Functionality

This document outlines the implementation of the chat feature in Planeo.

## Overview

The chat feature allows users to send and receive text messages in real-time within the application. It consists of a chat window that displays messages and an input field for composing new messages.

## Components

- **`Message` (Domain Model):** Defined in `src/domain/message.ts` using a Zod schema. It includes `id`, `userId`, `text`, and `timestamp` fields.
- **`useMessageStore` (Zustand Store):** Located in `src/stores/messageStore.ts`. Manages the state of chat messages, including an array of `Message` objects and an `addMessage` action.
- **`ChatMessage` (React Component):** Found in `src/components/ChatMessage.tsx`. Displays an individual chat message, showing the user ID and message text.
- **`ChatWindow` (React Component):** Located in `src/components/ChatWindow.tsx`. Renders the list of chat messages and provides an input field and send button for new messages. It uses `uuid` to generate unique IDs for new messages.

## Integration

The `ChatWindow` component is integrated into the main application page (`src/app/page.tsx`) and is displayed on the right side of the screen.

## Future Enhancements

- Real-time synchronization of messages across multiple users (requires backend integration).
- User authentication to display actual usernames instead of placeholder IDs.
- More sophisticated UI/UX for the chat window.
