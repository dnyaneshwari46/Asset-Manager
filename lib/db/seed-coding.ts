import { db, codingProblemsTable } from "./src/index.ts";
const problems = [
  {
    title: "Two Sum",
    description:
      "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.",
    difficulty: "easy",
    languages: ["javascript", "typescript", "python", "java"],
    starterCode: {
      javascript:
        "function twoSum(nums, target) {\n  // Write your solution here\n}",
      typescript:
        "function twoSum(nums: number[], target: number): number[] {\n  // Write your solution here\n}",
      python:
        "def two_sum(nums, target):\n    # Write your solution here\n    pass",
      java:
        "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}",
    },
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "nums[0] + nums[1] = 9",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
        explanation: "nums[1] + nums[2] = 6",
      },
    ],
    testCases: [
      { input: "[2,7,11,15],9", expected: "[0,1]" },
      { input: "[3,2,4],6", expected: "[1,2]" },
      { input: "[3,3],6", expected: "[0,1]" },
    ],
    constraints: "2 <= nums.length <= 10^4. Each input has exactly one solution.",
    timeLimit: 30,
  },
  {
    title: "Valid Parentheses",
    description:
      "Given a string containing brackets, determine if the input string has valid matching and properly nested parentheses.",
    difficulty: "easy",
    languages: ["javascript", "typescript", "python", "java"],
    starterCode: {
      javascript:
        "function isValid(s) {\n  // Write your solution here\n}",
      typescript:
        "function isValid(s: string): boolean {\n  // Write your solution here\n}",
      python:
        "def is_valid(s):\n    # Write your solution here\n    pass",
      java:
        "class Solution {\n    public boolean isValid(String s) {\n        // Write your solution here\n        return false;\n    }\n}",
    },
    examples: [
      {
        input: 's = "()"',
        output: "true",
        explanation: "The brackets are correctly matched.",
      },
      {
        input: 's = "()[]{}"',
        output: "true",
        explanation: "All brackets are correctly matched.",
      },
      {
        input: 's = "(]"',
        output: "false",
        explanation: "The opening parenthesis does not match the closing bracket.",
      },
    ],
    testCases: [
      { input: '"()"', expected: "true" },
      { input: '"()[]{}"', expected: "true" },
      { input: '"(]"', expected: "false" },
      { input: '"([)]"', expected: "false" },
    ],
    constraints: "1 <= s.length <= 10^4.",
    timeLimit: 30,
  },
  {
    title: "Binary Search",
    description:
      "Given a sorted array of integers and a target value, return the index of the target if it exists. Otherwise return -1.",
    difficulty: "easy",
    languages: ["javascript", "typescript", "python", "java"],
    starterCode: {
      javascript:
        "function search(nums, target) {\n  // Write your solution here\n}",
      typescript:
        "function search(nums: number[], target: number): number {\n  // Write your solution here\n}",
      python:
        "def search(nums, target):\n    # Write your solution here\n    pass",
      java:
        "class Solution {\n    public int search(int[] nums, int target) {\n        // Write your solution here\n        return -1;\n    }\n}",
    },
    examples: [
      {
        input: "nums = [-1,0,3,5,9,12], target = 9",
        output: "4",
        explanation: "The target 9 is at index 4.",
      },
      {
        input: "nums = [-1,0,3,5,9,12], target = 2",
        output: "-1",
        explanation: "The target does not exist.",
      },
    ],
    testCases: [
      { input: "[-1,0,3,5,9,12],9", expected: "4" },
      { input: "[-1,0,3,5,9,12],2", expected: "-1" },
      { input: "[5],5", expected: "0" },
    ],
    constraints: "1 <= nums.length <= 10^4. nums is sorted in ascending order.",
    timeLimit: 30,
  },
  {
    title: "Best Time to Buy and Sell Stock",
    description:
      "Given an array of stock prices where prices[i] is the price on day i, find the maximum profit from buying once and selling once.",
    difficulty: "easy",
    languages: ["javascript", "typescript", "python", "java"],
    starterCode: {
      javascript:
        "function maxProfit(prices) {\n  // Write your solution here\n}",
      typescript:
        "function maxProfit(prices: number[]): number {\n  // Write your solution here\n}",
      python:
        "def max_profit(prices):\n    # Write your solution here\n    pass",
      java:
        "class Solution {\n    public int maxProfit(int[] prices) {\n        // Write your solution here\n        return 0;\n    }\n}",
    },
    examples: [
      {
        input: "prices = [7,1,5,3,6,4]",
        output: "5",
        explanation: "Buy at 1 and sell at 6.",
      },
      {
        input: "prices = [7,6,4,3,1]",
        output: "0",
        explanation: "No profitable transaction is possible.",
      },
    ],
    testCases: [
      { input: "[7,1,5,3,6,4]", expected: "5" },
      { input: "[7,6,4,3,1]", expected: "0" },
      { input: "[2,4,1]", expected: "2" },
    ],
    constraints: "1 <= prices.length <= 10^5.",
    timeLimit: 30,
  },
  {
    title: "Maximum Subarray",
    description:
      "Given an integer array, find the contiguous subarray with the largest sum and return its sum.",
    difficulty: "medium",
    languages: ["javascript", "typescript", "python", "java"],
    starterCode: {
      javascript:
        "function maxSubArray(nums) {\n  // Write your solution here\n}",
      typescript:
        "function maxSubArray(nums: number[]): number {\n  // Write your solution here\n}",
      python:
        "def max_sub_array(nums):\n    # Write your solution here\n    pass",
      java:
        "class Solution {\n    public int maxSubArray(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}",
    },
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum.",
      },
      {
        input: "nums = [1]",
        output: "1",
        explanation: "The only element forms the maximum subarray.",
      },
    ],
    testCases: [
      { input: "[-2,1,-3,4,-1,2,1,-5,4]", expected: "6" },
      { input: "[1]", expected: "1" },
      { input: "[5,4,-1,7,8]", expected: "23" },
    ],
    constraints: "1 <= nums.length <= 10^5.",
    timeLimit: 30,
  },
  {
    title: "Merge Intervals",
    description:
      "Given an array of intervals, merge all overlapping intervals and return the resulting non-overlapping intervals.",
    difficulty: "medium",
    languages: ["javascript", "typescript", "python", "java"],
    starterCode: {
      javascript:
        "function merge(intervals) {\n  // Write your solution here\n}",
      typescript:
        "function merge(intervals: number[][]): number[][] {\n  // Write your solution here\n}",
      python:
        "def merge(intervals):\n    # Write your solution here\n    pass",
      java:
        "class Solution {\n    public int[][] merge(int[][] intervals) {\n        // Write your solution here\n        return new int[][]{};\n    }\n}",
    },
    examples: [
      {
        input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        output: "[[1,6],[8,10],[15,18]]",
        explanation: "[1,3] and [2,6] overlap and are merged.",
      },
      {
        input: "intervals = [[1,4],[4,5]]",
        output: "[[1,5]]",
        explanation: "The intervals touch at 4 and can be merged.",
      },
    ],
    testCases: [
      {
        input: "[[1,3],[2,6],[8,10],[15,18]]",
        expected: "[[1,6],[8,10],[15,18]]",
      },
      { input: "[[1,4],[4,5]]", expected: "[[1,5]]" },
    ],
    constraints: "1 <= intervals.length <= 10^4.",
    timeLimit: 30,
  },
  {
    title: "Longest Substring Without Repeating Characters",
    description:
      "Given a string, find the length of the longest substring without repeating characters.",
    difficulty: "medium",
    languages: ["javascript", "typescript", "python", "java"],
    starterCode: {
      javascript:
        "function lengthOfLongestSubstring(s) {\n  // Write your solution here\n}",
      typescript:
        "function lengthOfLongestSubstring(s: string): number {\n  // Write your solution here\n}",
      python:
        "def length_of_longest_substring(s):\n    # Write your solution here\n    pass",
      java:
        "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Write your solution here\n        return 0;\n    }\n}",
    },
    examples: [
      {
        input: 's = "abcabcbb"',
        output: "3",
        explanation: 'The answer is "abc".',
      },
      {
        input: 's = "bbbbb"',
        output: "1",
        explanation: 'The answer is "b".',
      },
      {
        input: 's = "pwwkew"',
        output: "3",
        explanation: 'The answer is "wke".',
      },
    ],
    testCases: [
      { input: '"abcabcbb"', expected: "3" },
      { input: '"bbbbb"', expected: "1" },
      { input: '"pwwkew"', expected: "3" },
      { input: '""', expected: "0" },
    ],
    constraints: "0 <= s.length <= 5 * 10^4.",
    timeLimit: 30,
  },
  {
    title: "Number of Islands",
    description:
      "Given a 2D grid of 1s and 0s, count the number of islands. An island is surrounded by water and formed by connecting adjacent land cells.",
    difficulty: "medium",
    languages: ["javascript", "typescript", "python", "java"],
    starterCode: {
      javascript:
        "function numIslands(grid) {\n  // Write your solution here\n}",
      typescript:
        "function numIslands(grid: string[][]): number {\n  // Write your solution here\n}",
      python:
        "def num_islands(grid):\n    # Write your solution here\n    pass",
      java:
        "class Solution {\n    public int numIslands(char[][] grid) {\n        // Write your solution here\n        return 0;\n    }\n}",
    },
    examples: [
      {
        input: 'grid = [["1","1","0"],["1","0","0"],["0","0","1"]]',
        output: "2",
        explanation: "There are two separate islands.",
      },
      {
        input: 'grid = [["1","1"],["1","1"]]',
        output: "1",
        explanation: "All land cells form one island.",
      },
    ],
    testCases: [
      {
        input: '[["1","1","0"],["1","0","0"],["0","0","1"]]',
        expected: "2",
      },
      {
        input: '[["1","1"],["1","1"]]',
        expected: "1",
      },
    ],
    constraints: "1 <= rows, cols <= 300.",
    timeLimit: 30,
  },
  {
    title: "Product of Array Except Self",
    description:
      "Given an integer array, return an array where each element is the product of all elements except the element at the current index.",
    difficulty: "medium",
    languages: ["javascript", "typescript", "python", "java"],
    starterCode: {
      javascript:
        "function productExceptSelf(nums) {\n  // Write your solution here\n}",
      typescript:
        "function productExceptSelf(nums: number[]): number[] {\n  // Write your solution here\n}",
      python:
        "def product_except_self(nums):\n    # Write your solution here\n    pass",
      java:
        "class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        // Write your solution here\n        return new int[]{};\n    }\n}",
    },
    examples: [
      {
        input: "nums = [1,2,3,4]",
        output: "[24,12,8,6]",
        explanation: "Each output value is the product of every other element.",
      },
      {
        input: "nums = [-1,1,0,-3,3]",
        output: "[0,0,9,0,0]",
        explanation: "The zero is handled without division.",
      },
    ],
    testCases: [
      { input: "[1,2,3,4]", expected: "[24,12,8,6]" },
      { input: "[-1,1,0,-3,3]", expected: "[0,0,9,0,0]" },
    ],
    constraints: "2 <= nums.length <= 10^5. Do not use division.",
    timeLimit: 30,
  },
  {
    title: "Trapping Rain Water",
    description:
      "Given an array representing an elevation map, calculate how much rainwater can be trapped after raining.",
    difficulty: "hard",
    languages: ["javascript", "typescript", "python", "java"],
    starterCode: {
      javascript:
        "function trap(height) {\n  // Write your solution here\n}",
      typescript:
        "function trap(height: number[]): number {\n  // Write your solution here\n}",
      python:
        "def trap(height):\n    # Write your solution here\n    pass",
      java:
        "class Solution {\n    public int trap(int[] height) {\n        // Write your solution here\n        return 0;\n    }\n}",
    },
    examples: [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
        explanation: "The elevation map traps 6 units of rainwater.",
      },
      {
        input: "height = [4,2,0,3,2,5]",
        output: "9",
        explanation: "The elevation map traps 9 units of rainwater.",
      },
    ],
    testCases: [
      {
        input: "[0,1,0,2,1,0,1,3,2,1,2,1]",
        expected: "6",
      },
      { input: "[4,2,0,3,2,5]", expected: "9" },
    ],
    constraints: "1 <= height.length <= 2 * 10^4. 0 <= height[i] <= 10^5.",
    timeLimit: 30,
  },
];

async function seed() {
  const existing = await db.select().from(codingProblemsTable);

  if (existing.length > 0) {
    console.log(`Coding problems already exist: ${existing.length}`);
    return;
  }

  await db.insert(codingProblemsTable).values(problems);

  console.log(`Successfully seeded ${problems.length} coding problems.`);
}

seed()
  .catch((error) => {
    console.error("Failed to seed coding problems:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });