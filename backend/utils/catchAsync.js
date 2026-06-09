// Wraps async route handlers to catch errors without try/catch boilerplate
export const catchAsync = fn => (req, res, next) => fn(req, res, next).catch(next)
