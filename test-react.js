const React = require('react');
const ReactDOMServer = require('react-dom/server');

try {
  const html = ReactDOMServer.renderToString(
    React.createElement('div', null, new Date(undefined).toLocaleDateString('ar-EG'))
  );
  console.log("Success:", html);
} catch (e) {
  console.error("Error:", e.message);
}
