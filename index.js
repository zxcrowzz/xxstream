
const express = require('express');
const app = express();
const PendingUser = require('./models/PendingUser');
const path = require('path');
const nodemailer = require('nodemailer');
const bcrypt = require("bcrypt");
const passport = require("passport");
const LocalStrategy = require('passport-local').Strategy;
const flash = require("express-flash");
const session = require("express-session");
const mongoose = require('mongoose');
const router = express.Router();
const User = require('./models/User');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const stripe = require('stripe')('your-secret-key');
app.use(express.static(path.join(__dirname, 'public')));
const crypto = require('crypto');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});

cloudinary.config({
    cloud_name: "djcv26add",
    api_key: "235577861793754",
    api_secret: "PYLidFD5SaMU1APnjM3cztvn9wQ"
  });

// Set EJS as the view engine
app.set('view engine', 'ejs');
const upload1 = multer({ storage: multer.memoryStorage() });











// Set the views folder where your HTML files (EJS templates) are stored
app.set('views', path.join(__dirname, 'views'));

// Serve static files (optional if you want to serve images, CSS, JS, etc. from a public folder)
app.use(express.static(path.join(__dirname, 'public')));

// Define a route to render the HTML (EJS) file

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
      user: 'pantsbro4@gmail.com', // Replace with your email
      pass: 'tpxy ymac aupu ktow'   // Replace with your password
  },
  tls: {
      rejectUnauthorized: false
  }
});

// Initialize Passport
function initialize(passport) {
  const authenticateUser = async (email, password, done) => {
      try {
          const user = await User.findOne({ email });
          if (!user) {
              return done(null, false, { message: 'No user with that email' });
          }
          if (await bcrypt.compare(password, user.password)) {
              return done(null, user); // Pass the whole user object
          } else {
              return done(null, false, { message: 'Password incorrect' });
          }
      } catch (e) {
          return done(e);
      }
  };

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));
  
  passport.serializeUser((user, done) => {
      done(null, user.id); // Serialize by user ID
  });

  passport.deserializeUser(async (id, done) => {
      try {
          const user = await User.findById(id);
          done(null, user); // Pass the entire user object
      } catch (err) {
          done(err, null);
      }
  });
}

initialize(passport);

// MongoDB connection
mongoose.connect('mongodb+srv://pantsbro4:Saggytits101@cluster0.mthcl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  serverSelectionTimeoutMS: 30000
  
})

.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));
app.use('/api', router);
app.use(flash());
app.use(session({
  secret: "abcccccc1221321312231aa",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
function isVerified(req, res, next) {
  if (!req.isAuthenticated()) {
      return res.redirect('/login'); // Redirect if the user is not logged in
  }
  
  if (!req.user.isVerified) {
      return res.redirect('/verify'); // Redirect to the verify page if not verified
  }

  next(); // If authenticated and verified, allow access to the route
}
// Authentication middleware
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }
  res.redirect('/login');
}
async function getUserByEmail(email) {
  console.log('hasfhjba ' , email)
  try {
      return await User.findOne({ email }).populate('friends'); // Populate friends if needed
  } catch (error) {
      console.error(`Error fetching user by email: ${email}`, error);
      return null; // Return null in case of error
  }


  
}
function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return res.redirect('/');
  }
  next();
}

// Register route
app.post("/register", [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
          throw new Error('Passwords must match');
      }
      return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
  }

  try {
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
          return res.status(400).json({ error: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      // Generate a random 6-digit confirmation code
      const confirmationCode = crypto.randomInt(100000, 999999).toString();

      const pendingUser = new PendingUser({
          username: req.body.username,
          email: req.body.email,
          password: hashedPassword,
          confirmationCode
      });

      await pendingUser.save();

      await transporter.sendMail({
          to: pendingUser.email,
          subject: 'Confirm Email',
          html: `Your confirmation code is: <strong>${confirmationCode}</strong>. Please enter it to verify your email.`
      });

      res.render('enter-code');
  } catch (e) {
      console.error(e);
      res.status(500).send('Server error');
  }
});


const messageSchema = new mongoose.Schema({
  sender: String,
  recipient: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);
// Email confirmation
app.post('/verify-email', [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('confirmationCode').isLength({ min: 6, max: 6 }).withMessage('Confirmation code must be 6 digits')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
  }

  try {
      const { email, confirmationCode } = req.body;

      // Find pending user by email and confirmation code
      const pendingUser = await PendingUser.findOne({ email, confirmationCode });

      if (!pendingUser) {
          return res.status(400).send('Invalid confirmation code or email');
      }

      // Create new user from the pending user
      const newUser = new User({
          name: pendingUser.username,
          email: pendingUser.email,
          password: pendingUser.password,
          isVerified: true
      });

      await newUser.save();
      await PendingUser.deleteOne({ email: pendingUser.email });

      res.send('Email confirmed. You can now log in.');
  } catch (e) {
      console.log(e);
      res.status(500).send('Server error');
  }
});
// Login route
app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render("emlogin");
});

// Handle login with verification
app.post("/login", async (req, res, next) => {
  const userCaptchaInput = req.body.capIn; // The CAPTCHA input from the user
  const generatedCaptcha = req.body.generatedCaptcha; // The generated CAPTCHA sent from the client

  console.log("User CAPTCHA Input:", userCaptchaInput);
  console.log("Generated CAPTCHA:", generatedCaptcha);

  if (userCaptchaInput !== generatedCaptcha) {
      // CAPTCHA does not match
      console.log("CAPTCHA validation failed");
      return res.render("emlogin.ejs", { message: "Invalid CAPTCHA. Please try again." });
  }

  // Proceed to authentication only if CAPTCHA is correct
  passport.authenticate('local', async (err, user, info) => {
      if (err) {
          return next(err);
      }
      if (!user) {
          return res.render("emlogin.ejs", { message: "Invalid username or password." });
      }
      req.logIn(user, async (err) => {
          if (err) {
              return next(err);
          }

          const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
          req.session.verificationCode = verificationCode;

          await transporter.sendMail({
              to: user.email,
              subject: 'Your Verification Code',
              html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>`,
          });

          // Redirect to the verification page after login
          req.session.userEmail1 = req.body.email;
          return res.redirect('/verify');
      });
  })(req, res, next);
});



// Verification route
app.get('/verify', checkAuthenticated, (req, res) => {
  if (req.isAuthenticated()) {
      return res.render('verify'); // Render verification form if not verified
  }

  // If the user is already verified, redirect them to another page
  if (req.isAuthenticated()) {
      return res.render('em'); // Or any other page
  }

  // If the user is not authenticated, redirect to login page
 res.render('emlogin');
});

// Handle verification code submission
app.post('/verify', async (req, res) => {
  const { code } = req.body;

  // Check if the verification code is valid
  if (code === req.session.verificationCode) {
      try {
          const userEmail = req.session.userEmail1;

          // Find the user by email and update their isVerified field to true
          const user = await User.findOne({ email: userEmail });

          if (!user) {
              return res.status(404).send('User not found.');
          }

          // Update the isVerified field to true
          req.session.isVerified = true;

          // Save the user with the updated isVerified field
          await user.save();

          // Optionally, you can delete the session data after successful verification
          delete req.session.verificationCode;
          delete req.session.userEmail;
      
          // Redirect to insighta.html or any other page after successful verification
          return res.render('em');
      } catch (err) {
          console.error(err);
          return res.status(500).send('Server error');
      }
  } else {
      // If the verification code is incorrect, send an error message
      res.send('Invalid verification code. Please try again.');
  }
});


app.get('/em.ejs', (req, res) => {
  if (req.session.userEmail1) {
      if (req.session.isVerified) {
          // User is logged in and verified, proceed to the page
          return res.render('em');
      } else {
          // User is logged in but not verified, redirect to the verification page
          return res.render('verify');
      }
  } else {
      // User is not authenticated, redirect to login
      return res.render('emlogin');
  }
});
// Redirect root to a new room
// Redirect root to a new room (home page)
app.get('/', (req, res) => {
  if (req.session.userEmail1) {
      if (req.session.isVerified) {
          // User is logged in and verified, show the main page
          res.render('em');
      } else {
          // User is logged in but not verified, redirect to the verification page
          return res.render('verify');
      }
  } else {
      // User is not logged in, redirect to login
      return res.render('emlogin');
  }
});


app.post('/redirect', (req, res) => {
  res.redirect('/register');
});

// User search route


app.post('/redirect1', (req, res) => {
  res.redirect('/login');
});


// Registration route
app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render("emregister");
});

app.get('/messagez', (req , res) => {
res.render("emmessages")
});


app.get('/get-username', async (req, res) => {
    try {
      // Assuming the user's email is stored in the session
      const userEmail = req.session.userEmail1;
  
      // Find the user by email
      const user = await User.findOne({ email: userEmail });
  
      if (!user) {
        return res.status(404).send('User not found');
      }
  
      // Send the username (name) back to the client
      res.json({
        name: user.name
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });

app.get('/listproduct', (req , res) => {

res.render("listproduct")
});

app.get('/enter-code', (req, res) => {
  res.render('enter-code');  // This should render your HTML form for entering the confirmation code
});
app.use('/upload-profile', upload1.single('profileImage'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
  
    try {
      // Upload the image to Cloudinary
      const result = await cloudinary.uploader.upload_stream(
        { resource_type: 'image', public_id: `profile_images/${req.user._id}` }, // Customize public_id if needed
        async (error, result) => {
          if (error) {
            return res.status(500).json({ message: 'Error uploading image to Cloudinary', error });
          }
  
          // Update the user profile with the Cloudinary URL
          const user = await User.findByIdAndUpdate(
            req.user._id, // Assuming `req.user` contains the logged-in user
            { profileImageUrl: result.secure_url },
            { new: true }
          );
  
          // Return the updated user data
          res.status(200).json({ message: 'Profile image uploaded successfully', user });
        }
      );
  
      // Pipe the file buffer from Multer to Cloudinary's upload stream
      result.end(req.file.buffer);
    } catch (error) {
      console.error('Error uploading profile image:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });





  app.get('/profile', async (req, res) => {
    try {
      const user = await User.findById(req.user._id); // Ensure the user is authenticated
  
      res.status(200).json({
        message: 'Profile fetched successfully',
        user: {
          name: user.name,
          email: user.email,
          profileImageUrl: user.profileImageUrl, // Send the profile image URL
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching profile data', error });
    }
  });

  app.get("/time", (req, res) => {
    const serverTime = new Date();
    res.json({
        time: serverTime.toISOString(), // Send time in ISO format
    });
});


const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: String,
  imageUrl: String,
  createdAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Reference to User schema
});
const Product = mongoose.model('Product', productSchema);


// Handle Product Submission
app.post('/submit-product', upload1.single('productImage'), async (req, res) => {
  try {
    const userId = req.user._id; // Replace with proper authentication middleware
    const { productName, productDescription, productPrice, productCategory } = req.body;

    // Ensure file exists
    if (!req.file) throw new Error('No file uploaded');

    // Upload image to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'products' },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const imageUrl = result.secure_url; // Get the uploaded image URL

    // Save product with userId
    const newProduct = new Product({
      name: productName,
      description: productDescription,
      price: productPrice,
      category: productCategory,
      imageUrl, // Save the image URL
      userId,
    });
    await newProduct.save();

    res.status(200).send({ message: 'Product saved successfully!', product: newProduct });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error saving product', error });
  }
});

app.get('/products/:category', async (req, res) => {
  const category = req.params.category;
  try {
    const products = await Product.find({ category }).populate('userId', 'name'); // Assuming "name" is in the User schema
    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found for this category' });
    }
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
});

app.delete('/delete-product/:id', async (req, res) => {
  try {
    const userId = req.user._id; // Get user ID from authentication middleware
    const productId = req.params.id;

    // Find the product
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Check if the logged-in user is the owner of the product
    if (product.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this product' });
    }

    // Delete the product
    await Product.findByIdAndDelete(productId);

    res.status(200).json({ message: 'Product deleted successfully!' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product', error });
  }
});
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send({ message: 'Error logging out' });
    }
    res.clearCookie('connect.sid'); // Replace 'connect.sid' with your session cookie name if different
    res.status(200).send({ message: 'Logged out successfully' });
  });
});

app.get('/productpage', async (req, res) => {
res.render('productpage')

});