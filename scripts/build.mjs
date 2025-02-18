import { execa } from 'execa';
import { createSpinner } from 'nanospinner';
import { resolve, join } from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

import { logger } from './logger.mjs';

const DEFAULT_PACKAGE_MANAGER = 'pnpm';
const DEFAULT_HOMEBREW_PACKAGE_MANAGER = 'brew';
const DEFAULT_LINUX_PACKAGE_MANAGER = 'apt';
const CWD = process.cwd();

// Build the compiler binary
const PKG_CORE = resolve(CWD, './packages/core');

// Build cli
const PKG_CLI = resolve(CWD, './packages/cli');

// Build rust_plugin_react
const PKG_RUST_PLUGIN = resolve(CWD, './rust-plugins');

// Build js_plugin_path
const PKG_JS_PLUGIN = resolve(CWD, './js-plugins');

export async function runTaskQueue() {
  // The sass plug-in uses protobuf, so you need to determine whether the user installs it or not.
  await installProtoBuf();
  await runTask('Cli', buildCli);
  await runTask('Core', buildCore);
  await runTask('RustPlugins', buildRustPlugins);
  await runTask('JsPlugins', buildJsPlugins);
  await runTask('Artifacts', copyArtifacts);
}

// install mac protobuf
export const installMacProtobuf = () =>
  execa(DEFAULT_HOMEBREW_PACKAGE_MANAGER, ['install', 'protobuf'], {
    cwd: CWD
  });

// install linux protobuf
export const installLinuxProtobuf = () =>
  execa(DEFAULT_LINUX_PACKAGE_MANAGER, ['install', '-y', 'protobuf-compiler'], {
    cwd: CWD
  });

// build core command
export const buildCore = () =>
  execa(DEFAULT_PACKAGE_MANAGER, ['build:rs'], {
    cwd: PKG_CORE
  });

// build cli command
export const buildCli = () =>
  execa(DEFAULT_PACKAGE_MANAGER, ['build'], {
    cwd: PKG_CLI
  });

// build rust plugins
export const rustPlugins = () => batchBuildPlugins(PKG_RUST_PLUGIN);

// build js plugins
export const jsPlugins = () => batchBuildPlugins(PKG_JS_PLUGIN);

export const buildJsPlugins = () => Promise.all(jsPlugins());

export const buildRustPlugins = () => Promise.all(rustPlugins());

export const copyArtifacts = () =>
  batchBuildPlugins(PKG_RUST_PLUGIN, 'copy-artifacts');

export async function runTask(
  taskName,
  task,
  processText = 'Building',
  finishedText = 'Build'
) {
  const spinner = createSpinner(`${processText} ${taskName}`).start();
  try {
    await task();
    spinner.success({ text: `${finishedText} ${taskName} completed!` });
  } catch (e) {
    spinner.error({ text: `${finishedText} ${taskName} failed!` });
    console.error(e.toString());
    process.exit(1);
  }
}

export function resolveNodeVersion() {
  const currentVersion = process.versions.node;
  const requiredMajorVersion = parseInt(currentVersion.split('.')[0], 10);
  const minimumMajorVersion = 16;

  if (requiredMajorVersion < minimumMajorVersion) {
    logger(`Farm does not support using Node.js v${currentVersion}!`);
    logger(`Please use Node.js v${minimumMajorVersion} or higher.`);
    process.exit(1);
  }
}

export function batchBuildPlugins(
  baseDir,
  command = 'build',
  packageManager = 'pnpm'
) {
  const pluginNameMap = fs
    .readdirSync(baseDir)
    .filter((file) => fs.statSync(join(baseDir, file)).isDirectory());
  const path = pluginNameMap.map((subDir) => resolve(baseDir, subDir));
  return path.map((item) => {
    return execa(packageManager, [command], { cwd: item });
  });
}

export function isMac() {
  const platform = os.platform();
  return platform === 'darwin';
}

export function isLinux() {
  const platform = os.platform();
  return platform === 'linux';
}

export function isWindows() {
  const platform = os.platform();
  return platform === 'win32';
}

export async function checkProtobuf() {
  try {
    if (isWindows()) {
      await execa('where', ['protoc']);
    } else if (isMac() || isLinux()) {
      await execa('which', ['protoc']);
    }
    return true;
  } catch (error) {
    return false;
  }
}

export async function installProtoBuf() {
  if (!(await checkProtobuf())) {
    logger(
      'Due to the use of protoc in the project, we currently judge that you have not installed. we need to install protobuf locally to make the project start successfully. \n- For mac users, will be use your local `homebrew` tool for installation. \n- For linux users, we will use your local `apt` tool for installation. \n- For Windows users, because the protobuf plugin cannot be installed automatically, You need to install manually according to the prompts \n',
      { title: 'INFO' }
    );
    if (isMac()) {
      await runTask('Protobuf', installMacProtobuf, 'Install', 'Install');
    }
    if (isLinux()) {
      await runTask('Protobuf', installLinuxProtobuf, 'Install', 'Install');
    }
    if (isWindows()) {
      logger(
        'If you are using a windows system, you can install it in the following ways:\n 1. open https://github.com/protocolbuffers/protobuf \n If you are a 32-bit operating system install https://github.com/protocolbuffers/protobuf/releases/download/v21.7/protoc-21.7-win32.zip \n If you are a 64-bit operating system install https://github.com/protocolbuffers/protobuf/releases/download/v21.7/protoc-21.7-win64.zip \n 2. After installation, find the path you installed, and copy the current path, adding to the environment variable of windows \n\n Or you can directly check out the following article to install \n https://www.geeksforgeeks.org/how-to-install-protocol-buffers-on-windows/'
      );
      process.exit(1);
    }
  }
}
