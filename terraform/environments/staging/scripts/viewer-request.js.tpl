// Multi-studio basic auth viewer-request function for staging
// Each studio has its own credential (username = studio slug)
// Sets a steambb-studio cookie so the SPA auto-selects the workspace

var authEnabled = ${auth_enabled};
var credentials = ${studio_credentials};

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

  var request = event.request;
  var authHeader = request.headers.authorization;

  if (!authHeader) {
    return {
      statusCode: 401,
      statusDescription: "Unauthorized",
      headers: {
        "www-authenticate": { value: 'Basic realm="SteamBBEditor"' },
      },
    };
  }

  // Match against known studio credentials
  var studioSlug = null;
  for (var slug in credentials) {
    if (authHeader.value === "Basic " + credentials[slug]) {
      studioSlug = slug;
      break;
    }
  }

  if (!studioSlug) {
    return {
      statusCode: 401,
      statusDescription: "Unauthorized",
      headers: {
        "www-authenticate": { value: 'Basic realm="SteamBBEditor"' },
      },
    };
  }

  // Check if the studio cookie is already set correctly
  var cookies = request.cookies || {};
  var existingCookie = cookies['steambb-studio'];

  if (!existingCookie || existingCookie.value !== studioSlug) {
    // Set cookie via redirect (one-time per studio login)
    var redirectUri = request.uri || '/';
    if (request.querystring && Object.keys(request.querystring).length > 0) {
      var qs = Object.keys(request.querystring).map(function(k) {
        return k + '=' + (request.querystring[k].value || '');
      }).join('&');
      redirectUri += '?' + qs;
    }
    return {
      statusCode: 302,
      statusDescription: "Found",
      headers: {
        "location": { value: redirectUri },
      },
      cookies: {
        "steambb-studio": {
          value: studioSlug,
          attributes: "Path=/; Secure; SameSite=Lax; Max-Age=31536000",
        },
      },
    };
  }

  // Cookie matches — forward to origin
  return rewriteRequest(request);
}
