const { isLoggedIn } = require('./middlewares');

const express = require('express'),
  router = express.Router(),
  fetch = require('node-fetch'),
  AuthenticationClient = require('auth0').AuthenticationClient;

  var auth0 = new AuthenticationClient({
    domain: process.env.DOMAIN,
    clientId: process.env.CLIENTID,
    clientSecret: process.env.CLIENTSECRET
  });


function respondError500(res, next) {
  res.status(500);
  const error = new Error('Unable to load');
  next(error);
}


// any route in here is pre-pended with /auth
router.get('/', (req, res) => {
  res.json({
    message:  '🔐'
  });
});

router.post('/cta', (req, res, next) => {
  console.log(req.ip);
  return res.json({'status': 'done'});
});

auth0.clientCredentialsGrant({ audience: 'https://dev-h1e424j0.us.auth0.com/api/v2/'}, (err, response) => {
  if (err) return respondError500(res, next);

  router.post('/verification-email', async (req, res, next) => {
    let user_id = req.body.user_id;

    await fetch('https://dev-h1e424j0.us.auth0.com/api/v2/jobs/verification-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${response.access_token}`,
      },
      body: JSON.stringify({ "user_id": user_id, "client_id": "v1WZMQAXn0STAfw7yU3c0uRauKfT6YTy"})
    })
    .then(( res ) => res.json() )
    .then(( response ) => {
      if(response.status == "pending") return res.json({"status": "pending"});

      return respondError500(res, next);
    });
  });

  router.get('/getUserMetadata', isLoggedIn, async (req, res, next) => {
    await fetch('https://dev-h1e424j0.us.auth0.com/api/v2/users/' + req.user.sub, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${response.access_token}`
      },
    })
    .then(res => res.json())
    .then((result) => {
      return res.json({ role: result.user_metadata.role, phone: result.user_metadata.phone });
    });
  });

  router.post('/changeUserMetadata', isLoggedIn, async (req, res, next) => {
    await fetch('https://dev-h1e424j0.us.auth0.com/api/v2/users/' + req.user.sub, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${response.access_token}`
      },
      body: JSON.stringify({ "user_metadata": { role: req.body.role, phone: req.body.phone } })
    })
    .then(res => res.json())
    .then((result) => {
      return res.json({state: 'changed.', newRole: result.user_metadata.role, newPhone: result.user_metadata.phone });
    });
  });

  router.post('/planchanged', isLoggedIn, async (req, res, next) => {
    await fetch('https://dev-h1e424j0.us.auth0.com/api/v2/users/' + req.user.sub, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${response.access_token}`
      },
    })
    .then(( res ) => res.json() )
    .then(( response ) => {
      console.log(response.app_metadata);
      console.log(req.user)
      console.log(req.user['https://www.dev-h1e424j0.us.auth0.com.subscription'])
      if(response.app_metadata && response.app_metadata.subscription !== req.user['https://www.dev-h1e424j0.us.auth0.com.subscription']) {
      console.log('true')
      return res.json({
        "planName": response.app_metadata.subscription,
        "refresh_the_Token": true
      })
      }
      console.log('false')
      return res.json({ "refresh_the_Token": false })
    });
  });
});


module.exports = router;