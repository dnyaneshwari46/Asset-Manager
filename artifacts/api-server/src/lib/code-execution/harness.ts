type Language = "javascript" | "typescript" | "python" | "java";

type ProblemConfig = {
  functionName: string;
  javaClassName?: string;
  javaMethodName?: string;
};

const PROBLEM_CONFIG: Record<string, ProblemConfig> = {
  "Two Sum": { functionName: "twoSum", javaClassName: "Solution", javaMethodName: "twoSum" },
  "Valid Parentheses": { functionName: "isValid", javaClassName: "Solution", javaMethodName: "isValid" },
  "Binary Search": { functionName: "search", javaClassName: "Solution", javaMethodName: "search" },
  "Best Time to Buy and Sell Stock": { functionName: "maxProfit", javaClassName: "Solution", javaMethodName: "maxProfit" },
  "Maximum Subarray": { functionName: "maxSubArray", javaClassName: "Solution", javaMethodName: "maxSubArray" },
  "Merge Intervals": { functionName: "merge", javaClassName: "Solution", javaMethodName: "merge" },
  "Longest Substring Without Repeating Characters": { functionName: "lengthOfLongestSubstring", javaClassName: "Solution", javaMethodName: "lengthOfLongestSubstring" },
  "Number of Islands": { functionName: "numIslands", javaClassName: "Solution", javaMethodName: "numIslands" },
  "Product of Array Except Self": { functionName: "productExceptSelf", javaClassName: "Solution", javaMethodName: "productExceptSelf" },
  "Trapping Rain Water": { functionName: "trap", javaClassName: "Solution", javaMethodName: "trap" },
};

function getConfig(problemTitle: string): ProblemConfig {
  const config = PROBLEM_CONFIG[problemTitle];

  if (!config) {
    throw new Error(`Unsupported coding problem: ${problemTitle}`);
  }

  return config;
}

function buildJavaScriptHarness(
  problemTitle: string,
  userCode: string,
  input: string,
): string {
  const config = getConfig(problemTitle);

  return `
${userCode}

const input = [${input}];
const result = ${config.functionName}(...input);
console.log("__RESULT__" + JSON.stringify(result));
`;
}

function buildTypeScriptHarness(
  problemTitle: string,
  userCode: string,
  input: string,
): string {
  const config = getConfig(problemTitle);

  return `
// Judge0 TypeScript compiler configuration
/// <reference lib="es2015" />

declare const process: {
  stdout: {
    write(value: string): void;
  };
};

${userCode}

const input: any[] = [${input}];
const result = (${config.functionName} as any)(...input);

process.stdout.write("__RESULT__" + JSON.stringify(result));
`;
}

function buildPythonHarness(
  problemTitle: string,
  userCode: string,
  input: string,
): string {
  const config = getConfig(problemTitle);

  return `
${userCode}

input_data = [${input}]
result = ${config.functionName}(*input_data)
print("__RESULT__" + __import__("json").dumps(result))
`;
}

function sanitizeJavaCode(userCode: string): string {
  return userCode
    .replace(/^\s*package\s+[^;]+;\s*/m, "")
    .replace(/public\s+class\s+Solution\b/g, "class Solution");
}

function buildJavaInvocation(problemTitle: string, input: string): string {
  const config = getConfig(problemTitle);
  const method = config.javaMethodName ?? config.functionName;

  switch (problemTitle) {
    case "Two Sum":
      return `
int[] nums = parseIntArray("${input.split(",")[0].replace(/"/g, '\\"')}");
int target = Integer.parseInt("${input.split(",").slice(1).join(",").trim()}");
int[] result = solution.${method}(nums, target);
System.out.println("__RESULT__" + java.util.Arrays.toString(result));
`;

    case "Valid Parentheses":
      return `
String s = ${input};
boolean result = solution.${method}(s);
System.out.println("__RESULT__" + result);
`;

    case "Binary Search":
      return `
int[] nums = parseIntArray("${input.split(",")[0].replace(/"/g, '\\"')}");
int target = Integer.parseInt("${input.split(",").slice(1).join(",").trim()}");
int result = solution.${method}(nums, target);
System.out.println("__RESULT__" + result);
`;

    case "Best Time to Buy and Sell Stock":
      return `
int[] prices = parseIntArray("${input.replace(/"/g, '\\"')}");
int result = solution.${method}(prices);
System.out.println("__RESULT__" + result);
`;

    case "Maximum Subarray":
      return `
int[] nums = parseIntArray("${input.replace(/"/g, '\\"')}");
int result = solution.${method}(nums);
System.out.println("__RESULT__" + result);
`;

    case "Merge Intervals":
      return `
int[][] intervals = parse2DIntArray("${input.replace(/"/g, '\\"')}");
int[][] result = solution.${method}(intervals);
System.out.println("__RESULT__" + java.util.Arrays.deepToString(result));
`;

    case "Longest Substring Without Repeating Characters":
      return `
String s = ${input};
int result = solution.${method}(s);
System.out.println("__RESULT__" + result);
`;

    case "Number of Islands":
      return `
char[][] grid = parseCharGrid("${input.replace(/"/g, '\\"')}");
int result = solution.${method}(grid);
System.out.println("__RESULT__" + result);
`;

    case "Product of Array Except Self":
      return `
int[] nums = parseIntArray("${input.replace(/"/g, '\\"')}");
int[] result = solution.${method}(nums);
System.out.println("__RESULT__" + java.util.Arrays.toString(result));
`;

    case "Trapping Rain Water":
      return `
int[] height = parseIntArray("${input.replace(/"/g, '\\"')}");
int result = solution.${method}(height);
System.out.println("__RESULT__" + result);
`;

    default:
      throw new Error(`Unsupported Java problem: ${problemTitle}`);
  }
}

function buildJavaHarness(
  problemTitle: string,
  userCode: string,
  input: string,
): string {
  const config = getConfig(problemTitle);
  const safeCode = sanitizeJavaCode(userCode);
  const invocation = buildJavaInvocation(problemTitle, input);

  return `
import java.util.*;

${safeCode}

public class Main {

  static int[] parseIntArray(String value) {
    value = value.trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      value = value.substring(1, value.length() - 1).trim();
    }

    if (value.isEmpty()) return new int[0];

    String[] parts = value.split(",");
    int[] result = new int[parts.length];

    for (int i = 0; i < parts.length; i++) {
      result[i] = Integer.parseInt(parts[i].trim());
    }

    return result;
  }

  static int[][] parse2DIntArray(String value) {
    value = value.trim();

    if (value.length() <= 4) return new int[0][0];

    value = value.substring(1, value.length() - 1).trim();

    List<int[]> rows = new ArrayList<>();
    int depth = 0;
    StringBuilder current = new StringBuilder();

    for (char c : value.toCharArray()) {
      if (c == '[') depth++;
      if (c == ']') depth--;

      current.append(c);

      if (depth == 0 && c == ']') {
        rows.add(parseIntArray(current.toString()));
        current.setLength(0);
      }
    }

    return rows.toArray(new int[0][]);
  }

  static char[][] parseCharGrid(String value) {
    value = value.trim();

    if (value.length() <= 4) return new char[0][0];

    value = value.substring(1, value.length() - 1).trim();

    List<char[]> rows = new ArrayList<>();
    int depth = 0;
    StringBuilder current = new StringBuilder();

    for (char c : value.toCharArray()) {
      if (c == '[') depth++;
      if (c == ']') depth--;

      current.append(c);

      if (depth == 0 && c == ']') {
        String row = current.toString()
          .replace("[", "")
          .replace("]", "")
          .replace("\"", "")
          .trim();

        String[] cells = row.split(",");
        char[] chars = new char[cells.length];

        for (int i = 0; i < cells.length; i++) {
          String cell = cells[i].trim();
          if (!cell.isEmpty()) chars[i] = cell.charAt(0);
        }

        rows.add(chars);
        current.setLength(0);
      }
    }

    return rows.toArray(new char[0][]);
  }

  public static void main(String[] args) {
    ${config.javaClassName} solution = new ${config.javaClassName}();
    ${invocation}
  }
}
`;
}

export function buildHarness(
  problemTitle: string,
  language: Language,
  userCode: string,
  input: string,
): string {
  switch (language) {
    case "javascript":
      return buildJavaScriptHarness(problemTitle, userCode, input);

    case "typescript":
      return buildTypeScriptHarness(problemTitle, userCode, input);

    case "python":
      return buildPythonHarness(problemTitle, userCode, input);

    case "java":
      return buildJavaHarness(problemTitle, userCode, input);

    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

export function extractResult(stdout: string | null): string | null {
  if (!stdout) return null;

  const marker = "__RESULT__";
  const index = stdout.lastIndexOf(marker);

  if (index === -1) return null;

  return stdout.slice(index + marker.length).trim();
}

export function valuesEqual(actual: string, expected: string): boolean {
  try {
    return JSON.stringify(JSON.parse(actual)) ===
      JSON.stringify(JSON.parse(expected));
  } catch {
    return actual.trim() === expected.trim();
  }
}

