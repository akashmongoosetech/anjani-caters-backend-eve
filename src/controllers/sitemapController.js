import { BlogPost } from '../models/BlogPost.js';
import { Service } from '../models/Service.js';
import { Project } from '../models/Project.js';
import { Settings } from '../models/Settings.js';

const BASE_URL = process.env.CLIENT_URL || 'https://anjanievents.in';

const staticRoutes = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/about', priority: '0.8', changefreq: 'monthly' },
  { loc: '/team', priority: '0.6', changefreq: 'monthly' },
  { loc: '/services', priority: '0.9', changefreq: 'weekly' },
  { loc: '/packages', priority: '0.8', changefreq: 'weekly' },
  { loc: '/menu', priority: '0.7', changefreq: 'weekly' },
  { loc: '/gallery', priority: '0.6', changefreq: 'monthly' },
  { loc: '/projects', priority: '0.7', changefreq: 'weekly' },
  { loc: '/testimonials', priority: '0.6', changefreq: 'monthly' },
  { loc: '/faqs', priority: '0.6', changefreq: 'monthly' },
  { loc: '/blogs', priority: '0.9', changefreq: 'daily' },
  { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
  { loc: '/booking', priority: '0.8', changefreq: 'monthly' }
];

export const getSitemap = async (req, res) => {
  try {
    const settings = await Settings.findOne().lean().catch(() => null);
    const siteUrl = settings?.canonicalDomain || BASE_URL;

    const xmlUrlWithBase = ({ loc, priority, changefreq, lastmod }) => `  <url>
    <loc>${siteUrl}${loc}</loc>
    <changefreq>${changefreq || 'monthly'}</changefreq>
    <priority>${priority || '0.5'}</priority>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
  </url>`;

    let urls = staticRoutes.map(r => xmlUrlWithBase({ ...r, loc: r.loc }));

    // Dynamic blog posts
    try {
      const blogs = await BlogPost.find({ status: 'Published' }).select('slug updatedAt').lean();
      blogs.forEach(blog => {
        urls.push(xmlUrlWithBase({
          loc: `/blogs/${blog.slug}`,
          priority: '0.8',
          changefreq: 'monthly',
          lastmod: blog.updatedAt?.toISOString()
        }));
      });
    } catch (err) { console.warn('[Sitemap] Failed to fetch blogs:', err.message); }

    // Dynamic services
    try {
      const services = await Service.find({ active: true }).select('slug updatedAt').lean();
      services.forEach(svc => {
        urls.push(xmlUrlWithBase({
          loc: `/services/${svc.slug}`,
          priority: '0.8',
          changefreq: 'monthly',
          lastmod: svc.updatedAt?.toISOString()
        }));
      });
    } catch (err) { console.warn('[Sitemap] Failed to fetch services:', err.message); }

    // Dynamic projects
    try {
      const projects = await Project.find().select('slug updatedAt').lean();
      projects.forEach(proj => {
        urls.push(xmlUrlWithBase({
          loc: `/projects/${proj.slug}`,
          priority: '0.7',
          changefreq: 'monthly',
          lastmod: proj.updatedAt?.toISOString()
        }));
      });
    } catch (err) { console.warn('[Sitemap] Failed to fetch projects:', err.message); }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    res.status(500).send('Error generating sitemap');
  }
};
