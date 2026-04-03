import { db } from '../../configs/db';
import { articleCategories, articles, articleToCategories, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../logger';

const IMAGES = [
  'https://static.vecteezy.com/system/resources/thumbnails/056/495/363/small/metal-gears-lying-on-a-table-in-a-manufacturing-workshop-photo.jpg',
  'https://static.vecteezy.com/system/resources/thumbnails/073/834/980/small/metal-gears-and-cogs-working-together-in-machinery-photo.jpg',
  'https://static.vecteezy.com/system/resources/thumbnails/072/418/519/small/close-up-of-shiny-metal-gears-with-oil-showing-industrial-mechanics-at-work-photo.jpeg',
  'https://static.vecteezy.com/system/resources/thumbnails/073/834/980/small/metal-gears-and-cogs-working-together-in-machinery-photo.jpg'
];

const categoriesData = [
  { name: 'Manufacturing Trends', slug: 'manufacturing-trends' },
  { name: 'Maintenance & Operations', slug: 'maintenance-operations' },
  { name: 'Material Science', slug: 'material-science' },
  { name: 'Case Studies', slug: 'case-studies' }
];

export const seedBlogs = async () => {
  try {
    logger.info('⏳ Seeding Blogs and Categories...');

    // 1. Get an Admin User to act as the Author
    const adminUsers = await db.select().from(users).where(eq(users.role, 'ADMIN')).limit(1);
    if (adminUsers.length === 0) {
      logger.error('❌ No admin user found. Please run the main user seeder first.');
      return;
    }
    const adminId = adminUsers[0].id;

    // 2. Clear existing data in the correct relational order to prevent constraint errors
    await db.delete(articleToCategories);
    await db.delete(articles);
    await db.delete(articleCategories);

    // 3. Insert Categories
    const insertedCategories = await db.insert(articleCategories).values(categoriesData).returning();
    logger.info(`✅ Inserted ${insertedCategories.length} Blog Categories.`);

    // Map categories for easy assignment
    const catMap = {
      trends: insertedCategories.find(c => c.slug === 'manufacturing-trends')!.id,
      maintenance: insertedCategories.find(c => c.slug === 'maintenance-operations')!.id,
      science: insertedCategories.find(c => c.slug === 'material-science')!.id,
      case: insertedCategories.find(c => c.slug === 'case-studies')!.id,
    };

    // 4. Prepare Blog Articles Data
    const blogsData = [
      {
        title: 'The Future of CNC Machining in 2026',
        slug: 'future-of-cnc-machining-2026',
        categoryId: catMap.trends,
        content: '<p>Computer Numerical Control (CNC) machining continues to evolve. In 2026, we are seeing unprecedented levels of automation and AI integration...</p><h3>Why it matters</h3><p>Reduced downtime and hyper-precision are the new standard.</p>',
      },
      {
        title: 'Understanding Tensile Strength in Forged Steel',
        slug: 'understanding-tensile-strength-forged-steel',
        categoryId: catMap.science,
        content: '<p>When evaluating components for high-stress environments, tensile strength is the primary metric. Forged steel offers unique grain structures that enhance this property significantly compared to cast alternatives.</p>',
      },
      {
        title: 'Preventative Maintenance for Industrial Gears',
        slug: 'preventative-maintenance-industrial-gears',
        categoryId: catMap.maintenance,
        content: '<p>Gears are the heart of mechanical power transmission. A solid preventative maintenance schedule involving proper lubrication analysis can extend the life of your heavy machinery by up to 40%.</p>',
      },
      {
        title: 'How AI is Revolutionizing Quality Control',
        slug: 'ai-revolutionizing-quality-control',
        categoryId: catMap.trends,
        content: '<p>Visual inspection using machine learning models is now outperforming human inspectors. Discover how integrating AI cameras on the assembly line prevents micro-fractured parts from shipping.</p>',
      },
      {
        title: 'Top 5 Alloys for High-Temperature Applications',
        slug: 'top-5-alloys-high-temperature',
        categoryId: catMap.science,
        content: '<p>Not all metals can withstand the heat. From Inconel to specific titanium variants, we break down the best alloys for aerospace and heavy industrial furnaces.</p>',
      },
      {
        title: 'Case Study: Reducing Downtime in Auto Manufacturing',
        slug: 'case-study-reducing-downtime-auto',
        categoryId: catMap.case,
        content: '<p>Read how a leading automotive plant implemented Bharat Forge customized drivetrain components to reduce their annual maintenance downtime from 14 days to just 3 days.</p>',
      }
    ];

    // 5. Build final array mapped EXACTLY to the schema
    const finalArticlesToInsert = blogsData.map((blog, index) => ({
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      authorId: adminId,
      thumbnailUrl: IMAGES[index % IMAGES.length], 
      status: 'PUBLISHED' as const,
      viewsCount: Math.floor(Math.random() * 1500) + 100, 
      likesCount: Math.floor(Math.random() * 300), 
      dislikesCount: Math.floor(Math.random() * 10),
      publishedAt: new Date(),
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)) 
    }));

    // 6. Insert Articles and grab their returned IDs
    const insertedArticles = await db.insert(articles).values(finalArticlesToInsert).returning();
    logger.info(`✅ Inserted ${insertedArticles.length} Blogs.`);

    // 7. Map the inserted articles to their categories in the junction table
    const articleCategoryMappings = blogsData.map((blog, index) => ({
      articleId: insertedArticles[index].id,
      categoryId: blog.categoryId
    }));

    await db.insert(articleToCategories).values(articleCategoryMappings);
    logger.info(`✅ Successfully linked all blogs to their respective categories.`);

  } catch (error) {
    logger.error('❌ Error seeding blogs:', error);
  }
};