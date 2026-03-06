// Basic auth viewer-request function for staging
// Adapted from terraform-modules/std-website/scripts/viewer-request.js.tpl

var authEnabled = ${auth_enabled};
var allowPassword = "Basic ${expected_auth_header}";

function rewriteRequest(request) {
  var uri = request.uri;

  if (uri.endsWith('/')) {
      request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }

  return request;
}

function handler(event) {
  if (!authEnabled) {
    return rewriteRequest(event.request);
  }

  var authHeader = event.request.headers.authorization;
  if (authHeader && authHeader.value === allowPassword) {
    return rewriteRequest(event.request);
  }

  return {
    statusCode: 401,
    statusDescription: "Unauthorized",
    headers: {
      "www-authenticate": { value: "Basic" },
    },
  };
}
