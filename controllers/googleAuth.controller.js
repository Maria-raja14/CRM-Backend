import { google } from 'googleapis';
import User from '../models/user.model.js';

// OAuth client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
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
          'https://mail.google.com' // ✅ ONLY GMAIL FULL ACCESS
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
  // callback: async (req, res) => {
  //   try {
  //     const { code, state, error } = req.query;

  //     if (error) {
  //       return res.redirect(
  //         `${process.env.FRONTEND_URL}/google-auth?error=denied`
  //       );
  //     }

  //     const { tokens } = await oauth2Client.getToken(code);
  //     oauth2Client.setCredentials(tokens);

  //     const user = await User.findById(state);
  //     if (!user) {
  //       return res.redirect(
  //         `${process.env.FRONTEND_URL}/google-auth?error=user_not_found`
  //       );
  //     }

  //     await User.findByIdAndUpdate(state, {
  //       googleAuth: {
  //         accessToken: tokens.access_token,
  //         refreshToken: tokens.refresh_token || user.googleAuth?.refreshToken,
  //         expiryDate: tokens.expiry_date,
  //         scope: tokens.scope,
  //         connected: true,
  //         connectedAt: new Date()
  //       }
  //     });

  //     res.redirect(
  //       `${process.env.FRONTEND_URL}/google-auth?success=true`
  //     );
  //   } catch (err) {
  //     console.error('OAuth callback error:', err);
  //     res.redirect(
  //       `${process.env.FRONTEND_URL}/google-auth?error=failed`
  //     );
  //   }
  // },//old one..

callback: async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Determine frontend URL from request host
    const host = req.get('host');
    let frontendUrl;

    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      frontendUrl = process.env.FRONTEND_URL_LOCAL || 'http://localhost:5173';
    } else {
      frontendUrl = process.env.FRONTEND_URL_LIVE || 'https://crm.stagingzar.com';
    }

    if (error) {
      return res.redirect(
        `${frontendUrl}/google-auth?error=denied`
      );
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const user = await User.findById(state);
    if (!user) {
      return res.redirect(
        `${frontendUrl}/google-auth?error=user_not_found`
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
      `${frontendUrl}/google-auth?success=true`
    );
  } catch (err) {
    console.error('OAuth callback error:', err);
    // Determine frontend URL again (in case of error, though host is still available)
    const host = req.get('host');
    let frontendUrl = host.includes('localhost') 
      ? (process.env.FRONTEND_URL_LOCAL || 'http://localhost:5173')
      : (process.env.FRONTEND_URL_LIVE || 'https://crm.stagingzar.com');
    res.redirect(
      `${frontendUrl}/google-auth?error=failed`
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

export default googleAuthController;//original



