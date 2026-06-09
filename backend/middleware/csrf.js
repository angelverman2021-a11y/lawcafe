import { doubleCsrf } from 'csrf-csrf'

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret:    () => process.env.CSRF_SECRET || process.env.JWT_SECRET,
  cookieName:   '__Host-psifi.x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    path:     '/'
  },
  size:         64,
  getTokenFromRequest: (req) =>
    req.headers['x-csrf-token'] || req.body?._csrf
})

export { generateToken, doubleCsrfProtection }
