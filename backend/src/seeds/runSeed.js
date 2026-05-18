const seedData = require('./seedData');

seedData.run().then(() => {
  console.log('Seeding complete');
  process.exit(0);
}).catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
