import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import {
  getEnvironment,
  getInstallCommand,
  getMCPRunCommand,
} from "@/lib/runtime-detection";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  let serverId: string | undefined;
  try {
    const resolvedParams = await params;
    serverId = resolvedParams.serverId;

    logger.info(`MCP Workbench Installing MCP server: ${serverId}`);

    // Detect runtime environment
    const environment = await getEnvironment();
    const { preferredRuntime, preferredPackageManager } = environment;

    logger.info(
      {
        serverId,
        runtime: preferredRuntime,
        packageManager: preferredPackageManager,
        availableRuntimes: Object.keys(environment.runtimes),
        availablePackageManagers: Object.keys(environment.packageManagers),
      },
      "MCP Workbench Detected environment for installation"
    );

    // Get the install command
    const installCommand = getInstallCommand(
      serverId,
      preferredPackageManager,
      true // Install globally
    );

    logger.info(
      { serverId, command: installCommand },
      "MCP Workbench Executing install command"
    );

    // In production, this would execute the install command
    // For now, we simulate it
    try {
      // Uncomment to actually install:
      // const { stdout, stderr } = await execAsync(installCommand);
      // logger.info({ stdout, stderr }, 'MCP Workbench Install output');

      // Simulate installation delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return NextResponse.json({
        success: true,
        serverId,
        environment: {
          runtime: preferredRuntime,
          packageManager: preferredPackageManager,
        },
        command: installCommand,
      });
    } catch (installError: any) {
      logger.error(
        { err: installError, serverId, command: installCommand },
        "MCP Workbench Failed to execute install command"
      );

      return NextResponse.json(
        {
          error: "Installation failed",
          details: installError.message,
          command: installCommand,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error(
      { err: error, serverId },
      "MCP Workbench Error installing server"
    );
    return NextResponse.json(
      { error: "Failed to install server" },
      { status: 500 }
    );
  }
}
