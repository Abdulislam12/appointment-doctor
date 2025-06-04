const User = require("../models/user.model"); // Adjust path as needed
const passport = require("passport");
var GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    async function (accessToken, refreshToken, profile, cb) {
      try {
        const existingUser = await User.findOne({ googleId: profile.id });
        // console.log(profile);

        if (existingUser) return cb(null, existingUser);

        // Try checking by email in case same email registered without Google
        const existingByEmail = await User.findOne({
          email: profile.emails[0].value,
        });
        if (existingByEmail) {
          // Attach Google ID to existing account
          existingByEmail.googleId = profile.id;
          await existingByEmail.save();
          return cb(null, existingByEmail);
        }

        // Create new user
        const newUser = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          isEmailVerified: true,
        });

        await newUser.save();
        return cb(null, newUser);
      } catch (err) {
        return cb(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id); // Store only user ID in session
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user); // Attach full user to req.user
  } catch (err) {
    done(err, null);
  }
});
