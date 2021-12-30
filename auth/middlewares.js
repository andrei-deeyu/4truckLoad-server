const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');


// Authorization middleware.
// When used, the ID Token must exist and be verified against the Auth0 JSON Web Key Set
const isLoggedIn = jwt({
  // Dynamically provide a signing key
  // based on the kid (key ID) in the header and
  // the signing keys provided by the JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://dev-h1e424j0.us.auth0.com/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  issuer: [`https://dev-h1e424j0.us.auth0.com/`],
  algorithms: ['RS256']
});

function isNOTloggedIn(req, res, next) {
  if (req.user) {
    res.redirect('/');
  } else {
    next();
  }
}

module.exports = {
  isLoggedIn,
  isNOTloggedIn
};