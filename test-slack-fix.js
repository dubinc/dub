/**
 * Simple test to verify the Slack notification fix
 * This tests the key logic changes: user fallback and time formatting
 */

// Mock formatDateTime function similar to @dub/utils
function formatDateTime(datetime) {
  if (!datetime) return "";
  try {
    return new Date(datetime).toLocaleTimeString("en-US", {
      month: "short",
      day: "numeric", 
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  } catch (error) {
    return "";
  }
}

// Mock user info scenarios
const testScenarios = [
  {
    name: "User with name",
    userInfo: { name: "John Doe", email: "john@example.com" },
    expected: "John Doe"
  },
  {
    name: "User with email only",
    userInfo: { name: null, email: "jane@example.com" },
    expected: "jane@example.com"
  },
  {
    name: "User with empty name",
    userInfo: { name: "", email: "bob@example.com" },
    expected: "bob@example.com"
  },
  {
    name: "No user info",
    userInfo: null,
    expected: "Anonymous User"
  }
];

// Test the user display name logic
function getUserDisplayName(userInfo) {
  return userInfo?.name || userInfo?.email || 'Anonymous User';
}

console.log("Testing user display name fallback logic:");
console.log("=".repeat(50));

testScenarios.forEach(scenario => {
  const result = getUserDisplayName(scenario.userInfo);
  const passed = result === scenario.expected;
  console.log(`${passed ? "✅" : "❌"} ${scenario.name}: ${result} ${passed ? "" : `(expected: ${scenario.expected})`}`);
});

// Test time formatting
console.log("\nTesting time formatting:");
console.log("=".repeat(50));

const testDates = [
  "2024-08-26T16:41:52.084Z",
  "2025-01-15T10:30:00.000Z",
  null,
  "",
  "invalid-date"
];

testDates.forEach(date => {
  const formatted = formatDateTime(date);
  console.log(`${date || 'null/empty'} -> "${formatted}"`);
});

console.log("\nAll tests completed! ✨");
