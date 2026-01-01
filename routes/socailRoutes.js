import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = express.Router();

/* ===============================
   🌐 GOOGLE LOGIN/REGISTER
================================*/
router.get(
  "/google",
  (req, res, next) => {
    // Store the mode (login/register) in session
    req.session = req.session || {};
    req.session.oauthMode = req.query.mode || 'login';
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

// router.get("/google/callback", (req, res, next) => {
//   passport.authenticate(
//     "google",
//     { session: false },
//     (err, user, info) => {
//       if (err) {
//         console.error("Google auth error:", err);
//         return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(err.message || "An error occurred")}`);
//       }

//       // Get the mode from session (login/register)
//       const mode = req.session?.oauthMode || 'login';
//       console.log('OAuth callback mode:', mode);

//       if (!user) {
//         // If user doesn't exist and we have profile data
//         if (info?.need_signup && info?.profile) {
//           // Redirect to register page with social profile data
//           const socialData = {
//             first_name: info.profile.first_name,
//             last_name: info.profile.last_name,
//             email: info.profile.email,
//             google_id: info.profile.google_id,
//             google_avatar: info.profile.google_avatar,
//             auth_type: info.profile.auth_type
//           };

//           return res.redirect(
//             `${process.env.FRONTEND_URL}/register?socialData=${encodeURIComponent(JSON.stringify(socialData))}`
//           );
//         }

//         // Default error
//         return res.redirect(
//           `${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(info?.message || "Authentication failed")}`
//         );
//       }

//       // User exists - generate token and log them in
//       const isOwner =
//         Number(user.is_company_owner) === 1 ||
//         user.is_company_owner === true;

//       const role = isOwner ? "company_owner" : "user";

//       const token = jwt.sign(
//         {
//           id: user.id,
//           email: user.email,
//           isAdmin: false,
//           role,
//           company_id: user.company_id || 0,
//           auth_type: "google"
//         },
//         process.env.JWT_SECRET,
//         { expiresIn: "7d" }
//       );


//       const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?success=true&token=${token}&user=${encodeURIComponent(
//         JSON.stringify(user)
//       )}&need_company_creation=${user.need_company_creation || false}`;

//       return res.redirect(redirectUrl);
//     }
//   )(req, res, next);
// });

// socailroute.js - Updated


router.get("/google/callback", (req, res, next) => {
  passport.authenticate(
    "google",
    { session: false },
    (err, user, info) => {
      if (err) {
        console.error("Google auth error:", err);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(err.message || "An error occurred")}`);
      }

      if (!user) {
        // If user doesn't exist and registration is allowed for company owners
        if (info?.need_signup && info?.profile) {
          // Redirect to register page with social profile data
          const socialData = {
            first_name: info.profile.first_name,
            last_name: info.profile.last_name,
            email: info.profile.email,
            google_id: info.profile.google_id,
            google_avatar: info.profile.google_avatar,
            auth_type: info.profile.auth_type,
            is_company_owner: true, // Force company owner registration
            social_registration: true // Additional flag
          };

          return res.redirect(
            `${process.env.FRONTEND_URL}/register?socialData=${encodeURIComponent(JSON.stringify(socialData))}`
          );
        }

        // Show specific message for non-company owners
        if (info?.message?.includes("Only company owners can use social login")) {
          return res.redirect(
            `${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(info.message)}`
          );
        }

        // Default error
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(info?.message || "Authentication failed")}`
        );
      }

      // User exists and is company owner - generate token and log them in
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          isAdmin: false,
          role: "company_owner", // Always company_owner for social login
          company_id: user.company_id || 0,
          auth_type: "google"
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?success=true&token=${token}&user=${encodeURIComponent(
        JSON.stringify(user)
      )}&need_company_creation=${user.need_company_creation || false}`;

      return res.redirect(redirectUrl);
    }
  )(req, res, next);
});

// Similarly update Facebook and Apple callbacks...
router.get("/google/failure", (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/login?error=Please signup your account first`);
});

/* ===============================
   🌐 FACEBOOK LOGIN
================================*/
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/api/auth/facebook/failure",
    session: false,
  }),
  (req, res) => {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=NoUser`);
    }

    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?success=true&token=${token}&user=${encodeURIComponent(
      JSON.stringify(req.user)
    )}&need_company_creation=${req.user.need_company_creation || false}`;

    return res.redirect(redirectUrl);
  }
);

router.get("/facebook/failure", (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/login?error=facebook_auth_failed`);
});

/* ===============================
   🍎 APPLE LOGIN
================================*/
router.get(
  "/apple",
  passport.authenticate("apple", { scope: ["name", "email"] })
);

router.post(
  "/apple/callback",
  passport.authenticate("apple", {
    failureRedirect: "/api/auth/apple/failure",
    session: false,
  }),
  (req, res) => {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=NoUser`);
    }

    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?success=true&token=${token}&user=${encodeURIComponent(
      JSON.stringify(req.user)
    )}&need_company_creation=${req.user.need_company_creation || false}`;

    res.redirect(redirectUrl);
  }
);

router.get("/apple/failure", (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/login?error=apple_auth_failed`);
});

export default router;