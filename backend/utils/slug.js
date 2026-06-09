import { prisma } from '../config/db.js'

export const generateSlug = async (title) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)

  // ensure uniqueness
  let slug = base
  let count = 1
  while (await prisma.concernGroup.findUnique({ where: { slug } })) {
    slug = `${base}-${count++}`
  }
  return slug
}
