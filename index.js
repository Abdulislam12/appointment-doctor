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
    console.log(`🚀 User Services Running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error('❌ DB Connection Error:', err));
