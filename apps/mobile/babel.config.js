const fs = require('fs');
const path = require('path');

function loadRootDotEnv() {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  const map = {};
  if (!fs.existsSync(envPath)) return map;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    map[key] = val;
  }
  return map;
}

const dotEnvVars = loadRootDotEnv();
const INLINED_ENV_KEYS = new Set([
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
]);

function inlineDotEnvPlugin({ types: t }) {
  return {
    visitor: {
      MemberExpression(pathNode) {
        if (
          t.isMemberExpression(pathNode.node.object) &&
          t.isIdentifier(pathNode.node.object.object, { name: 'process' }) &&
          t.isIdentifier(pathNode.node.object.property, { name: 'env' }) &&
          t.isIdentifier(pathNode.node.property) &&
          !pathNode.node.computed
        ) {
          const key = pathNode.node.property.name;
          if (INLINED_ENV_KEYS.has(key)) {
            const val = dotEnvVars[key] || process.env[key] || '';
            pathNode.replaceWith(t.stringLiteral(val));
          }
        }
      },
    },
  };
}

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [inlineDotEnvPlugin],
};
