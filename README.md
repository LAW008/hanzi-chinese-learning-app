# Hanzi — Chinese learning app

Hanzi is a cheerful, beginner-friendly Mandarin learning app for English speakers. It is a static web app with no build step, account, paid API, or external credentials.

## Run locally

1. Open the project folder in File Explorer.
2. Double-click `index.html` to open the app in a modern browser.
3. Select **Learning path**, open the first available lesson, and complete its short exercises.

The app works from a local file. A local web server can also be used if you prefer. Mandarin audio uses the browser's built-in text-to-speech and an installed Chinese voice. Microphone speaking practice depends on browser speech-recognition support and microphone permission; pinyin typing is available as a fallback.

## What's included

- Ten beginner units and 50 lessons, all available from the beginning.
- Matching, multiple choice, listening, pinyin typing, sentence ordering, translation, and optional speaking exercises.
- A searchable 30,000-entry Mandarin dictionary that includes the 104 guided beginner words used in lessons, with simplified characters, toned pinyin, and English glosses.
- XP, hearts, a daily streak, lesson stars, badges, and a course progress dashboard.
- Flashcards with spaced repetition and due-word review.
- Progress saved in browser localStorage, with a reset option.

Progress is local to the browser and device where you use the app.

Vocabulary-source and attribution details are in [VOCABULARY-LICENSES.md](VOCABULARY-LICENSES.md).

## Publish on GitHub Pages

Pushing to `law008-chinese-learning-app` runs `.github/workflows/pages.yml`, builds the static site, and deploys the `www/` output. GitHub Pages must be available for the repository; private-repository Pages availability and site visibility depend on the owner's GitHub plan and repository settings.

## iOS app

The web app can also be packaged for iOS with Capacitor. See [APP_STORE.md](APP_STORE.md) for Mac/Xcode requirements, build and device-test steps, and App Store preparation notes. The native iOS project must be generated and signed on macOS; the regular web app remains usable without Capacitor or Node.js.
