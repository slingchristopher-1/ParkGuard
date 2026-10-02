// The native projects are generated, so the permissions background tracking
// needs are applied here rather than edited by hand — this runs on every sync
// and is idempotent.
//
// The plugin's own manifest already declares the foreground service and the
// foreground-location permissions; Gradle merges those. What it deliberately
// leaves to the app is ACCESS_BACKGROUND_LOCATION, because tracking with the
// app closed is the app's decision to ask for.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const brands = fs.readdirSync(path.join(root, 'brands'));

for (const brand of brands) {
  const { name } = JSON.parse(
    fs.readFileSync(path.join(root, 'brands', brand, 'brand.json'), 'utf8')
  );
  patchAndroid(path.join(root, 'native', brand, 'android'), brand);
  patchIos(path.join(root, 'native', brand, 'ios'), brand, name);
}

function patchAndroid(dir, brand) {
  const file = path.join(dir, 'app/src/main/AndroidManifest.xml');
  if (!fs.existsSync(file)) return;

  let xml = fs.readFileSync(file, 'utf8');
  const perm = '<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />';
  if (xml.includes('ACCESS_BACKGROUND_LOCATION')) {
    console.log(`${brand} android: already patched`);
    return;
  }
  xml = xml.replace('</manifest>', `    ${perm}\n</manifest>`);
  fs.writeFileSync(file, xml);
  console.log(`${brand} android: added background location permission`);
}

function patchIos(dir, brand, appName) {
  const file = path.join(dir, 'App/App/Info.plist');
  if (!fs.existsSync(file)) return;

  let plist = fs.readFileSync(file, 'utf8');
  if (plist.includes('NSLocationAlwaysAndWhenInUseUsageDescription')) {
    console.log(`${brand} ios: already patched`);
    return;
  }

  const why = `${appName} watches for when you park and drive off, so it can offer to start and stop your parking session.`;
  const entries = [
    `\t<key>NSLocationWhenInUseUsageDescription</key>`,
    `\t<string>${why}</string>`,
    `\t<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>`,
    `\t<string>${why}</string>`,
    `\t<key>UIBackgroundModes</key>`,
    `\t<array>`,
    `\t\t<string>location</string>`,
    `\t</array>`,
  ].join('\n');

  plist = plist.replace(/\n<\/dict>\n<\/plist>/, `\n${entries}\n</dict>\n</plist>`);
  fs.writeFileSync(file, plist);
  console.log(`${brand} ios: added location usage keys and background mode`);
}
