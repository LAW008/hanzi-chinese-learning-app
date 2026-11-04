const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "PrivacyInfo.xcprivacy");
const destination = path.join(root, "ios", "App", "App", "PrivacyInfo.xcprivacy");

async function copyPrivacyManifest() {
  await fs.access(path.join(root, "ios", "App", "App"));
  await fs.copyFile(source, destination);
  console.log("Copied the privacy manifest into the iOS app source folder.");
  console.log("Add PrivacyInfo.xcprivacy to the App target in Xcode if it is not already included.");
}

copyPrivacyManifest().catch((error) => {
  console.error("Could not copy the iOS privacy manifest.", error);
  process.exitCode = 1;
});
