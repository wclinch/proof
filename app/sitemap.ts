import { MetadataRoute } from 'next'

const BASE = 'https://proof-kxfz.onrender.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE,            lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]
}
