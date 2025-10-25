import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Maximum execution time (10 seconds)
const MAX_EXECUTION_TIME = 10000;

// Maximum output size (1MB)
const MAX_OUTPUT_SIZE = 1024 * 1024;

export async function POST(request: Request) {
  try {
    const { command } = await request.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { error: "Command is required" },
        { status: 400 }
      );
    }

    // Security: Block dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf/i,
      /del\s+\/[sfq]/i,
      /format\s+[a-z]:/i,
      /shutdown/i,
      /reboot/i,
      />.*\|/,
      /&\s*$/,
    ];

    if (dangerousPatterns.some((pattern) => pattern.test(command))) {
      return NextResponse.json(
        { error: "Command not allowed for security reasons" },
        { status: 403 }
      );
    }

    console.log(`[Terminal] Executing: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: MAX_EXECUTION_TIME,
        maxBuffer: MAX_OUTPUT_SIZE,
        windowsHide: true,
      });

      return NextResponse.json({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: true,
      });
    } catch (error: any) {
      // Handle execution errors
      if (error.killed) {
        return NextResponse.json({
          error: "Command execution timed out",
          stderr: "Process was terminated due to timeout",
        });
      }

      return NextResponse.json({
        stdout: error.stdout?.trim() || "",
        stderr: error.stderr?.trim() || error.message,
        success: false,
      });
    }
  } catch (error) {
    console.error("[Terminal] Error:", error);
    return NextResponse.json(
      { error: "Failed to execute command" },
      { status: 500 }
    );
  }
}
