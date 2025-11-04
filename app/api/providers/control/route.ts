import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

/**
 * Provider Control API
 * Attempts to start/stop Ollama and LM Studio
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, action } = body;

    if (!provider || !action) {
      return NextResponse.json(
        { error: "Provider and action are required" },
        { status: 400 }
      );
    }

    if (!["ollama", "lmstudio"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    if (!["start", "stop", "status"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    let result: any = { success: false };

    if (provider === "ollama") {
      if (action === "start") {
        // Try to start Ollama
        try {
          // On Windows, check if Ollama is installed and try to start it
          if (process.platform === "win32") {
            // Check if Ollama is already running
            try {
              const { stdout } = await execAsync(
                'tasklist /FI "IMAGENAME eq ollama.exe"'
              );
              if (stdout.includes("ollama.exe")) {
                result = {
                  success: true,
                  message: "Ollama is already running",
                };
              } else {
                // Try to start Ollama
                try {
                  await execAsync(
                    'start "" "C:\\Program Files\\Ollama\\ollama.exe" serve',
                    {
                      windowsHide: true,
                    }
                  );
                  result = {
                    success: true,
                    message: "Ollama started successfully",
                  };
                } catch (startError) {
                  result = {
                    success: false,
                    message:
                      "Failed to start Ollama. Please ensure it's installed in C:\\Program Files\\Ollama\\ or start it manually.",
                  };
                }
              }
            } catch (error) {
              result = {
                success: false,
                message: "Failed to check Ollama status",
              };
            }
          } else {
            // On macOS/Linux, try to start Ollama
            try {
              await execAsync("ollama serve &");
              result = {
                success: true,
                message: "Ollama started successfully",
              };
            } catch (error) {
              result = {
                success: false,
                message:
                  "Failed to start Ollama. Please ensure it's installed or start it manually.",
              };
            }
          }
        } catch (error) {
          result = { success: false, message: "Error starting Ollama" };
        }
      } else if (action === "stop") {
        // Try to stop Ollama
        try {
          if (process.platform === "win32") {
            await execAsync('taskkill /IM "ollama.exe" /F');
            result = { success: true, message: "Ollama stopped successfully" };
          } else {
            await execAsync("pkill ollama");
            result = { success: true, message: "Ollama stopped successfully" };
          }
        } catch (error) {
          result = {
            success: false,
            message: "Failed to stop Ollama or it's not running",
          };
        }
      }
    } else if (provider === "lmstudio") {
      if (action === "start") {
        result = {
          success: false,
          message:
            "LM Studio must be started manually. Please open LM Studio and start the local server on port 1234.",
        };
      } else if (action === "stop") {
        result = {
          success: false,
          message:
            "LM Studio must be stopped manually. Please close the LM Studio application.",
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[Provider Control] Error:", error);
    return NextResponse.json(
      { error: "Failed to control provider", success: false },
      { status: 500 }
    );
  }
}
