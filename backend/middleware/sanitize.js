// Recursively strip HTML tags and dangerous characters from a value
const clean = (value) => {
  if (typeof value !== 'string') return value
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') obj[key] = clean(obj[key])
    else if (typeof obj[key] === 'object') sanitizeObject(obj[key])
  }
  return obj
}

// Sanitizes req.body, req.query, req.params against XSS
export const sanitizeInputs = (req, res, next) => {
  sanitizeObject(req.body)
  sanitizeObject(req.query)
  sanitizeObject(req.params)
  next()
}
