const JUDGE0_URL = process.env.JUDGE0_URL || "https://ce.judge0.com";

export type Judge0SubmissionResult = {
  token: string;
  status: {
    id: number;
    description: string;
  };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
};

export async function submitToJudge0(params: {
  languageId: number;
  sourceCode: string;
  stdin?: string;
  cpuTimeLimit?: number;
  wallTimeLimit?: number;
  memoryLimit?: number;
}): Promise<Judge0SubmissionResult> {
  const response = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      language_id: params.languageId,
      source_code: params.sourceCode,
      stdin: params.stdin ?? "",
      cpu_time_limit: params.cpuTimeLimit ?? 5,
      wall_time_limit: params.wallTimeLimit ?? 10,
      memory_limit: params.memoryLimit ?? 256000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Judge0 submission failed (${response.status}): ${text}`);
  }

  const submission = await response.json() as { token?: string };

  if (!submission.token) {
    throw new Error("Judge0 did not return a submission token");
  }

  const token = submission.token;

  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const resultResponse = await fetch(
      `${JUDGE0_URL}/submissions/${encodeURIComponent(token)}?base64_encoded=false`,
    );

    if (!resultResponse.ok) {
      const text = await resultResponse.text();
      throw new Error(`Judge0 result request failed (${resultResponse.status}): ${text}`);
    }

    const result = await resultResponse.json() as Judge0SubmissionResult;

    if (result.status && result.status.id > 2) {
      return result;
    }
  }

  throw new Error("Judge0 submission timed out while waiting for a result");
}

export const JUDGE0_LANGUAGE_IDS = {
  javascript: 97,
  typescript: 101,
  python: 100,
  java: 91,
} as const;
