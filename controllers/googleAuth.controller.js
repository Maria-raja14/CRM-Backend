// import { google } from 'googleapis';
// import User from '../models/user.model.js';

// // OAuth client
// const oauth2Client = new google.auth.OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
// );

// const googleAuthController = {

//   /* =========================
//      START GOOGLE AUTH
//   ========================== */
//   authenticate: (req, res) => {
//     try {
//       const authUrl = oauth2Client.generateAuthUrl({
//         access_type: 'offline',
//         prompt: 'consent',
//         scope: [
//           'https://mail.google.com' // ✅ ONLY GMAIL FULL ACCESS
//         ],
//         state: req.user.id
//       });

//       res.json({ success: true, authUrl });
//     } catch (err) {
//       console.error('Google auth init error:', err);
//       res.status(500).json({ success: false });
//     }
//   },

//   /* =========================
//      OAUTH CALLBACK
//   ========================== */
//   callback: async (req, res) => {
//     try {
//       const { code, state, error } = req.query;

//       if (error) {
//         return res.redirect(
//           `${process.env.FRONTEND_URL}/google-auth?error=denied`
//         );
//       }

//       const { tokens } = await oauth2Client.getToken(code);
//       oauth2Client.setCredentials(tokens);

//       const user = await User.findById(state);
//       if (!user) {
//         return res.redirect(
//           `${process.env.FRONTEND_URL}/google-auth?error=user_not_found`
//         );
//       }

//       await User.findByIdAndUpdate(state, {
//         googleAuth: {
//           accessToken: tokens.access_token,
//           refreshToken: tokens.refresh_token || user.googleAuth?.refreshToken,
//           expiryDate: tokens.expiry_date,
//           scope: tokens.scope,
//           connected: true,
//           connectedAt: new Date()
//         }
//       });

//       res.redirect(
//         `${process.env.FRONTEND_URL}/google-auth?success=true`
//       );
//     } catch (err) {
//       console.error('OAuth callback error:', err);
//       res.redirect(
//         `${process.env.FRONTEND_URL}/google-auth?error=failed`
//       );
//     }
//   },

//   /* =========================
//      AUTH STATUS
//   ========================== */
//   getAuthStatus: async (req, res) => {
//     const user = await User.findById(req.user.id);

//     if (!user?.googleAuth?.accessToken) {
//       return res.json({ success: true, connected: false });
//     }

//     const isExpired =
//       Date.now() >= user.googleAuth.expiryDate - 300000;

//     if (isExpired && user.googleAuth.refreshToken) {
//       try {
//         oauth2Client.setCredentials({
//           refresh_token: user.googleAuth.refreshToken
//         });

//         const { credentials } =
//           await oauth2Client.refreshAccessToken();

//         await User.findByIdAndUpdate(req.user.id, {
//           'googleAuth.accessToken': credentials.access_token,
//           'googleAuth.expiryDate': credentials.expiry_date
//         });

//         return res.json({ success: true, connected: true });
//       } catch (err) {
//         await User.findByIdAndUpdate(req.user.id, {
//           $unset: { googleAuth: 1 }
//         });

//         return res.json({ success: true, connected: false });
//       }
//     }

//     res.json({ success: true, connected: true });
//   },

//   /* =========================
//      DISCONNECT
//   ========================== */
//   disconnect: async (req, res) => {
//     await User.findByIdAndUpdate(req.user.id, {
//       $unset: { googleAuth: 1 }
//     });

//     res.json({ success: true });
//   }
// };

// export default googleAuthController;//original



import { google } from 'googleapis';
import User from '../models/user.model.js';

// ============= ENVIRONMENT CONFIGURATION =============
const NODE_ENV = process.env.NODE_ENV || 'development';

// Frontend URL – uses LIVE variable in production, LOCAL in development
const FRONTEND_URL = NODE_ENV === 'production'
  ? process.env.FRONTEND_URL_LIVE || 'https://crm.stagingzar.com'
  : process.env.FRONTEND_URL_LOCAL || 'http://localhost:5173';

// Google OAuth redirect URI – used by the OAuth client
const GOOGLE_REDIRECT_URI = NODE_ENV === 'production'
  ? process.env.GMAIL_LIVE_REDIRECT_URI || 'https://crm.stagingzar.com/api/gmail/oauth2callback'
  : process.env.GMAIL_REDIRECT_URI || 'http://localhost:5000/api/gmail/oauth2callback';

console.log(`🔐 Google Auth Controller running in ${NODE_ENV} mode`);
console.log(`🔐 Frontend URL: ${FRONTEND_URL}`);
console.log(`🔐 OAuth Redirect URI: ${GOOGLE_REDIRECT_URI}`);

// OAuth client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI   // ✅ Use the environment‑specific URI
);

const googleAuthController = {

  /* =========================
     START GOOGLE AUTH
  ========================== */
  authenticate: (req, res) => {
    try {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
          'https://mail.google.com' // ONLY GMAIL FULL ACCESS
        ],
        state: req.user.id
      });

      res.json({ success: true, authUrl });
    } catch (err) {
      console.error('Google auth init error:', err);
      res.status(500).json({ success: false });
    }
  },

  /* =========================
     OAUTH CALLBACK
  ========================== */
  callback: async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(
          `${FRONTEND_URL}/google-auth?error=denied`
        );
      }

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const user = await User.findById(state);
      if (!user) {
        return res.redirect(
          `${FRONTEND_URL}/google-auth?error=user_not_found`
        );
      }

      await User.findByIdAndUpdate(state, {
        googleAuth: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || user.googleAuth?.refreshToken,
          expiryDate: tokens.expiry_date,
          scope: tokens.scope,
          connected: true,
          connectedAt: new Date()
        }
      });

      res.redirect(
        `${FRONTEND_URL}/google-auth?success=true`
      );
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.redirect(
        `${FRONTEND_URL}/google-auth?error=failed`
      );
    }
  },

  /* =========================
     AUTH STATUS
  ========================== */
  getAuthStatus: async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user?.googleAuth?.accessToken) {
      return res.json({ success: true, connected: false });
    }

    const isExpired =
      Date.now() >= user.googleAuth.expiryDate - 300000;

    if (isExpired && user.googleAuth.refreshToken) {
      try {
        oauth2Client.setCredentials({
          refresh_token: user.googleAuth.refreshToken
        });

        const { credentials } =
          await oauth2Client.refreshAccessToken();

        await User.findByIdAndUpdate(req.user.id, {
          'googleAuth.accessToken': credentials.access_token,
          'googleAuth.expiryDate': credentials.expiry_date
        });

        return res.json({ success: true, connected: true });
      } catch (err) {
        await User.findByIdAndUpdate(req.user.id, {
          $unset: { googleAuth: 1 }
        });

        return res.json({ success: true, connected: false });
      }
    }

    res.json({ success: true, connected: true });
  },

  /* =========================
     DISCONNECT
  ========================== */
  disconnect: async (req, res) => {
    await User.findByIdAndUpdate(req.user.id, {
      $unset: { googleAuth: 1 }
    });

    res.json({ success: true });
  }
};

export default googleAuthController;