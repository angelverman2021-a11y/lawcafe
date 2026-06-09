import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { prisma } from './db.js'

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const email  = profile.emails?.[0]?.value
    const name   = profile.displayName
    const avatar = profile.photos?.[0]?.value

    if (!email) return done(new Error('No email from Google'), null)

    // find or create user
    let user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar,
          password: '',        // no password for OAuth users
          googleId: profile.id
        }
      })
    } else if (!user.googleId) {
      // existing email user — link Google account
      user = await prisma.user.update({
        where: { email },
        data: { googleId: profile.id, avatar: avatar || user.avatar }
      })
    }

    return done(null, user)
  } catch (err) {
    return done(err, null)
  }
}))

passport.serializeUser((user, done)   => done(null, user.id))
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    done(null, user)
  } catch (err) { done(err, null) }
})

export default passport
