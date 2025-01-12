import { test, expect, mock, spyOn, beforeEach } from "bun:test";
import { appendFile } from "node:fs/promises";
import {
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
} from "./util.mjs"; // Adjust the import path as needed

// Create mocks for external functions
const mockAppendFile = mock(appendFile);
const mockLoggerInfo = mock(() => {});

// Mocking the `$` function globally
mock.module("Bun", () => ({
  $: mock(async () => ({})),
}));

// Re-import the `$` mock from `Bun`
import { $ } from "Bun"; // This will use the mocked version

// Mock the logger globally to use `spyOn` for method tracking
global.logger = {
  info: mockLoggerInfo,
};

// Reset mocks before each test case
beforeEach(() => {
  mockAppendFile.mockReset();
  $.mockReset();
  mockLoggerInfo.mockReset();
});
// Test `getDaysOld` utility function
test("getDaysOld calculates days correctly", () => {
  const lastModified = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago
  expect(getDaysOld(lastModified)).toBe(5);

  const zeroDaysAgo = Date.now(); // Now
  expect(getDaysOld(zeroDaysAgo)).toBe(0);

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
  expect(getDaysOld(thirtyDaysAgo)).toBe(30);
});

// Test `isCacheValid` function
test("isCacheValid returns true for valid cache", () => {
  const lastModified = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
  expect(isCacheValid(lastModified, 7)).toBe(true); // Expiry is 7 days
});

test("isCacheValid returns false for expired cache", () => {
  const lastModified = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
  expect(isCacheValid(lastModified, 7)).toBe(false); // Expiry is 7 days
});

// Test `identifyBrewPythonPackages`
test("identifyBrewPythonPackages correctly identifies Python-related packages", () => {
  const mockFormulae = [
    {
      name: "certbot",
      versions: { stable: "2.0.0" },
      dependencies: ["openssl", "python@3.9"],
    },
    {
      name: "ffmpeg",
      versions: { stable: "4.4" },
      dependencies: ["libass", "libvorbis"],
    },
    {
      name: "numpy",
      versions: { stable: "1.21.0" },
      dependencies: ["python@3.9"],
    },
  ];

  const result = identifyBrewPythonPackages(mockFormulae);
  expect(result).toEqual([
    {
      name: "certbot",
      version: "2.0.0",
      dependencies: ["openssl", "python@3.9"],
    },
    { name: "numpy", version: "1.21.0", dependencies: ["python@3.9"] },
  ]);
});

// Test `extractPythonVersions`
test("extractPythonVersions extracts unique Python versions", () => {
  const mockPackages = [
    { name: "certbot", dependencies: ["openssl", "python@3.9"] },
    { name: "numpy", dependencies: ["python@3.8", "python@3.9"] },
    { name: "scipy", dependencies: ["python@3.7"] },
  ];

  const result = extractPythonVersions(mockPackages);
  expect(result).toEqual(["python@3.9", "python@3.8", "python@3.7"]);
});

test("extractPythonVersions returns empty array when no Python dependencies found", () => {
  const mockPackages = [
    { name: "ffmpeg", dependencies: ["libass", "libvorbis"] },
    { name: "openssl", dependencies: ["zlib"] },
  ];

  const result = extractPythonVersions(mockPackages);
  expect(result).toEqual([]);
});

// Test `generateSymlinkCommands`
test("generateSymlinkCommands creates correct symlink commands", () => {
  const mockPythonDirs = [
    "/usr/local/Cellar/python@3.9/3.9.0",
    "/usr/local/Cellar/python@3.8/3.8.5",
  ];
  const pyenvRoot = "/Users/test/.pyenv";

  const result = generateSymlinkCommands(mockPythonDirs, pyenvRoot);
  expect(result).toEqual([
    "ln -s -f /usr/local/Cellar/python@3.9/3.9.0 /Users/test/.pyenv/versions/3.9.0-brew",
    "ln -s -f /usr/local/Cellar/python@3.8/3.8.5 /Users/test/.pyenv/versions/3.8.5-brew",
  ]);
});

test("generateSymlinkCommands handles empty directories array gracefully", () => {
  const result = generateSymlinkCommands([], "/Users/test/.pyenv");
  expect(result).toEqual([]);
});

// Test `fetchBrewFormulae`
test("fetchBrewFormulae returns correct Brew formulae data", async () => {
  $.mockResolvedValueOnce({ text: () => "formula1\nformula2\nformula3" }); // Mock `brew list --formula`
  $.mockResolvedValue({ json: () => ({ formulae: [{ name: "formula1" }] }) }); // Mock `brew info {formula}`

  const result = await fetchBrewFormulae();
  expect(result).toEqual([{ name: "formula1" }, { name: "formula1" }, { name: "formula1" }]);
  expect($.mock.calls.length).toBe(4); // One for list, three for info
});

// Test `uninstallBrewPythonVersions`
test("uninstallBrewPythonVersions calls brew uninstall for each version", async () => {
  const mockPythonVersions = ["python@3.9", "python@3.8"];
  await uninstallBrewPythonVersions(mockPythonVersions);

  expect($.mock.calls.length).toBe(2);
  expect($.mock.calls[0][0].includes("brew uninstall --ignore-dependencies python@3.9")).toBe(true);
  expect($.mock.calls[1][0].includes("brew uninstall --ignore-dependencies python@3.8")).toBe(true);
  expect(mockLoggerInfo.mock.calls.length).toBe(2);
});

// Test `installPyenvVersions`
test("installPyenvVersions installs correct pyenv versions", async () => {
  const mockPythonVersions = ["python@3.9", "python@3.8"];
  await installPyenvVersions(mockPythonVersions);

  expect($.mock.calls.length).toBe(2);
  expect($.mock.calls[0][0].includes("pyenv install -s 3.9")).toBe(true);
  expect($.mock.calls[1][0].includes("pyenv install -s 3.8")).toBe(true);
  expect(mockLoggerInfo.mock.calls[0][0]).toBe("Installed equivalent pyenv-managed Python versions.");
});

// Test `createSymlinks`
test("createSymlinks executes all symlink commands and calls pyenv rehash", async () => {
  const mockSymlinkCommands = [
    "ln -s -f /usr/local/Cellar/python@3.9/3.9.0 /Users/test/.pyenv/versions/3.9.0-brew",
    "ln -s -f /usr/local/Cellar/python@3.8/3.8.5 /Users/test/.pyenv/versions/3.8.5-brew",
  ];
  await createSymlinks(mockSymlinkCommands);

  expect($.mock.calls.length).toBe(3); // Two symlink commands + one `pyenv rehash`
  expect($.mock.calls[0][0]).toBe(mockSymlinkCommands[0]);
  expect($.mock.calls[1][0]).toBe(mockSymlinkCommands[1]);
  expect($.mock.calls[2][0].includes("pyenv rehash")).toBe(true);
});

// Test `reinstallBrewPackages`
test("reinstallBrewPackages reinstalls each Brew package", async () => {
  const mockBrewPackages = [{ name: "certbot" }, { name: "numpy" }];
  await reinstallBrewPackages(mockBrewPackages);

  expect($.mock.calls.length).toBe(2);
  expect($.mock.calls[0][0].includes("brew reinstall certbot")).toBe(true);
  expect($.mock.calls[1][0].includes("brew reinstall numpy")).toBe(true);
  expect(mockLoggerInfo.mock.calls[0][0]).toBe("Reinstalled Brew package: certbot");
  expect(mockLoggerInfo.mock.calls[1][0]).toBe("Reinstalled Brew package: numpy");
});

// Test `updateZshrc`
test("updateZshrc appends pyenv init configuration to .zshrc", async () => {
  const mockZshrcPath = "/Users/test/.zshrc";
  await updateZshrc(mockZshrcPath);

  // Check if appendFile was called with the correct path and content
  expect(mockAppendFile).toHaveBeenCalledWith(
    mockZshrcPath,
    `
if command -v pyenv 1>/dev/null 2>&1; then
  eval "$(pyenv init --path)"
  eval "$(pyenv init -)"
fi
`
  );
  expect(mockLoggerInfo.mock.calls[0][0]).toBe("Updated .zshrc to prioritize pyenv over Brew-managed Python.");
});