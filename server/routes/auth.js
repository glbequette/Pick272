const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// REGISTER A NEW USER
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a secure random token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      verificationToken
    });
    await newUser.save();

    // Send the verification email
    const verificationLink = `${API_BASE}/api/auth/verify/${verificationToken}`;
    
    await transporter.sendMail({
      from: `"Pick272" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your Pick272 Account',
      html: `
        <h2>Welcome to Pick272, ${username}!</h2>
        <p>Please click the link below to verify your email address and activate your account.</p>
        <a href="${verificationLink}" style="padding: 10px 20px; background: #22c55e; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Verify My Account</a>
      `
    });

    // UPDATED: Added the Spam Folder notification here
    res.status(201).json({ 
      message: 'Registration successful! Please check your email (and your Spam folder) to verify your account.' 
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// VERIFY EMAIL ENDPOINT
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    
    if (!user) {
      return res.status(400).send('Invalid or expired verification link.');
    }

    user.isVerified = true;
    user.verificationToken = undefined; // Clear the token
    await user.save();

    // Redirect the user back to your React frontend with a success parameter
    res.redirect('${API_BASE}/?verified=true');
  } catch (error) {
    res.status(500).send('Server error during verification.');
  }
});

// LOGIN USER
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password.' });

    // Block login if they haven't verified their email
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please check your email and verify your account before logging in.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password.' });

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: { id: user._id, username: user.username }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login.' });
  }
});


// UPDATE USER ACCOUNT
router.put('/update/:id', async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    
    // Find the user
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Handle Password Change (if requested)
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password is required to change password.' });
      
      const bcrypt = require('bcryptjs'); // Ensure bcrypt is available
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ error: 'Invalid current password.' });
      
      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Handle Username Change
    if (username && username !== user.username) {
      // Check if username is already taken
      const existingUser = await User.findOne({ username });
      if (existingUser) return res.status(400).json({ error: 'Username is already taken.' });
      
      user.username = username;
    }

    await user.save();

    // Return the updated user info (excluding the password)
    res.status(200).json({ 
      message: 'Account updated successfully!', 
      user: { id: user._id, username: user.username } 
    });
    
  } catch (error) {
    console.error('Account update error:', error);
    res.status(500).json({ error: 'Failed to update account.' });
  }
});

module.exports = router;