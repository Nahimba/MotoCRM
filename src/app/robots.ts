// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',            // Allow main landing page
      disallow: [
        '/admin/', 
        '/staff/',
        '/account/', 
        '/api/',
      ],
    },
    // sitemap: 'https://moto-crm-pi.vercel.app/sitemap.xml',
  }
}