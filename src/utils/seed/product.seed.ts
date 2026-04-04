import { db } from '../../configs/db';
import { products, categories, dealerAuthorizedProducts } from '../../db/schema';
import { logger } from '../logger';

const TYRE_IMAGES = [
  'https://m.media-amazon.com/images/I/61NLLINuwaL.jpg',
  'https://img.freepik.com/free-vector/realistic-complete-set-car-wheels_1284-29765.jpg?semt=ais_incoming&w=740&q=80',
  'https://rukminim2.flixcart.com/image/480/640/xif0q/vehicle-tire/f/q/l/h-wanderer-street-car-tyre-215-60r16-400-1-tube-less-mrf-original-imah3d3hmeymzprh.jpeg?q=90',
  'https://static.vecteezy.com/system/resources/thumbnails/001/396/977/small/tires-for-trucks-free-photo.jpg'
];

const BATTERY_IMAGES = [
  'https://images.tayna.com/prod-images/1200/Powerline/065-powerline-45-435.jpg',
  'https://batteryexpertsindia.in/wp-content/uploads/2022/06/exide-car-battery.jpg',
  'https://images.tayna.com/prod-images/1200/Powerline/012-powerline-44-340.jpg',
  'https://m.media-amazon.com/images/I/41L4M539KsL._AC_UF1000,1000_QL80_.jpg'
];

const categoriesData = [
  {
    name: 'Automotive Tyres',
    slug: 'automotive-tyres',
    description: 'High-quality durable tyres for all terrains and vehicle types.',
    imageUrl: TYRE_IMAGES[1],
    searchBlueprint: {
      filters: [
        { label: 'Vehicle Type', options: ['Car', 'SUV', 'Truck', 'Commercial'] },
        { label: 'Rim Size (Inches)', options: ['14', '15', '16', '17', '18', '19', '20', '22'] },
        { label: 'Terrain', options: ['Highway', 'All-Terrain', 'Mud-Terrain', 'Winter'] }
      ]
    }
  },
  {
    name: 'Automotive Batteries',
    slug: 'automotive-batteries',
    description: 'Reliable, long-lasting automotive and commercial batteries.',
    imageUrl: BATTERY_IMAGES[1],
    searchBlueprint: {
      filters: [
        { label: 'Vehicle Type', options: ['Car', 'SUV', 'Truck', 'Tractor'] },
        { label: 'Voltage', options: ['12V', '24V'] },
        { label: 'Capacity (Ah)', options: ['35Ah', '45Ah', '60Ah', '80Ah', '100Ah', '150Ah'] }
      ]
    }
  }
];

const randItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const seedProducts = async () => {
  try {
    logger.info('⏳ Seeding Categories and Products...');

    await db.delete(dealerAuthorizedProducts);
    await db.delete(products);
    await db.delete(categories);

    const insertedCategories = await db.insert(categories).values(categoriesData).returning();
    logger.info(`✅ Inserted ${insertedCategories.length} Categories.`);

    const tyreCategoryId = insertedCategories.find(c => c.slug === 'automotive-tyres')!.id;
    const batteryCategoryId = insertedCategories.find(c => c.slug === 'automotive-batteries')!.id;

    const productsToInsert: any[] = [];

    const tyreBrands = ['RoadKing', 'GripMax', 'TreadMaster', 'AeroFlow'];
    const tyreVehicleTypes = ['Car', 'SUV', 'Truck', 'Commercial'];
    const rimSizes = ['14', '15', '16', '17', '18', '19', '20', '22'];
    const tyreTerrains = ['Highway', 'All-Terrain', 'Mud-Terrain', 'Winter'];
    
    const widths = [195, 205, 215, 225, 245];
    const profiles = [50, 55, 60, 65];

    for (let i = 0; i < 15; i++) {
      const brand = randItem(tyreBrands);
      const vehicleType = randItem(tyreVehicleTypes);
      const rim = randItem(rimSizes);
      const terrain = randItem(tyreTerrains);
      const width = randItem(widths);
      const profile = randItem(profiles);
      
      productsToInsert.push({
        name: `${brand} ${terrain} Series ${width}/${profile} R${rim}`,
        sku: `TYRE-${brand.substring(0, 3).toUpperCase()}-${width}${profile}${rim}-${i + 100}`,
        hsnCode: '40111010',
        categoryId: tyreCategoryId,
        description: `Premium ${terrain.toLowerCase()} tyre designed for superior grip, enhanced fuel efficiency, and a comfortable ride.`,
        images: [TYRE_IMAGES[i % TYRE_IMAGES.length]],
        basePrice: randInt(4000, 15000),
        moq: randItem([4, 10, 20]),
        stock: randInt(50, 500),
        certifications: ['ISO 9001', 'ISI Marked'],
        warrantyInfo: '3 Years Manufacturer Warranty.',
        specifications: {
          SectionWidth: `${width} mm`,
          AspectRatio: `${profile}%`,
          LoadIndex: randInt(85, 110),
          SpeedRating: randItem(['H', 'V', 'W', 'Y'])
        },
        compatibilities: {
          'Vehicle Type': vehicleType,
          'Rim Size (Inches)': rim,
          'Terrain': terrain
        },
        bulkPricing: { '20': 5, '50': 10 },
        averageRating: 0,
        reviewCount: 0,
      });
    }

    const batteryBrands = ['PowerCore', 'VoltMax', 'EnergyPlus', 'ThunderDrive'];
    const batteryVehicleTypes = ['Car', 'SUV', 'Truck', 'Tractor'];
    const voltages = ['12V', '24V'];
    const capacities = ['35Ah', '45Ah', '60Ah', '80Ah', '100Ah', '150Ah'];

    for (let i = 0; i < 15; i++) {
      const brand = randItem(batteryBrands);
      const vehicleType = randItem(batteryVehicleTypes);
      const voltage = randItem(voltages);
      const capacity = randItem(capacities);
      
      productsToInsert.push({
        name: `${brand} ${capacity} Heavy Duty Battery`,
        sku: `BATT-${brand.substring(0, 3).toUpperCase()}-${capacity.toUpperCase()}-${i + 200}`,
        hsnCode: '85071000',
        categoryId: batteryCategoryId,
        description: `High-performance ${voltage} automotive battery designed specifically for modern ${vehicleType.toLowerCase()}s.`,
        images: [BATTERY_IMAGES[i % BATTERY_IMAGES.length]],
        basePrice: randInt(3500, 12000),
        moq: randItem([5, 10, 50]),
        stock: randInt(30, 300),
        certifications: ['ISO 14001', 'CE Certified'],
        warrantyInfo: '48 Months Pro-Rata Warranty.',
        specifications: {
          TerminalType: randItem(['Standard', 'Small', 'Bolt-on']),
          Technology: 'Sealed Maintenance Free (SMF)',
          Weight: `${randInt(12, 35)} kg`
        },
        compatibilities: {
          'Vehicle Type': vehicleType,
          'Voltage': voltage,
          'Capacity (Ah)': capacity
        },
        bulkPricing: { '10': 3, '30': 8 },
        averageRating: 0,
        reviewCount: 0,
      });
    }

    await db.insert(products).values(productsToInsert);
    logger.info(`✅ Inserted ${productsToInsert.length} Products.`);

  } catch (error) {
    logger.error('❌ Error seeding products:', error);
  }
};