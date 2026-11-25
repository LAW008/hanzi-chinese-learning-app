# Preparing Hanzi for the Apple App Store

Hanzi remains a static web app. Capacitor packages a copy of the same app files into an iOS app; the browser version and PWA continue to run from the project root. Lessons, vocabulary, text-to-speech, and local progress work without a hosted backend. Progress is stored on the device and is not synced to other devices.

## What is prepared

- Capacitor 8 configuration and an asset-copy build step for the existing static app.
- iOS safe-area layout, larger mobile controls, system-font fallbacks, and locally bundled vocabulary.
- No remote web fonts, analytics, ads, account, or runtime service dependency.
- Pinyin typing is used instead of microphone speech recognition in the native wrapper until a native speech integration and its permission/privacy disclosures are added; web speech recognition remains unchanged on supported browsers.
- An original Hanzi mascot icon source for generating native icons.
- A privacy-manifest source declaring no tracking or collected data. The sync script copies it into the generated iOS app folder; confirm it is included in the App target in Xcode.

The bundle identifier in `capacitor.config.json` is `com.law008.hanzi`. Confirm that this is the identifier you want and that it is available in your Apple Developer account before creating the App Store Connect record. A bundle identifier cannot be changed after an app is published.

## Build and test on a Mac

You need a Mac with Xcode 26 or newer, Xcode Command Line Tools, Node.js 22 or newer, and an Apple Developer account for App Store distribution. Capacitor 8 uses Swift Package Manager by default; CocoaPods is not required for this app.

1. Check out the `law008-chinese-learning-app` branch on the Mac.
2. In Terminal, change to the project folder and run:

   ```sh
   npm install
   npm run ios:setup
   ```

   `ios:setup` builds the existing static app into the generated `www` folder, adds Capacitor's iOS project, creates native app icons from `assets/icon-only.png`, syncs the web assets, and copies the privacy manifest into the iOS app folder. Run it only once.

3. Open the generated `ios/App/App.xcodeproj` with `npm run ios:open`. In Xcode, add `ios/App/App/PrivacyInfo.xcprivacy` to the **App** target if it is not already in the project navigator with target membership enabled.
4. Select an iPhone simulator or a connected device, check the bundle identifier and signing team under **Signing & Capabilities**, then build and run.
5. For subsequent web changes, run `npm run ios:sync`.
6. Test on a real iPhone as well as a simulator: cold launch and offline launch; navigation through all 50 independently startable lessons; lesson completion, XP, hearts, and local progress after force-quit/relaunch; reset progress; search and paginate the 30,000-word dictionary; flashcard review; Mandarin text-to-speech and the pinyin speaking fallback; keyboard visibility; safe-area layout; and light/dark appearance.
7. To archive, select **Any iOS Device (arm64)** in Xcode and choose **Product → Archive**. Validate the archive, upload it to App Store Connect, complete the app record and privacy details, then submit it for review from App Store Connect.

The Windows web preview can verify the shared UI, but cannot build, sign, run, archive, or upload an iOS app. Those steps require macOS/Xcode and Apple account access. No build or submission has been performed from this worktree.

## App Store Connect items to prepare

- Final bundle identifier, app name, subtitle, category, age rating, and availability.
- Support URL and a public privacy-policy URL. The current app stores learning state locally and has no account or analytics; describe this accurately in the privacy policy and App Privacy answers. Reassess these declarations if plugins, analytics, accounts, or network services are added.
- Required iPhone/iPad screenshots, product description, keywords, and review notes. Explain that lessons and progress are on-device and that no sign-in is required.
- A test plan for both speaking paths. Native iOS packaging currently uses pinyin typing for the optional speaking exercise and does not request microphone access; the web version retains browser speech recognition where supported. Verify Mandarin text-to-speech on the target iOS versions and devices.
- A release review of vocabulary accuracy and generated example sentences. The expanded dictionary contains licensed source data and generated examples; see `VOCABULARY-LICENSES.md`.

App Review is Apple's decision. A Capacitor package alone does not ensure acceptance: Apple can reject apps that provide insufficient native-app value or have incomplete metadata, privacy disclosures, or quality. The existing offline lessons, dictionary, flashcards, and locally saved learning path make the packaged app useful without a website account, but test the submitted build carefully against the current App Review Guidelines.

## Capacitor maintenance

The generated `www/` folder and `node_modules/` are build artifacts and are intentionally ignored by Git. Keep the generated `ios/` project under version control after creating it on a Mac, so signing settings and native project changes are preserved. Do not edit generated files under `www/`; make web changes in the project-root source files and run `npm run ios:sync`.
