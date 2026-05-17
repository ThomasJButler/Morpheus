// Manual mock for react-markdown (ESM-only, breaks Jest's transform).
// Tests that render ChatMessage don't need real markdown parsing — they
// assert on the message text, so render children as-is.
const React = require('react');

function ReactMarkdown({ children }) {
  return React.createElement(React.Fragment, null, children);
}

module.exports = ReactMarkdown;
module.exports.default = ReactMarkdown;
