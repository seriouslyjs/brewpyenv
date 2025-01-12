import { $ } from "bun";
import path from "node:path";
import { appendFile } from "node:fs/promises";
import winston from "winston";

// Define logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "pyenv_migration.log" }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Constants
const PYENV_ROOT = process.env.PYENV_ROOT || `${process.env.HOME}/.pyenv`;

/**
 * Utility: Calculate the number of days old a timestamp is.
 * @param {number} lastModified - Timestamp of the last modification.
 * @param {number} currentTime - Current timestamp.
 * @returns {number} - Number of days old.
 */
function getDaysOld(lastModified, currentTime = Date.now()) {
  return Math.floor((currentTime - lastModified) / (1000 * 60 * 60 * 24));
}

/**
 * Core Logic: Determine if cache is valid.
 * @param {number} lastModified - Last modification timestamp of the cache.
 * @param {number} expiryDays - Expiry threshold in days.
 * @returns {boolean} - Returns true if cache is valid, false otherwise.
 */
function isCacheValid(lastModified, expiryDays) {
  return getDaysOld(lastModified) < expiryDays;
}

/**
 * Core Logic: Identify Brew Python packages based on dependency data.
 * @param {Array} formulae - Array of Brew formulae data.
 * @returns {Array} - List of Brew Python packages.
 */
function identifyBrewPythonPackages(formulae) {
  return formulae
    .filter((formula) => formula.dependencies.some((dep) => dep.startsWith("python@")))
    .map((formula) => ({
      name: formula.name,
      version: formula.versions.stable,
      dependencies: formula.dependencies,
    }));
}

/**
 * Core Logic: Filter and extract Python versions from packages.
 * @param {Array} packages - Array of Brew package data.
 * @returns {Array} - Unique list of Python versions.
 */
function extractPythonVersions(packages) {
  const versions = packages.flatMap((pkg) =>
    pkg.dependencies.filter((dep) => dep.startsWith("python@"))
  );
  return [...new Set(versions)];
}

/**
 * Core Logic: Generate symlink commands for Brew binaries.
 * @param {Array} pythonDirs - List of Brew Python directories.
 * @param {string} pyenvRoot - Root directory of pyenv installations.
 * @returns {Array} - Array of symlink commands.
 */
function generateSymlinkCommands(pythonDirs, pyenvRoot) {
  return pythonDirs.map((versionPath) => {
    const versionName = path.basename(versionPath);
    return `ln -s -f ${versionPath} ${path.join(pyenvRoot, "versions", `${versionName}-brew`)}`;
  });
}

/**
 * Async Operations: Fetch Brew formulae information.
 * @returns {Array} - List of Brew formulae data.
 */
async function fetchBrewFormulae() {
  const formulaList = (await $`brew list --formula`.text()).split("\n").filter(Boolean);
  const formulae = [];
  for (const formula of formulaList) {
    const info = await $`brew info ${formula} --json=v2 2>/dev/null`.json();
    formulae.push(info.formulae[0]);
  }
  return formulae;
}

/**
 * Async Operations: Uninstall Brew-managed Python versions.
 * @param {Array} pythonVersions - List of Brew-managed Python versions to uninstall.
 */
async function uninstallBrewPythonVersions(pythonVersions) {
  for (const version of pythonVersions) {
    await $`brew uninstall --ignore-dependencies ${version} 2>/dev/null`.quiet();
    logger.info(`Uninstalled Brew-managed Python version: ${version}`);
  }
}

/**
 * Async Operations: Install pyenv-managed Python versions.
 * @param {Array} pythonVersions - List of Python versions to install.
 */
async function installPyenvVersions(pythonVersions) {
  const pyenvInstallPromises = pythonVersions.map((version) => {
    const pyVersion = version.replace("python@", "");
    return $`pyenv install -s ${pyVersion}`; // `-s` flag skips if already installed
  });
  await Promise.all(pyenvInstallPromises);
  logger.info("Installed equivalent pyenv-managed Python versions.");
}

/**
 * Async Operations: Create symlinks for Brew binaries in pyenv.
 * @param {Array} symlinkCommands - Array of symlink command strings.
 */
async function createSymlinks(symlinkCommands) {
  for (const cmd of symlinkCommands) {
    await $`${cmd}`.quiet();
    logger.info(`Executed symlink command: ${cmd}`);
  }
  await $`pyenv rehash`;
}

/**
 * Async Operations: Reinstall Brew packages using pyenv-managed Python.
 * @param {Array} brewPackages - List of Brew packages to reinstall.
 */
async function reinstallBrewPackages(brewPackages) {
  for (const pkg of brewPackages) {
    await $`brew reinstall ${pkg.name} 2>/dev/null`.quiet();
    logger.info(`Reinstalled Brew package: ${pkg.name}`);
  }
}

/**
 * Async Operations: Update `.zshrc` to prioritize pyenv.
 * @param {string} zshrcPath - Path to the `.zshrc` file.
 */
async function updateZshrc(zshrcPath) {
  const zshrcContent = `
if command -v pyenv 1>/dev/null 2>&1; then
  eval "$(pyenv init --path)"
  eval "$(pyenv init -)"
fi
`;
  await appendFile(zshrcPath, zshrcContent);
  logger.info("Updated .zshrc to prioritize pyenv over Brew-managed Python.");
}

// Export core logic functions and async operations for testing
export {
  getDaysOld,
  isCacheValid,
  identifyBrewPythonPackages,
  extractPythonVersions,
  generateSymlinkCommands,
  fetchBrewFormulae,
  uninstallBrewPythonVersions,
  installPyenvVersions,
  createSymlinks,
  reinstallBrewPackages,
  updateZshrc,
  logger,
};
