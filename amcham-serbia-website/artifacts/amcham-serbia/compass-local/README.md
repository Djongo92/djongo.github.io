# Compass on this laptop (offline demo)

In the staff console, Compass has a **Runs on: Cloud / This laptop** switch.
"This laptop" sends free-form questions to a model running locally in
[Ollama](https://ollama.com), so nothing leaves the machine. It never
falls back to the cloud. If the local model is not running, Compass says
so and answers only what it can work out itself.

Built-in answers (the rehearsed Showcase questions, the Today brief, and the
drafts) never needed a network in the first place, so they work offline in
either mode.

## Setup (once, on the presenting laptop)

1. Install Ollama from https://ollama.com.
2. Pull a model. A 7–8B instruct model is a good fit for a laptop:

   ```sh
   ollama pull qwen2.5:7b
   ```

   Compass picks the first installed model from qwen2.5, qwen3, llama3.1,
   llama3.2, gemma3, gemma2 and mistral, in that order. Test Serbian answers
   before relying on them; small models are noticeably weaker in Serbian.

3. Start Ollama so the demo site is allowed to talk to it:

   ```sh
   OLLAMA_ORIGINS="*" ollama serve
   ```

   (On macOS, quit the Ollama menu-bar app first, or set the variable with
   `launchctl setenv OLLAMA_ORIGINS "*"` and restart the app.)

4. Use **Chrome or Edge**. The site is served over HTTPS and calls
   `http://localhost:11434`; Chromium browsers allow that, but may first ask
   to "access other apps and services on this device" — click **Allow**.
   Safari blocks it. To avoid browser questions entirely, run the site
   locally instead (`npm run build && npm run serve`, then open
   `http://localhost:5000/djongo.github.io/amcham-preview/`).

## The moment in the room

1. Open the console, open Compass, switch **Runs on** to **This laptop**.
   The status should read "Ready · <model> · works offline".
2. Turn Wi-Fi off in front of the room.
3. Ask something off-script that names no single company, for example
   "If I had one free hour this afternoon, what should I spend it on?"
   The answer is labelled "Private model · stayed on this laptop".
4. Switch back to **Cloud** and ask again. The answer shows "names and amounts
   removed" with a **What was sent** link showing the placeholders.

Rehearse it once on the venue's network and keep a screen recording as a
fallback.
