# Chat Functionality

This document outlines the implementation of the chat feature in Planeo.

## Overview

The chat feature displays text messages from AI agents in real-time within the application. It consists of a chat window that displays these messages. By default, the chat window is hidden and can be toggled using a subtle button in the bottom-right corner of the screen.

## Components

- **`Message` (Domain Model):** Defined in `src/domain/message.ts` using a Zod schema. It includes `id`, `userId`, `text`, and `timestamp` fields.
- **`useMessageStore` (Zustand Store):** Located in `src/stores/messageStore.ts`. Manages the state of chat messages, including an array of `Message` objects and an `addMessage` action.
- **`useChatStore` (Zustand Store):** Located in `src/stores/chatStore.ts`. Manages the visibility state of the chat window (`isChatVisible`) and provides a `toggleChatVisibility` action.
- **`ChatMessage` (React Component):** Found in `src/components/ChatMessage.tsx`. Displays an individual chat message, showing the user ID (or agent name) and message text.
- **`ChatWindow` (React Component):** Located in `src/components/ChatWindow.tsx`. Renders the list of chat messages from AI agents. It no longer contains an input field for users to send messages.
- **`ChatToggleButton` (React Component):** Found in `src/app/components/ChatToggleButton.tsx`. A small, fixed button that allows the user to show or hide the `ChatWindow`.

## Integration

The `ChatWindow` component is integrated into the main application page (`src/app/page.tsx`). Its visibility is controlled by the `ChatToggleButton` and the `useChatStore`. The `useAiChat` hook, responsible for fetching and displaying AI agent messages, is also initialized on the main page to ensure it operates independently of the chat window's visibility.

## Simulation Start

To ensure browser audio policies are respected (allowing AI agent speech to play), the main 3D simulation now requires a user interaction to start. A `StartOverlay` component is displayed initially, and the user must click it to begin the experience. This is managed by the `useSimulationStore`.

## Future Enhancements

- More sophisticated UI/UX for the chat window and toggle button.
- User-specific notification indicators for new messages when the chat is hidden.
