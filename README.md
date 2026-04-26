# AI Chat Electron

[![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D)](https://vuejs.org/)
[![Electron](https://img.shields.io/badge/Electron-40.x-47848F)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38BDF8)](https://tailwindcss.com/)

An Electron desktop chat client built with Vue 3 and Vite.

This project focuses on a clean desktop chat experience for OpenAI-compatible APIs, with local model configuration, session history, image attachment support, streaming responses, and a polished chat UI.

## Features

- Multi-model configuration from the settings page.
- Compatible with OpenAI-style chat completion endpoints.
- Streaming assistant output.
- Session history sidebar with search and pagination.
- User message editing with truncation of later history.
- Markdown rendering with code highlighting.
- Image paste and file attachment support.
- Light and dark mode.
- Desktop shell powered by Electron.
- Token statistics with persistence (only increases, never decreases).

## Tech Stack

- `Electron`
- `Vue 3`
- `Vue Router`
- `Vite`
- `Tailwind CSS`
- `marked`
- `highlight.js`
- `lucide-vue-next`
- `js-tiktoken`

## Project Structure

```text
.
|-- electron-main.js         # Electron main process
|-- src/
|   |-- App.vue              # Root layout
|   |-- main.js              # Vue entry
|   |-- router/index.js      # Routes
|   |-- components/
|   |   `-- Sidebar.vue      # Session list and navigation
|   `-- views/
|       |-- ChatView.vue     # Main chat screen
|       `-- SettingsView.vue # API/model configuration
`-- vite.config.js           # Dev server and API proxy
```

## Requirements

- Node.js 18+
- npm 9+
- A backend service that exposes these endpoints:
  - `/api/v1/chat/completions`
  - `/api/v1/history/*`

In development, the frontend proxies `/api` requests to `http://localhost:8090`.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the Vite dev server:

```bash
npm run dev:vite
```

In another terminal, start Electron:

```bash
npm run dev:electron
```

For a simple local run against an already built frontend:

```bash
npm start
```

## Usage

1. Open the settings page.
2. Add one or more model configurations:
   - API endpoint
   - model name
   - API key
3. Return to the chat page and select a model.
4. Start chatting.

You can paste images from the clipboard or attach files from disk before sending a message.

## Attachment Behavior

- Image attachments are converted in the renderer process to Data URLs before request submission.
- Non-image files are currently attached as metadata only.
- Message history stores structured user content so attachments can be reconstructed in the UI.

## Notes

- API keys are stored in `localStorage` on the client side.
- This repository is the Electron/Vue frontend. The history and chat APIs are expected to be provided by a separate backend service.
- In development, route history uses `hash` mode for Electron compatibility.

## Scripts

- `npm run dev:vite`: start the Vite dev server on port `5173`
- `npm run dev:electron`: start Electron
- `npm start`: launch Electron

## Current Limitations

- No packaging workflow is included yet.
- No automated tests are configured.
- Non-image file uploads are not sent as binary content.
- Backend implementation is not part of this repository.

## License

ISC
