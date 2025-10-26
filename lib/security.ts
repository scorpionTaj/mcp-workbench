/**
 * Security utilities for command validation and sanitization
 */

// Blocked terminal commands and patterns
const BLOCKED_TERMINAL_COMMANDS = [
  // Destructive file operations
  /\brm\b.*-rf/i,
  /\brm\b.*-fr/i,
  /\brmdir\b.*\/s/i,
  /\bdel\b.*\/[sfq]/i,
  /\berase\b/i,
  /\bformat\b/i,
  /\bmkfs\b/i,
  /\bdd\b.*if=/i,

  // System operations
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bhalt\b/i,
  /\bpoweroff\b/i,
  /\binit\b\s+[06]/i,

  // Privilege escalation
  /\bsudo\b/i,
  /\bsu\b\s/i,
  /\brunas\b/i,
  /\bchmod\b.*777/i,
  /\bchown\b/i,

  // Network attacks
  /\bnmap\b/i,
  /\bnetcat\b/i,
  /\bnc\b\s+-/i,
  /\bwget\b.*\|\s*bash/i,
  /\bcurl\b.*\|\s*bash/i,
  /\bcurl\b.*\|\s*sh/i,

  // Process manipulation
  /\bkill\b.*-9\s+1\b/i,
  /\bkillall\b/i,
  /\bpkill\b/i,

  // Disk operations
  /\bmount\b/i,
  /\bumount\b/i,
  /\bfdisk\b/i,
  /\bparted\b/i,

  // System file modification
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\/boot\//i,
  /\/sys\//i,
  /\/proc\//i,
  /HKEY_/i,

  // Dangerous redirects and pipes
  />.*\/dev\/(null|zero|random|urandom)/i,
  />\s*\/dev\/sd[a-z]/i,

  // Cron/scheduled tasks
  /\bcrontab\b/i,
  /\bat\b\s+/i,
  /\bschtasks\b/i,

  // Fork bombs
  /:\(\)\s*{\s*:\|:&\s*}\s*;:/i,

  // Encoding/obfuscation attempts
  /\bbase64\b.*-d/i,
  /\bxxd\b/i,
  /\\x[0-9a-f]{2}/i,
];

// Blocked Python imports and functions
const BLOCKED_PYTHON_PATTERNS = [
  // System/OS operations
  /\bimport\s+os\b/i,
  /\bfrom\s+os\b/i,
  /\bimport\s+subprocess\b/i,
  /\bfrom\s+subprocess\b/i,
  /\bimport\s+shutil\b/i,
  /\bfrom\s+shutil\b/i,

  // Dynamic code execution
  /\b__import__\s*\(/i,
  /\beval\s*\(/i,
  /\bexec\s*\(/i,
  /\bcompile\s*\(/i,
  /\bglobals\s*\(/i,
  /\blocals\s*\(/i,
  /\bvars\s*\(/i,
  /\bdir\s*\(/i,

  // File system access
  /\bopen\s*\(.*['"]\/etc/i,
  /\bopen\s*\(.*['"]\/sys/i,
  /\bopen\s*\(.*['"]\/proc/i,
  /\bopen\s*\(.*['"]\/boot/i,
  /\bopen\s*\(.*['"]c:\\/i,
  /\bopen\s*\(.*['"]\\\\/i,

  // Network operations
  /\bimport\s+socket\b/i,
  /\bfrom\s+socket\b/i,
  /\bimport\s+urllib\b/i,
  /\bfrom\s+urllib\b/i,
  /\bimport\s+requests\b/i,
  /\bfrom\s+requests\b/i,
  /\bimport\s+http\b/i,
  /\bfrom\s+http\b/i,

  // System inspection
  /\bimport\s+sys\b/i,
  /\bfrom\s+sys\b/i,
  /\bimport\s+platform\b/i,
  /\bfrom\s+platform\b/i,

  // Process manipulation
  /\bimport\s+signal\b/i,
  /\bfrom\s+signal\b/i,
  /\bimport\s+multiprocessing\b/i,
  /\bfrom\s+multiprocessing\b/i,

  // Code introspection
  /\bimport\s+inspect\b/i,
  /\bfrom\s+inspect\b/i,
  /\bimport\s+importlib\b/i,
  /\bfrom\s+importlib\b/i,

  // Pickle (can execute arbitrary code)
  /\bimport\s+pickle\b/i,
  /\bfrom\s+pickle\b/i,
  /\bimport\s+shelve\b/i,
  /\bfrom\s+shelve\b/i,
];

// Allowed Python packages for data science/ML
const ALLOWED_PYTHON_IMPORTS = [
  "numpy",
  "np",
  "pandas",
  "pd",
  "matplotlib",
  "plt",
  "seaborn",
  "sns",
  "scipy",
  "sklearn",
  "tensorflow",
  "tf",
  "torch",
  "plotly",
  "json",
  "csv",
  "math",
  "random",
  "datetime",
  "collections",
  "itertools",
  "functools",
  "re",
];

interface ValidationResult {
  allowed: boolean;
  reason?: string;
  blockedPattern?: string;
}

/**
 * Validate a terminal command for security risks
 */
export function validateTerminalCommand(command: string): ValidationResult {
  const trimmedCommand = command.trim();

  // Check if command is empty
  if (!trimmedCommand) {
    return {
      allowed: false,
      reason: "Empty command",
    };
  }

  // Check against blocked patterns
  for (const pattern of BLOCKED_TERMINAL_COMMANDS) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: "Command contains blocked pattern",
        blockedPattern: pattern.source,
      };
    }
  }

  // Check for command chaining that could be used to bypass filters
  const chainingPatterns = [
    /;\s*rm\b/i,
    /\|\s*rm\b/i,
    /&&\s*rm\b/i,
    /\|\|\s*rm\b/i,
  ];

  for (const pattern of chainingPatterns) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: "Command chaining with blocked command detected",
        blockedPattern: pattern.source,
      };
    }
  }

  // Check for suspicious environment variable usage
  if (/\$\{?IFS\}?/i.test(command)) {
    return {
      allowed: false,
      reason: "Suspicious environment variable usage (IFS)",
    };
  }

  return { allowed: true };
}

/**
 * Validate Python code for security risks
 */
export function validatePythonCode(code: string): ValidationResult {
  const trimmedCode = code.trim();

  // Check if code is empty
  if (!trimmedCode) {
    return {
      allowed: false,
      reason: "Empty code",
    };
  }

  // Check against blocked patterns
  for (const pattern of BLOCKED_PYTHON_PATTERNS) {
    if (pattern.test(code)) {
      return {
        allowed: false,
        reason: "Code contains blocked pattern",
        blockedPattern: pattern.source,
      };
    }
  }

  // Check for suspicious string operations that could bypass filters
  const obfuscationPatterns = [
    /getattr\s*\(/i,
    /setattr\s*\(/i,
    /delattr\s*\(/i,
    /hasattr\s*\(/i,
    /__dict__/i,
    /__class__/i,
    /__bases__/i,
    /__subclasses__/i,
    /__builtins__/i,
  ];

  for (const pattern of obfuscationPatterns) {
    if (pattern.test(code)) {
      return {
        allowed: false,
        reason: "Code contains obfuscation or introspection pattern",
        blockedPattern: pattern.source,
      };
    }
  }

  // Warn about file operations (but allow read-only operations in workspace)
  if (/\bopen\s*\(/i.test(code) && !/['"]r['"]/.test(code)) {
    const hasWriteMode = /['"][wa+]['"]/.test(code);
    if (hasWriteMode && !/\.workspace/i.test(code)) {
      return {
        allowed: false,
        reason: "File write operations outside workspace are not allowed",
      };
    }
  }

  return { allowed: true };
}

/**
 * Sanitize command output to prevent information leakage
 */
export function sanitizeOutput(output: string): string {
  // Remove potential sensitive information
  let sanitized = output;

  // Remove potential API keys and tokens
  sanitized = sanitized.replace(/[a-zA-Z0-9_-]{32,}/g, "[REDACTED]");

  // Remove potential passwords in connection strings
  sanitized = sanitized.replace(/:\/\/[^:]+:[^@]+@/g, "://[REDACTED]@");

  // Remove absolute file paths (keep relative paths)
  sanitized = sanitized.replace(/[A-Z]:\\.+/g, "[PATH]");
  sanitized = sanitized.replace(/\/(?:home|Users|root)\/.+/g, "[PATH]");

  return sanitized;
}

/**
 * Get security level description
 */
export function getSecurityInfo() {
  return {
    terminalCommandsBlocked: BLOCKED_TERMINAL_COMMANDS.length,
    pythonPatternsBlocked: BLOCKED_PYTHON_PATTERNS.length,
    allowedPythonImports: ALLOWED_PYTHON_IMPORTS,
    features: [
      "Blocks destructive file operations (rm -rf, del, format)",
      "Blocks system operations (shutdown, reboot)",
      "Blocks privilege escalation (sudo, su, runas)",
      "Blocks network attacks (nmap, netcat)",
      "Blocks Python system access (os, subprocess)",
      "Blocks Python dynamic code execution (eval, exec)",
      "Blocks Python network operations (socket, requests)",
      "Allows safe data science imports (numpy, pandas, matplotlib, etc.)",
      "Sanitizes output to prevent information leakage",
    ],
  };
}
