import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const appId = '1609311830149459';

void test('Android release shell initializes Meta App Events for the COSMORA app id', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  const gradle = read('android/app/build.gradle');
  const strings = read('android/app/src/main/res/values/strings.xml');
  const startup = read('android/app/src/main/java/it/kreluna/cosmora/MetaAppEvents.java');
  const application = read('android/app/src/main/java/it/kreluna/cosmora/CosmoraApplication.java');

  assert.match(gradle, /applicationId "com\.kreluna\.cosmora"/);
  assert.match(gradle, /com\.facebook\.android:facebook-core:19\.0\.0/);
  assert.match(gradle, /preReleaseBuild/);
  assert.match(strings, new RegExp(`<string name="facebook_app_id">${appId}</string>`));
  assert.match(manifest, /android:name="\.CosmoraApplication"/);
  assert.match(manifest, /com\.facebook\.sdk\.ApplicationId" android:value="@string\/facebook_app_id"/);
  assert.match(manifest, /com\.facebook\.sdk\.ClientToken" android:value="@string\/facebook_client_token"/);
  assert.match(manifest, /com\.facebook\.sdk\.AutoLogAppEventsEnabled" android:value="true"/);
  assert.match(manifest, /com\.facebook\.sdk\.AdvertiserIDCollectionEnabled" android:value="true"/);
  assert.match(startup, new RegExp(`APP_ID = "${appId}"`));
  assert.match(startup, /FacebookSdk\.sdkInitialize/);
  assert.match(startup, /setAdvertiserIDCollectionEnabled\(true\)/);
  assert.doesNotMatch(startup, /FacebookSdk\.setAutoLogAppEventsEnabled/);
  assert.match(application, /MetaAppEvents\.start\(this\)/);
  assert.match(read('android/facebook-client-token.properties.example'), /REPLACE_WITH_META_CLIENT_TOKEN/);
  assert.match(read('android/.gitignore'), /facebook-client-token\.properties/);
});

void test('iOS startup initializes Meta App Events and keeps the auth URL scheme', () => {
  const plist = read('ios/App/App/Info.plist');
  const appDelegate = read('ios/App/App/AppDelegate.swift');
  const sceneDelegate = read('ios/App/App/SceneDelegate.swift');
  const startup = read('ios/App/App/MetaAppEvents.swift');
  const project = read('ios/App/App.xcodeproj/project.pbxproj');

  assert.match(read('ios/Meta.xcconfig'), new RegExp(`FACEBOOK_APP_ID = ${appId}`));
  assert.match(plist, /<key>FacebookAppID<\/key>\s*<string>\$\(FACEBOOK_APP_ID\)<\/string>/);
  assert.match(plist, /<key>FacebookClientToken<\/key>\s*<string>\$\(FACEBOOK_CLIENT_TOKEN\)<\/string>/);
  assert.match(plist, /<key>FacebookAutoLogAppEventsEnabled<\/key>\s*<true\/>/);
  assert.match(plist, /<key>FacebookAdvertiserIDCollectionEnabled<\/key>\s*<true\/>/);
  assert.match(plist, /<string>com\.kreluna\.cosmora<\/string>/);
  assert.match(plist, new RegExp(`<string>fb${appId}<\\/string>`));
  assert.match(appDelegate, /MetaAppEvents\.start\(application: application, launchOptions: launchOptions\)/);
  assert.match(sceneDelegate, /MetaAppEvents\.handle\(url: context\.url\)/);
  assert.match(startup, /import FBSDKCoreKit/);
  assert.match(startup, new RegExp(`appID = "${appId}"`));
  assert.match(startup, /isAutoLogAppEventsEnabled = true/);
  assert.match(startup, /ApplicationDelegate\.shared\.application/);
  assert.match(project, /facebook-ios-sdk/);
  assert.match(project, /productName = "FacebookCore"/);
  assert.match(project, /version = 19\.0\.0/);
  assert.match(project, /MetaAppEvents\.swift in Sources/);
  assert.match(project, /check-meta-client-token\.sh/);
  assert.match(read('ios/FacebookClientToken.xcconfig.example'), /REPLACE_WITH_META_CLIENT_TOKEN/);
  assert.match(read('.gitignore'), /\/ios\/FacebookClientToken\.xcconfig/);
});

void test('release client-token check blocks placeholders and allows a token', () => {
  const script = join(root, 'ios/scripts/check-meta-client-token.sh');
  const run = (env: Record<string, string>) =>
    spawnSync(script, { env: { ...process.env, ...env }, encoding: 'utf8' });

  assert.equal(run({ CONFIGURATION: 'Debug', FACEBOOK_CLIENT_TOKEN: '' }).status, 0);
  const missing = run({ CONFIGURATION: 'Release', FACEBOOK_CLIENT_TOKEN: '' });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, new RegExp(appId));
  assert.notEqual(run({ CONFIGURATION: 'Release', FACEBOOK_CLIENT_TOKEN: 'REPLACE_WITH_META_CLIENT_TOKEN' }).status, 0);
  assert.equal(run({ CONFIGURATION: 'Release', FACEBOOK_CLIENT_TOKEN: 'a1b2c3d4e5f67890' }).status, 0);
});

void test('privacy notice discloses Meta install events and no client token is committed', () => {
  const privacy = read('app/privacy/page.tsx');
  assert.match(privacy, new RegExp(appId));
  assert.match(privacy, /fb_mobile_activate_app/);
  assert.match(privacy, /com\.kreluna\.cosmora/);
  assert.match(privacy, /it\.kreluna\.cosmora/);
  const committed = [
    'android/app/build.gradle',
    'android/app/src/main/res/values/strings.xml',
    'ios/Meta.xcconfig',
    'ios/FacebookClientToken.xcconfig.example',
    'android/facebook-client-token.properties.example',
    '.env.example',
  ].map(read).join('\n');
  assert.doesNotMatch(committed, /FACEBOOK_CLIENT_TOKEN\s*=\s*(?!REPLACE_WITH_META_CLIENT_TOKEN)[A-Za-z0-9_-]{16,}/);
});
