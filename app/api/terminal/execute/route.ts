import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { validateTerminalCommand, sanitizeOutput } from "@/lib/security";

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

    // Security validation
    const validation = validateTerminalCommand(command);
    if (!validation.allowed) {
      console.warn(`[Terminal Security] Blocked command: ${command}`);
      console.warn(`[Terminal Security] Reason: ${validation.reason}`);

      return NextResponse.json(
        {
          error: "Command blocked for security reasons",
          reason: validation.reason,
          blockedPattern: validation.blockedPattern,
        },
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

      // Sanitize output to prevent information leakage
      const sanitizedStdout = sanitizeOutput(stdout.trim());
      const sanitizedStderr = sanitizeOutput(stderr.trim());

      return NextResponse.json({
        stdout: sanitizedStdout,
        stderr: sanitizedStderr,
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
        stdout: sanitizeOutput(error.stdout?.trim() || ""),
        stderr: sanitizeOutput(error.stderr?.trim() || error.message),
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
