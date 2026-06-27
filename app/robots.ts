export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/fg-admin/', '/dashboard/', '/payment/'],
    },
    sitemap: 'https://futsalgoa.com/sitemap.xml',
  }
}
