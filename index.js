const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const app = require('./app');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
.then(() => {
  console.log('✅ MongoDB connected');
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error('❌ Failed to connect to MongoDB');
  console.error(`Reason: ${err.name} - ${err.message}`);
  if (err.name === 'MongoParseError') {
    console.error('\n🔍 Hint: Check if your MONGO_URI starts with "mongodb://" or "mongodb+srv://"\n');
  }

  process.exit(1);
});
