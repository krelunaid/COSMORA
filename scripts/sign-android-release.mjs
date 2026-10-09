#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import {
  chmod, link, lstat, mkdtemp, readFile, realpath, rm, stat, writeFile,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';

const PRIVATE_DIR = join(homedir(), '.config/kreluna/cosmora/android-upload');
const CREDENTIAL_FIELDS = {"storePassword":["store_password"],"keyPassword":["key_password"],"keystore":["keystore"],"alias":["alias"]};
const ALIAS = 'cosmora-upload';
const STORE_PASSWORD_ENV = 'COSMORA_JARSIGNER_STORE_PASSWORD';
const KEY_PASSWORD_ENV = 'COSMORA_JARSIGNER_KEY_PASSWORD';
const HELP = `Firma un AAB COSMORA usando la chiave privata già configurata.

Uso:
  node scripts/sign-android-release.mjs --input FILE.aab --output FILE-FIRMATO.aab
    [--metadata FILE.json] [--jarsigner /percorso/bin/jarsigner]

L'output deve essere nuovo. Nessuna chiave viene creata o modificata.
Credenziali: ~/.config/kreluna/cosmora/android-upload/credentials.json
Alias richiesto: cosmora-upload
`;

function parseArguments(argv) {
  const allowed = new Set(['--input', '--output', '--metadata', '--jarsigner']);
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const option = argv[i];
    if (!allowed.has(option) || Object.hasOwn(values, option)) {
      throw new Error('Argomento sconosciuto o duplicato. Usa --help.');
    }
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error('Valore di argomento mancante. Usa --help.');
    values[option] = value;
  }
  if (!values['--input'] || !values['--output']) throw new Error('Sono richiesti --input e --output.');
  return values;
}

function field(document, segments, label) {
  let value = document;
  for (const key of segments) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) {
      throw new Error(`Credenziali incomplete: ${label}.`);
    }
    value = value[key];
  }
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Credenziali non valide: ${label}.`);
  }
  return value;
}

async function requirePrivatePath(path, type) {
  const info = await lstat(path);
  if (info.isSymbolicLink() || (type === 'file' ? !info.isFile() : !info.isDirectory())) {
    throw new Error('Il percorso privato deve essere un file o una cartella regolare, senza collegamenti simbolici.');
  }
  if ((info.mode & 0o077) !== 0 || (typeof process.getuid === 'function' && info.uid !== process.getuid())) {
    throw new Error('Chiave, credenziali e cartella privata devono essere accessibili soltanto al proprietario (file 600, cartella 700).');
  }
  return info;
}

async function newDestination(path, extension) {
  if (extname(path).toLowerCase() !== extension) throw new Error(`Estensione di output richiesta: ${extension}.`);
  const absolute = resolve(path);
  const parent = await realpath(dirname(absolute));
  const destination = join(parent, basename(absolute));
  try {
    await lstat(destination);
  } catch (error) {
    if (error.code === 'ENOENT') return destination;
    throw error;
  }
  throw new Error('Il file di output esiste già: non verrà sovrascritto.');
}

async function sha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

function runJava(executable, args, env, step) {
  const result = spawnSync(executable, args, {
    env, shell: false, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 180_000, maxBuffer: 2 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    // Never forward tool output or child environment: they may contain sensitive data.
    throw new Error(`${step} non riuscita. Verifica JDK, keystore e credenziali; nessun output finale è stato pubblicato.`);
  }
  return result.stdout;
}

async function main() {
  if (process.argv.length === 3 && ['--help', '-h'].includes(process.argv[2])) {
    console.log(HELP);
    return;
  }
  const options = parseArguments(process.argv.slice(2));
  const input = await realpath(resolve(options['--input']));
  if (extname(input).toLowerCase() !== '.aab' || !(await stat(input)).isFile()) {
    throw new Error('L’input deve essere un file AAB esistente.');
  }
  const output = await newDestination(options['--output'], '.aab');
  const metadataPath = options['--metadata'] ? await newDestination(options['--metadata'], '.json') : null;
  if (input === output) throw new Error('Input e output devono essere distinti.');

  await requirePrivatePath(PRIVATE_DIR, 'directory');
  const privateRoot = await realpath(PRIVATE_DIR);
  const credentialsPath = join(privateRoot, 'credentials.json');
  const credentialInfo = await requirePrivatePath(credentialsPath, 'file');
  if (credentialInfo.size > 64 * 1024) throw new Error('File credenziali di dimensione inattesa.');
  let credentials;
  try {
    credentials = JSON.parse(await readFile(credentialsPath, 'utf8'));
  } catch {
    throw new Error('Impossibile leggere il JSON delle credenziali.');
  }
  const storePassword = field(credentials, CREDENTIAL_FIELDS.storePassword, 'password keystore');
  const keyPassword = field(credentials, CREDENTIAL_FIELDS.keyPassword, 'password chiave');
  const configuredKeystore = field(credentials, CREDENTIAL_FIELDS.keystore, 'percorso keystore');
  const configuredAlias = field(credentials, CREDENTIAL_FIELDS.alias, 'alias');
  if (configuredAlias !== ALIAS) throw new Error('L’alias configurato non è cosmora-upload.');
  const keystore = resolve(privateRoot, configuredKeystore);
  const keyRelative = relative(privateRoot, keystore);
  if (!keyRelative || keyRelative.startsWith('..') || isAbsolute(keyRelative)) {
    throw new Error('Il keystore deve trovarsi nella cartella privata android-upload.');
  }
  await requirePrivatePath(keystore, 'file');
  if (await realpath(keystore) !== keystore) throw new Error('Il keystore non può attraversare collegamenti simbolici.');

  const jarsigner = options['--jarsigner'] || (process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin/jarsigner') : 'jarsigner');
  const childEnv = {
    ...process.env,
    [STORE_PASSWORD_ENV]: storePassword,
    [KEY_PASSWORD_ENV]: keyPassword,
  };
  // Prevent inherited Java injection/debug options from logging secrets or altering signing.
  for (const name of ['JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'JDK_JAVA_OPTIONS']) delete childEnv[name];
  let staging;
  let published = false;
  try {
    staging = await mkdtemp(join(dirname(output), '.cosmora-signing-'));
    const signed = join(staging, 'signed.aab');
    runJava(jarsigner, [
      '-J-Duser.language=en', '-J-Duser.country=US',
      '-keystore', keystore,
      '-storepass:env', STORE_PASSWORD_ENV, '-keypass:env', KEY_PASSWORD_ENV,
      '-digestalg', 'SHA-256', '-sigalg', 'SHA256withRSA',
      '-signedjar', signed, input, ALIAS,
    ], childEnv, 'Firma');
    const verification = runJava(jarsigner, [
      '-J-Duser.language=en', '-J-Duser.country=US', '-verify', signed,
    ], { ...childEnv, [STORE_PASSWORD_ENV]: '', [KEY_PASSWORD_ENV]: '' }, 'Verifica della firma');
    if (!/jar verified\./i.test(verification)) throw new Error('La verifica non conferma una firma valida.');
    const signedInfo = await stat(signed);
    const record = {
      signedAt: new Date().toISOString(),
      inputFile: basename(input), outputFile: basename(output), alias: ALIAS,
      inputSha256: await sha256(input), signedSha256: await sha256(signed),
      signedBytes: signedInfo.size, signatureVerified: true,
    };
    await chmod(signed, 0o644);
    // link() fails if another process has created the destination: never overwrite.
    await link(signed, output);
    published = true;
    if (metadataPath) await writeFile(metadataPath, `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx', mode: 0o644 });
    console.log(`AAB firmato: ${output}`);
    console.log(`SHA-256: ${record.signedSha256}`);
    if (metadataPath) console.log(`Metadati pubblici: ${metadataPath}`);
  } catch (error) {
    if (published) console.error(`L’AAB firmato è stato salvato in ${output}; il salvataggio dei metadati non è riuscito.`);
    throw error;
  } finally {
    delete childEnv[STORE_PASSWORD_ENV];
    delete childEnv[KEY_PASSWORD_ENV];
    credentials = null;
    if (staging) await rm(staging, { recursive: true, force: true });
  }
}

main().catch((error) => {
  // Unexpected filesystem errors can include private paths: publish only a generic diagnostic.
  console.error(error.code ? 'Operazione non riuscita: controlla percorsi, permessi e disponibilità del JDK.' : error.message);
  process.exitCode = 1;
});
