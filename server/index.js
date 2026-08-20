const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const friendRoutes = require('./routes/friends');

// Import the new auth routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const leagueRoutes = require('./routes/leagues');
const pickRoutes = require('./routes/picks');
const runAutoUpdater = require('./services/scoreUpdater');


// Load environment variables
dotenv.config();

// Initialize the app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://pick272.com',
  'https://www.pick272.com',
  // Replace with your exact Vercel URL
  'https://pick272.vercel.app' 
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);

    // Allow if exact match in list OR if it is any vercel.app preview URL
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`Blocked origin by CORS: ${origin}`);
      callback(new Error(`Blocked by CORS policy: ${origin}`));
    }
  },
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Mount the Auth Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/picks', pickRoutes);
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/friends', friendRoutes);

// Start the automated background jobs
runAutoUpdater();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'NFL Picker API is running smoothly!' });
});

// Start the Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});