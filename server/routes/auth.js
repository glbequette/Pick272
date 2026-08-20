const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

const FRONTEND_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY); // Add this key to Render env vars


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

    // 1. Save user to database first
    await newUser.save();

    // 2. Try sending the email, but catch email errors separately
    // Remove the global transporter at the top of the file, and put it inside your try/catch:

    // 2. Try sending the email, but catch email errors separately
    try {
      const FRONTEND_URL = process.env.CLIENT_URL || 'http://localhost:5173';
      const verificationLink = `${FRONTEND_URL}/verify?token=${verificationToken}`;

      await resend.emails.send({
        // Change this to your custom domain once it is verified in Resend!
        from: 'Pick272 <onboarding@resend.dev>', 
        to: email,
        subject: 'Welcome to Pick272! Verify your account 🏈',
        html: `
          <div style="font-family: Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 40px 20px; text-align: center; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
            <h1 style="color: #38bdf8; font-size: 32px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">
              Welcome to Pick272!
            </h1>
            <p style="font-size: 18px; color: #94a3b8; margin-bottom: 30px; line-height: 1.5;">
              You are one step away from locking in your NFL picks. Click the button below to verify your email address and activate your account.
            </p>
            <a href="${verificationLink}" style="background-color: #22c55e; color: #0b0f19; padding: 16px 32px; text-decoration: none; font-weight: 800; font-size: 18px; border-radius: 8px; display: inline-block; letter-spacing: 1px;">
              VERIFY MY ACCOUNT
            </a>
            <p style="font-size: 12px; color: #475569; margin-top: 40px;">
              If you didn't create an account with Pick272, you can safely ignore this email.
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error("Resend error:", emailError);
    }

    // 3. Send success response safely no matter what
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