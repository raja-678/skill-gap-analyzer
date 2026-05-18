const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

class AuthService {
  static mapDbUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type,
      bio: user.bio,
      profilePictureUrl: user.profile_picture_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  static async register(email, password, username, firstName, lastName, userType = 'candidate') {
    try {
      console.log('🔍 Checking for existing user:', { email, username });

      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        const message = existingUser.email === email ? 'Email already exists' : 'Username already exists';
        throw new Error(message);
      }

      console.log('🔐 Hashing password...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      console.log('💾 Creating new user...');
      const user = new User({
        email,
        username,
        firstName,
        lastName,
        password: passwordHash,
        profile: {
          userType
        }
      });

      console.log('📤 Saving user to database...');
      await user.save();
      console.log('✅ User saved successfully:', user.id);

      const token = this.generateToken(user.id, user.email);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        },
        token
      };
    } catch (error) {
      console.error('❌ Error registering user:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      });
      throw error;
    }
  }

  static async login(email, password) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error('User not found');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      const token = this.generateToken(user.id, user.email);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name
        },
        token
      };
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new Error('Invalid token');
    }
  }

  static generateToken(userId, email) {
    return jwt.sign(
      { userId, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      return this.mapDbUser(user);
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  static async updateUserProfile(userId, profileData) {
    try {
      const user = await User.findByIdAndUpdate(userId, profileData);
      return this.mapDbUser(user);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
}

module.exports = AuthService;
