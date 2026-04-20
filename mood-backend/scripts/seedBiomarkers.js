import Biomarker from "../models/biomarker.js";
import connectDB from "../config/db.js";

const DEFAULT_BIOMARKERS = [
  {
    name: 'Hemoglobin',
    aliases: ['hemoglobin', 'hb', 'hemoglobin (hb)', 'hgb', 'hb level', 'blood hemoglobin'],
    unit: 'g/dL',
      category: 'blood',
    ranges: {
      normalMin: 13.5,
      normalMax: 17.5,
    },
    thresholds: {
      low: 13.5,
      high: 17.5,
    },
    weight: 0.3,
    recommendations: {
      low: {
        immediate: [
          'Discuss anemia evaluation with your clinician',
          'Increase iron-rich foods like red meat, spinach, and lentils',
        ],
        daily: [
          'Ensure adequate rest and avoid strenuous activity',
          'Consider iron supplementation if advised by clinician',
        ],
      },
      high: {
        immediate: [
          'Review hydration status and medication use with clinician',
        ],
        daily: [
          'Maintain adequate hydration throughout the day',
          'Monitor for symptoms like fatigue or shortness of breath',
        ],
      },
      normal: {
        daily: [
          'Maintain balanced iron and B12 intake',
        ],
      },
    },
    explanations: {
      low: 'Hemoglobin is below the optimal range and may indicate anemia.',
      normal: 'Hemoglobin is within the optimal range.',
      high: 'Hemoglobin is above the optimal range.',
      notFound: 'Hemoglobin could not be confidently detected from this report.',
    },
    priority: 'high',
  },
  {
    name: 'Vitamin D',
    aliases: ['vitamin d', 'vit d', 'vitamin d 25 oh', '25-oh vitamin d', '25(oh)d', '25-oh-d', 'vitamin d3'],
    unit: 'ng/ml',
      category: 'vitamin',
    ranges: {
      normalMin: 30,
      normalMax: 100,
    },
    thresholds: {
      low: 30,
      high: 100,
    },
    weight: 0.35,
    recommendations: {
      low: {
        immediate: [
          'Increase sun exposure (10-30 minutes daily)',
          'Consider vitamin D supplementation with clinician guidance',
        ],
        daily: [
          'Add vitamin D-rich foods like fatty fish and egg yolks',
          'Prioritize regular outdoor activity',
        ],
      },
      high: {
        immediate: [
          'Review current vitamin D supplementation dose',
        ],
        daily: [
          'Maintain balanced hydration and monitor intake sources',
        ],
      },
      normal: {
        daily: [
          'Maintain current vitamin D supportive habits',
        ],
      },
    },
    explanations: {
      low: 'Vitamin D is below the optimal range and may affect mood and energy.',
      normal: 'Vitamin D is within the optimal range.',
      high: 'Vitamin D is above the optimal range and should be reviewed if persistent.',
      notFound: 'Vitamin D could not be confidently detected from this report.',
    },
    priority: 'medium',
  },
  {
    name: 'TSH',
    aliases: ['tsh', 'thyroid stimulating hormone', 't.s.h', 'thyroid hormone', 'tsh level', 'thyrotropin'],
    unit: 'mIU/L',
      category: 'hormone',
    ranges: {
      normalMin: 0.4,
      normalMax: 4.0,
    },
    thresholds: {
      low: 0.4,
      high: 4.0,
    },
    weight: 0.35,
    recommendations: {
      low: {
        immediate: [
          'Discuss low TSH with your clinician for thyroid evaluation',
        ],
        daily: [
          'Track symptoms such as palpitations, anxiety, or sleep disruption',
        ],
      },
      high: {
        immediate: [
          'Arrange follow-up thyroid review with your clinician',
        ],
        daily: [
          'Support thyroid health with consistent sleep and stress management',
        ],
      },
      normal: {
        daily: [
          'Maintain regular thyroid checkups as advised',
        ],
      },
    },
    explanations: {
      low: 'TSH is below the optimal range and may indicate thyroid overactivity.',
      normal: 'TSH is within the optimal range.',
      high: 'TSH is above the optimal range and may indicate thyroid underactivity.',
      notFound: 'TSH could not be confidently detected from this report.',
    },
    priority: 'high',
  },
  {
    name: 'Vitamin B12',
    aliases: ['vitamin b12', 'b12', 'cobalamin', 'cyanocobalamin', 'methylcobalamin', 'b-12', 'vitb12'],
    unit: 'pg/ml',
      category: 'vitamin',
    ranges: {
      normalMin: 200,
      normalMax: 900,
    },
    thresholds: {
      low: 200,
      high: 900,
    },
    weight: 0.3,
    recommendations: {
      low: {
        immediate: [
          'Discuss B12 repletion options with your clinician',
        ],
        daily: [
          'Increase B12-rich foods such as fish, eggs, and dairy',
        ],
      },
      high: {
        immediate: [
          'Review supplement use if taking high-dose B12 products',
        ],
        daily: [
          'Continue balanced nutrition and routine monitoring',
        ],
      },
      normal: {
        daily: [
          'Maintain current B12-supportive dietary pattern',
        ],
      },
    },
    explanations: {
      low: 'Vitamin B12 is below the optimal range and can affect energy and focus.',
      normal: 'Vitamin B12 is within the optimal range.',
      high: 'Vitamin B12 is above the optimal range and should be trended over time.',
      notFound: 'Vitamin B12 could not be confidently detected from this report.',
    },
    priority: 'medium',
  },
];

const seedBiomarkers = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('✓ Connected to MongoDB');

    // Clear existing biomarkers (optional)
    const count = await Biomarker.countDocuments();
    if (count > 0) {
      console.log(`Found ${count} existing biomarkers. Skipping seed to avoid duplicates.`);
      console.log('If you want to reset, comment out the clearance check.');
      process.exit(0);
    }

    // Insert default biomarkers
    const inserted = await Biomarker.insertMany(DEFAULT_BIOMARKERS);
    console.log(`✓ Inserted ${inserted.length} biomarkers:`);

    inserted.forEach(b => {
      console.log(`  - ${b.name} (${b.unit}, weight: ${b.weight})`);
    });

    console.log('\n✓ Biomarker seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding biomarkers:', error);
    process.exit(1);
  }
};

seedBiomarkers();
