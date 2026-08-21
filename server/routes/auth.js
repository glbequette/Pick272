const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// 1. Import and initialize the filter
const { Filter } = require('bad-words');
const filter = new Filter();

const router = express.Router();

const FRONTEND_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY); // Add this key to Render env vars


// REGISTER A NEW USER
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 2. Check the username for profanity before doing anything else
    if (filter.isProfane(username)) {
      return res.status(400).json({ error: 'Username not allowed.' });
    }

    // Check if user already exists
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
      const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
      const verificationLink = `${BACKEND_URL}/api/auth/verify/${verificationToken}`;

      await resend.emails.send({
      // Change this to your custom domain once it is verified in Resend!
      from: 'Pick272 <noreply@pick272.com>',
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
      message: 'Registration successful! Please check your email to verify your account.' 
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// VERIFY EMAIL ENDPOINT (Instant Redirect)
router.get('/verify/:token', async (req, res) => {
  const FRONTEND_URL = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      // If token is invalid, redirect to frontend with an error flag in the URL
      return res.redirect(`${FRONTEND_URL}?error=invalid_token`);
    }

    // Update user to verified and clear the token
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    // SUCCESS! Redirect straight back to the login page!
    // We add ?verified=true so your frontend could theoretically show a "Success" popup if you want later
    res.redirect(`${FRONTEND_URL}?verified=true`);

  } catch (error) {
    console.error("Verification Error:", error);
    res.redirect(`${FRONTEND_URL}?error=server_error`);
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


router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'If that email exists, a reset link has been sent.' }); // Vague for security
    }

    // Generate a random 32-character token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Save token and set expiration to 1 hour from now
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const FRONTEND_URL = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${FRONTEND_URL}/?resetToken=${resetToken}`;

    try {
      await resend.emails.send({
        from: 'Pick272 <noreply@pick272.com>', 
        to: email,
        subject: 'Pick272 - Password Reset Request',
        html: `
          <div style="font-family: Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 40px 20px; text-align: center; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
            <h2 style="color: #38bdf8; text-transform: uppercase;">Password Reset Request</h2>
            <p style="color: #94a3b8; font-size: 16px; margin-bottom: 24px;">You requested a password reset for your Pick272 account. Click the button below to set a new password. This link will expire in 1 hour.</p>
            <a href="${resetLink}" style="padding: 14px 28px; background: #22c55e; color: #0b0f19; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">RESET PASSWORD</a>
            <p style="color: #475569; font-size: 12px; margin-top: 32px;">If you did not request this, please ignore this email.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error("Resend reset password error:", emailError);
      // We don't crash here so the frontend doesn't hang
    }

    res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});


router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Find user with matching token that has NOT expired yet
    const user = await User.findOne({ 
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    // Hash the new password and wipe the tokens
    const bcrypt = require('bcryptjs');
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password successfully reset! You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

module.exports = router;