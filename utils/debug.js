// Debug helper for question generation
function debugQuestion(stage, data) {
  console.log(`\n=== DEBUG: ${stage} ===`);
  console.dir(data, { depth: null, colors: true });
  return data; // Allow chaining
}

module.exports = { debugQuestion };
