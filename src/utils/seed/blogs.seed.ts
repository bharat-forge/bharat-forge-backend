import { db } from '../../configs/db';
import { articleCategories, articles, articleToCategories, users } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Categorized Image Assets
const ENGINE_IMAGES = [
  'https://t3.ftcdn.net/jpg/00/61/49/52/360_F_61495291_or2ghQNS9FxLIsL6admucw6w6jTbkpgP.jpg',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSGtjxCC2FTSxDmWvupgb_6xZNk39-TAJwsHQ&s',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2FwAbQkbehxT5km1VG9rS5c8uKRRWSHPxiA&s'
];

const TYRE_IMAGES = [
  'https://www.tyremarket.com/images/products/RE050.jpg',
  'https://tiimg.tistatic.com/fp/0/008/884/bridgestone-car-tyres-944.jpg',
  'https://blogs.gomechanic.com/wp-content/uploads/2019/04/BlogFeaturedImage_Square-01-1.jpg',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRB8hieIqoh99de5B_X701_Uds7mHLLf-5Wvg&s'
];

const SEDAN_IMAGES = [
  'https://upload.wikimedia.org/wikipedia/commons/b/b6/Toyota_Camry_2.5_Hybrid_Ascent_Sport_%28IX%29_%E2%80%93_f_02012026.jpg',
  'https://images.hindustantimes.com/auto/auto-images/mg/rc6/exterior_mg-rc6_front-left-side_600x400.jpg?imwidth=640',
  'https://cdn-s3.autocarindia.com/Toyota/Camry/OP7_1047.JPG?w=640&q=75',
  'https://auto.hindustantimes.com/cms-images/tata_tigor/images/exterior_tata-tigor_front-right-side_614x420.jpg?imwidth=640'
];

const SUV_IMAGES = [
  'https://img.freepik.com/free-photo/blue-suv-driving-wet-road-rain-modern-car-rainy-highway_169016-70041.jpg?semt=ais_hybrid&w=740&q=80',
  'https://www.topgear.com/sites/default/files/2024/02/2024-cadillac-escalade-v-series-010.jpg',
  'https://cdni.autocarindia.com/Features/20240315050001_Brezza-3.jpg',
  'https://car-images.bauersecure.com/wp-images/3651/088-hyundai-ioniq-9.jpg'
];

const categoriesData = [
  { name: 'Manufacturing Trends', slug: 'manufacturing-trends' },
  { name: 'Maintenance & Operations', slug: 'maintenance-operations' },
  { name: 'Material Science', slug: 'material-science' },
  { name: 'Case Studies', slug: 'case-studies' }
];

export const seedBlogs = async () => {
  try {
    const adminUsers = await db.select().from(users).where(eq(users.role, 'ADMIN')).limit(1);
    if (adminUsers.length === 0) {
      console.log('No admin user found. Skipping blog seed.');
      return;
    }
    const adminId = adminUsers[0].id;

    // Clear existing data
    await db.delete(articleToCategories);
    await db.delete(articles);
    await db.delete(articleCategories);

    // Insert categories
    const insertedCategories = await db.insert(articleCategories).values(categoriesData).returning();

    const catMap = {
      trends: insertedCategories.find(c => c.slug === 'manufacturing-trends')!.id,
      maintenance: insertedCategories.find(c => c.slug === 'maintenance-operations')!.id,
      science: insertedCategories.find(c => c.slug === 'material-science')!.id,
      case: insertedCategories.find(c => c.slug === 'case-studies')!.id,
    };

    const blogsData = [
      {
        title: 'The Unrelenting Evolution of Internal Combustion and Hybrid Engines',
        slug: 'evolution-of-internal-combustion-hybrid-engines',
        categoryId: catMap.science,
        thumbnailUrl: ENGINE_IMAGES[0],
        supportingImages: ENGINE_IMAGES.slice(1),
        content: `
## The Engineering Marvel of Modern Propulsion

For over a century, the Internal Combustion Engine (ICE) has been the beating heart of the automotive industry. However, the modern engine bay looks vastly different from its predecessors. In today's landscape, the pure pursuit of horsepower has been entirely eclipsed by the mandate for **thermal efficiency** and **emissions compliance**.

### The Shift to Forced Induction

Gone are the days when massive displacement was the only path to power. Today, manufacturers rely heavily on smaller displacement engines paired with advanced forced induction systems. 

* **Twin-Scroll Turbochargers:** By dividing the exhaust manifold into two separate channels, these systems virtually eliminate turbo lag, ensuring exhaust pulses do not interfere with one another.
* **Variable Geometry Turbos (VGT):** Previously reserved for diesel engines, VGTs dynamically alter the aspect ratio of the turbo depending on engine RPM, offering low-end torque and high-end horsepower simultaneously.

> "The true triumph of modern engineering is extracting 300 horsepower from a 2.0-liter inline-four while returning 35 miles per gallon on the highway." — *Automotive Engineering Weekly*

### Material Science at the Core

You cannot increase cylinder pressures and operational temperatures without fundamentally upgrading the materials. We are seeing a massive shift towards **compacted graphite iron (CGI)** in diesel blocks and advanced **hypereutectic aluminum alloys** for high-revving petrol variants. These materials offer superior heat dissipation while cutting dead weight from the front axle.

### The Hybrid Integration

The true paradigm shift is the integration of high-voltage electrical architectures. The 48-volt mild-hybrid systems are now standard, replacing traditional alternators with Integrated Starter Generators (ISGs). This allows the engine to seamlessly shut off while coasting, filling in the torque gaps during gear shifts and turbo spooling. The result is a powertrain that feels naturally aspirated, despite being heavily digitized and forced-induced.
        `.trim(),
      },
      {
        title: 'The Alchemy of Rubber: High-Performance Tyres Unveiled',
        slug: 'alchemy-of-rubber-high-performance-tyres',
        categoryId: catMap.maintenance,
        thumbnailUrl: TYRE_IMAGES[0],
        supportingImages: TYRE_IMAGES.slice(1),
        content: `
## Where the Car Meets the Road

It is a common misconception that brakes stop a car or that the engine makes it fast. In reality, **tyres do all the work**. They are the single most critical component on any vehicle, serving as the sole contact patch between two tons of moving metal and the asphalt.

### The Compound: More Than Just Rubber

Modern high-performance tyres are chemical masterpieces. The traditional reliance on natural rubber has been augmented by complex blends of synthetic polymers, carbon black, and crucially, **silica**. 

Silica integration was a game-changer. Historically, making a tyre grip well in the wet meant making it extremely soft, which drastically reduced its lifespan. Silica drastically improves wet-weather traction and flexibility at low temperatures without sacrificing the treadwear index.

### Tread Dynamics and Hydroplaning Resistance

Look closely at a modern asymmetric tyre. You will notice it effectively serves multiple purposes across its width:

1.  **Outer Shoulder:** Features massive, rigid tread blocks designed to withstand immense lateral G-forces during aggressive cornering.
2.  **Center Ribs:** Continuous rubber bands that provide straight-line stability and precise steering feedback.
3.  **Circumferential Grooves:** Deep channels engineered to evacuate gallons of water per second, mitigating the risk of hydroplaning.

> **Maintenance Tip:** Checking tyre pressure visually is mathematically impossible. A tyre can lose 30% of its required pressure and look visually identical. Always use a calibrated digital gauge.

### Heat Cycles and Degradation

For track enthusiasts, the concept of a "heat cycle" is paramount. Every time a tyre is brought up to extreme operating temperatures and allowed to cool, the chemical bonds permanently harden. A tyre with ample tread depth can still be rendered completely useless if it has been heat-cycled out, turning into the equivalent of hard plastic. Regular rotation and alignment checks are non-negotiable for maximizing the ROI on premium rubber.
        `.trim(),
      },
      {
        title: 'Aerodynamics and the Rebirth of the Premium Sedan',
        slug: 'aerodynamics-rebirth-premium-sedan',
        categoryId: catMap.trends,
        thumbnailUrl: SEDAN_IMAGES[0],
        supportingImages: SEDAN_IMAGES.slice(1),
        content: `
## Defying the Crossover Craze

In a market aggressively dominated by high-riding SUVs, the traditional three-box sedan was prematurely declared dead. However, the rapid acceleration toward electrification has breathed new life into the sedan silhouette. Why? **Aerodynamics.**

### The Drag Coefficient Dictatorship

When designing an electric vehicle, highway range is the ultimate battleground. At speeds above 60 mph, aerodynamic drag becomes the primary force consuming battery power. A sedan, with its lower frontal area and tapering rear profile, naturally cleaves through the air far more efficiently than any SUV.

* **Active Grille Shutters:** Sedans are employing active aero that closes off the front grille when cooling isn't required, smoothing the airflow over the hood.
* **Air Curtains and Flat Underbellies:** By directing air through the front bumper and past the front wheels, engineers eliminate turbulent wheel-well drag. Smooth underbody panels further ensure the car slips through the atmosphere unnoticed.

### Center of Gravity and Driving Dynamics

There is a fundamental law of physics that SUVs cannot cheat: a high center of gravity compromises handling. Sedans inherently place the heaviest components—the engine, transmission, or battery pack—closer to the pavement. 

This results in:
1. Reduced body roll in corners.
2. Faster transient response during evasive maneuvers.
3. A more compliant ride, as engineers don't have to fit overly stiff springs to compensate for a high center of mass.

> "The sedan is not dead; it is simply evolving into the ultimate grand tourer of the electric era."

### Executive Comfort

Beyond the physics, the premium sedan remains the benchmark for executive comfort. By separating the passenger cabin from the trunk (the three-box design), sedans offer superior NVH (Noise, Vibration, and Harshness) insulation. Rear-seat passengers aren't subjected to the acoustic resonance of a massive, open cargo area, resulting in a whisper-quiet cabin environment perfectly suited for long-distance cruising.
        `.trim(),
      },
      {
        title: 'The Architecture of the Modern SUV: From Utility to Luxury',
        slug: 'architecture-modern-suv-utility-luxury',
        categoryId: catMap.case,
        thumbnailUrl: SUV_IMAGES[0],
        supportingImages: SUV_IMAGES.slice(1),
        content: `
## The Evolution of the Sports Utility Vehicle

The Sports Utility Vehicle (SUV) has undergone the most dramatic transformation in automotive history. Originally conceived as spartan, body-on-frame workhorses meant for agricultural and military use, they have evolved into the defacto luxury transport for the modern family.

### Body-on-Frame vs. Unibody Construction

Understanding modern SUVs requires understanding their skeletal structure. 

Historically, SUVs used **Body-on-Frame** construction—a heavy steel ladder frame to which the body and drivetrain were bolted. This is phenomenal for towing 10,000 pounds or traversing boulder-strewn trails, but terrible for ride quality and fuel economy.

Enter the **Unibody (Monocoque)** revolution. Modern crossovers integrate the frame and body into a single, cohesive unit.
* **The Benefit:** Massive weight reduction, resulting in car-like fuel economy and handling.
* **The Trade-off:** Reduced extreme off-road articulation, a compromise 99% of consumers happily accept for on-road comfort.

### Adaptive Suspension Systems

How does an SUV weighing 5,000 pounds ride like a luxury sedan on the highway, yet clear 10 inches of water off-road? The answer lies in **Air Suspension and Adaptive Dampers**.

Modern SUVs utilize heavily reinforced air bladders instead of traditional steel coil springs. At highway speeds, the onboard computer drops the vehicle by an inch to improve aerodynamics and center of gravity. When the driver selects "Off-Road Mode," the compressor inflates the bladders, lifting the chassis over obstacles. 

> Magnetorheological dampers read the road 1,000 times per second, altering the viscosity of the fluid inside the shock absorber to instantly switch from cloud-like comfort to sports-car firmness.

### The Future: Electric High-Riders

The transition to EVs is perfectly suited to the SUV format. The massive floorpans provide ample real estate for 100+ kWh battery packs. Furthermore, the inherent weight of the batteries sits below the floorboards, drastically lowering the center of gravity and eliminating the top-heavy driving dynamics that plagued SUVs of the 1990s. With instantaneous torque sent independently to all four wheels via dual motors, the modern electric SUV is an unstoppable force of engineering.
        `.trim(),
      }
    ];

    const finalArticlesToInsert = blogsData.map((blog) => ({
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      authorId: adminId,
      thumbnailUrl: blog.thumbnailUrl, 
      supportingImages: blog.supportingImages,
      status: 'PUBLISHED' as const,
      // Generate realistic metrics
      viewsCount: Math.floor(Math.random() * 2500) + 500, 
      likesCount: Math.floor(Math.random() * 400) + 50, 
      dislikesCount: Math.floor(Math.random() * 15),
      publishedAt: new Date(Date.now() - Math.floor(Math.random() * 5000000000)), // Published recently
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)) // Created slightly earlier
    }));

    const insertedArticles = await db.insert(articles).values(finalArticlesToInsert).returning();

    // Map inserted articles back to their categories
    const articleCategoryMappings = blogsData.map((blog, index) => ({
      articleId: insertedArticles[index].id,
      categoryId: blog.categoryId
    }));

    await db.insert(articleToCategories).values(articleCategoryMappings);

    console.log('Successfully seeded articles with deep markdown content and structured images.');

  } catch (error) {
    console.error('Error seeding blogs:', error);
  }
};