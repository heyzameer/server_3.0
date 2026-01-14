import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from "../models/User"; // Adjust path to your User model
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: process.env.GOOGLE_CALLBACK_URL!,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user exists
                let user = await User.findOne({ email: profile.emails![0].value });
                if (!user) {
                    // Create new user
                    user = await User.create({
                        fullName: profile.displayName,
                        email: profile.emails![0].value,
                        password: 'google-oauth-user',
                        phone: '9876543210', // <--- ADD THIS LINE (Dummy phone)
                        isVerified: true,
                        googleId: profile.id,
                        role: 'customer'
                    });
                } else {
                    // If user exists but no googleId (registered via email/password), link it
                    if (!user.googleId) {
                        user.googleId = profile.id;
                        await user.save();
                    }
                }

                return done(null, user);
            } catch (error) {
                return done(error as Error, undefined);
            }
        }
    )
);