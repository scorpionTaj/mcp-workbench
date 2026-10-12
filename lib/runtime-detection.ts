/**
 * Runtime Detection Utility
 * Automatically detects available Node.js, Bun, and package managers
 */

import { exec } from "child_process";
import { promisify } from "util";
import logger from "./logger";

const execAsync = promisify(exec);

export type Runtime = "node" | "bun";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface RuntimeInfo {
  runtime: Runtime;
  version: string;
  path: string;
  available: boolean;
}

export interface PackageManagerInfo {
  name: PackageManager;
  version: string;
  path: string;
  available: boolean;
}

export interface DetectedEnvironment {
  runtimes: {
    node?: RuntimeInfo;
    bun?: RuntimeInfo;
  };
  packageManagers: {
    npm?: PackageManagerInfo;
    pnpm?: PackageManagerInfo;
    yarn?: PackageManagerInfo;
    bun?: PackageManagerInfo;
  };
  preferredRuntime: Runtime;
  preferredPackageManager: PackageManager;
}

/**
 * Detect if a command is available and get its version
 */
async function detectCommand(
  command: string,
  versionFlag: string = "--version"
): Promise<{ available: boolean; version?: string; path?: string }> {
  try {
    // Check if command exists
    const whereCommand = process.platform === "win32" ? "where" : "which";
    const { stdout: pathOutput } = await execAsync(
      `${whereCommand} ${command}`
    );
    const path = pathOutput.trim().split("\n")[0];

    // Get version
    const { stdout: versionOutput } = await execAsync(
      `${command} ${versionFlag}`
    );
    const version = versionOutput.trim().split("\n")[0];

    return {
      available: true,
      version,
      path,
    };
  } catch (error) {
    return { available: false };
  }
}

/**
 * Detect Node.js runtime
 */
async function detectNode(): Promise<RuntimeInfo | undefined> {
  const result = await detectCommand("node");
  if (!result.available) return undefined;

  return {
    runtime: "node",
    version: result.version || "unknown",
    path: result.path || "node",
    available: true,
  };
}

/**
 * Detect Bun runtime
 */
async function detectBun(): Promise<RuntimeInfo | undefined> {
  const result = await detectCommand("bun");
  if (!result.available) return undefined;

  return {
    runtime: "bun",
    version: result.version || "unknown",
    path: result.path || "bun",
    available: true,
  };
}

/**
 * Detect npm package manager
 */
async function detectNpm(): Promise<PackageManagerInfo | undefined> {
  const result = await detectCommand("npm");
  if (!result.available) return undefined;

  return {
    name: "npm",
    version: result.version || "unknown",
    path: result.path || "npm",
    available: true,
  };
}

/**
 * Detect pnpm package manager
 */
async function detectPnpm(): Promise<PackageManagerInfo | undefined> {
  const result = await detectCommand("pnpm");
  if (!result.available) return undefined;

  return {
    name: "pnpm",
    version: result.version || "unknown",
    path: result.path || "pnpm",
    available: true,
  };
}

/**
 * Detect yarn package manager
 */
async function detectYarn(): Promise<PackageManagerInfo | undefined> {
  const result = await detectCommand("yarn");
  if (!result.available) return undefined;

  return {
    name: "yarn",
    version: result.version || "unknown",
    path: result.path || "yarn",
    available: true,
  };
}

/**
 * Detect Bun package manager (when used as a package manager)
 */
async function detectBunPm(): Promise<PackageManagerInfo | undefined> {
  const result = await detectCommand("bun");
  if (!result.available) return undefined;

  return {
    name: "bun",
    version: result.version || "unknown",
    path: result.path || "bun",
    available: true,
  };
}

/**
 * Determine preferred runtime based on what's available
 * Priority: Bun > Node
 */
function determinePreferredRuntime(runtimes: {
  node?: RuntimeInfo;
  bun?: RuntimeInfo;
}): Runtime {
  if (runtimes.bun?.available) return "bun";
  if (runtimes.node?.available) return "node";
  return "node"; // Default fallback
}

/**
 * Determine preferred package manager based on what's available
 * Priority: pnpm > bun > yarn > npm
 */
function determinePreferredPackageManager(packageManagers: {
  npm?: PackageManagerInfo;
  pnpm?: PackageManagerInfo;
  yarn?: PackageManagerInfo;
  bun?: PackageManagerInfo;
}): PackageManager {
  if (packageManagers.pnpm?.available) return "pnpm";
  if (packageManagers.bun?.available) return "bun";
  if (packageManagers.yarn?.available) return "yarn";
  if (packageManagers.npm?.available) return "npm";
  return "npm"; // Default fallback
}

/**
 * Detect all available runtimes and package managers
 */
export async function detectEnvironment(): Promise<DetectedEnvironment> {
  logger.info("MCP Workbench Detecting runtime environment...");

  // Detect runtimes in parallel
  const [node, bun] = await Promise.all([detectNode(), detectBun()]);

  // Detect package managers in parallel
  const [npm, pnpm, yarn, bunPm] = await Promise.all([
    detectNpm(),
    detectPnpm(),
    detectYarn(),
    detectBunPm(),
  ]);

  const runtimes = {
    ...(node && { node }),
    ...(bun && { bun }),
  };

  const packageManagers = {
    ...(npm && { npm }),
    ...(pnpm && { pnpm }),
    ...(yarn && { yarn }),
    ...(bunPm && { bun: bunPm }),
  };

  const environment: DetectedEnvironment = {
    runtimes,
    packageManagers,
    preferredRuntime: determinePreferredRuntime(runtimes),
    preferredPackageManager: determinePreferredPackageManager(packageManagers),
  };

  logger.info(
    {
      availableRuntimes: Object.keys(runtimes),
      availablePackageManagers: Object.keys(packageManagers),
      preferred: {
        runtime: environment.preferredRuntime,
        packageManager: environment.preferredPackageManager,
      },
    },
    "MCP Workbench Runtime environment detected"
  );

  return environment;
}

/**
 * Get the command to run an MCP server based on detected environment
 */
export function getMCPRunCommand(
  serverCommand: string,
  runtime?: Runtime,
  packageManager?: PackageManager
): string {
  const rt = runtime || "node";
  const pm = packageManager || "npm";

  // If the command already includes a runtime, return as is
  if (
    serverCommand.startsWith("node ") ||
    serverCommand.startsWith("bun ") ||
    serverCommand.startsWith("npm ") ||
    serverCommand.startsWith("pnpm ") ||
    serverCommand.startsWith("yarn ")
  ) {
    return serverCommand;
  }

  // If it's a package manager command (npx, pnpx, etc.)
  if (serverCommand.startsWith("npx ")) {
    const command = serverCommand.replace("npx ", "");
    switch (pm) {
      case "pnpm":
        return `pnpm dlx ${command}`;
      case "yarn":
        return `yarn dlx ${command}`;
      case "bun":
        return `bunx ${command}`;
      default:
        return serverCommand;
    }
  }

  // If it's a script file, prepend runtime
  if (
    serverCommand.endsWith(".js") ||
    serverCommand.endsWith(".ts") ||
    serverCommand.endsWith(".mjs")
  ) {
    return `${rt} ${serverCommand}`;
  }

  // Otherwise, return as is
  return serverCommand;
}

/**
 * Get install command for an MCP server package
 */
export function getInstallCommand(
  packageName: string,
  packageManager?: PackageManager,
  global: boolean = false
): string {
  const pm = packageManager || "npm";
  const globalFlag = global ? "-g" : "";

  switch (pm) {
    case "pnpm":
      return `pnpm add ${global ? "-g" : ""} ${packageName}`;
    case "yarn":
      return `yarn ${global ? "global add" : "add"} ${packageName}`;
    case "bun":
      return `bun add ${global ? "-g" : ""} ${packageName}`;
    case "npm":
    default:
      return `npm install ${globalFlag} ${packageName}`;
  }
}

// Cache the environment detection result
let cachedEnvironment: DetectedEnvironment | null = null;

/**
 * Get cached environment or detect it
 */
export async function getEnvironment(): Promise<DetectedEnvironment> {
  if (!cachedEnvironment) {
    cachedEnvironment = await detectEnvironment();
  }
  return cachedEnvironment;
}

/**
 * Clear the environment cache (useful for testing or when environment changes)
 */
export function clearEnvironmentCache(): void {
  cachedEnvironment = null;
}
