import { MetadataRoute } from 'next';
import { listArenas } from '@/lib/admin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://agnelarena.com';

  const defaultUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];

  try {
    const arenas = await listArenas();
    const arenaUrls: MetadataRoute.Sitemap = arenas.map((arena) => ({
      url: `${baseUrl}/booking?arena_id=${arena.id}`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.9,
    }));
    return [...defaultUrls, ...arenaUrls];
  } catch (err) {
    return defaultUrls;
  }
}
