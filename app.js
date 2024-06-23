require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const Hospital = require("./models/hospital");
const User = require("./models/user");
const session = require("express-session");
const flash = require("connect-flash");
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "/views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.engine("ejs", ejsMate);

// Connect to MongoDB
async function main() {
  const url = process.env.db_url
  try {
    await mongoose.connect(url);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}
main();

// Configure session
app.use(session({
  secret: 'yourSecretKey', // Replace with a secure secret key
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
  }
}));

app.use(flash());

// Initialize Passport and session handling
app.use(passport.initialize());
app.use(passport.session());

passport.use('hospital-local', new LocalStrategy(Hospital.authenticate()));
passport.use('user-local', new LocalStrategy(User.authenticate()));
passport.serializeUser((entity, done) => {
  done(null, { id: entity.id, type: entity.constructor.modelName });
});

passport.deserializeUser(async (obj, done) => {
  try {
    const Model = obj.type === 'Hospital' ? Hospital : User;
    const entity = await Model.findById(obj.id).exec();
    done(null, entity);
  } catch (err) {
    done(err);
  }
});

// Middleware to set local variables for templates
app.use((req, res, next) => {
  if (req.user) {
    res.locals.username = req.user.username;
    res.locals.userType = req.user.constructor.modelName; // 'Hospital' or 'User'
  } else {
    res.locals.username = null;
    res.locals.userType = null;
  }
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});


// Routes for Hospital
app.get('/hospitalHome', (req, res) => {
  res.render("hospitals/hospitalHome.ejs");
});

app.get('/hospitalLogin', (req, res) => {
  res.render("hospitals/hospitalLogin.ejs");
});

app.post('/hospitalLogin', (req, res, next) => {
  console.log("Hospital login request received");
  passport.authenticate('hospital-local', (err, hospital, info) => {
    console.log("Authentication callback triggered");
    if (err) {
      console.error("Error during authentication:", err);
      return next(err);
    }
    if (!hospital) {
      console.log("Hospital not found");
      req.flash('error', 'Invalid email or password');
      return res.redirect('/hospitalLogin');
    }
    req.logIn(hospital, (err) => {
      if (err) {
        console.error("Error during login:", err);
        return next(err);
      }
      console.log("Hospital logged in successfully");
      req.flash('success', 'Logged in successfully!');
      return res.redirect('/hospitalHome');
    });
  })(req, res, next);
});

app.get('/hospitalRegister', (req, res) => {
  res.render("hospitals/hospitalRegister.ejs");
});

app.post('/hospitalRegister', async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const hospital = new Hospital({ email, username });
    const registeredHospital = await Hospital.register(hospital, password);

    // Automatically log in the registered hospital
    req.logIn(registeredHospital, err => {
      if (err) return next(err);
      req.flash('success', 'Successfully registered and logged in!');
      res.redirect('/hospitalHome');
    });
  } catch (e) {
    req.flash('error', e.message);
    res.redirect('/hospitalRegister');
  }
});

app.get('/hospitalLogout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash('success', 'Logged out successfully!');
    res.redirect('/home');
  });
});
// Routes for User
app.get('/userHome', (req, res) => {
  res.render("users/userHome.ejs");
});

app.get('/userLogin', (req, res) => {
  res.render("users/userLogin.ejs");
});

app.post('/userLogin', (req, res, next) => {
  console.log("User login request received");
  passport.authenticate('user-local', (err, user, info) => {
    console.log("Authentication callback triggered");
    if (err) {
      console.error("Error during authentication:", err);
      return next(err);
    }
    if (!user) {
      console.log("User not found");
      req.flash('error', 'Invalid username or password');
      return res.redirect('/userLogin');
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error("Error during login:", err);
        return next(err);
      }
      console.log("User logged in successfully");
      req.flash('success', 'Logged in successfully!');
      return res.redirect('/userHome');
    });
  })(req, res, next);
});

app.get('/userRegister', (req, res) => {
  res.render("users/userRegister.ejs");
});

app.post('/userRegister', async (req, res, next) => {
  try {
    const { userId, username, name, mobileNo, guardianNo, bloodGrp, healthDetails, password } = req.body;
    // Create a new user instance
    const user = new User({ userId, username, name, mobileNo, guardianNo, bloodGrp, healthDetails });
    const registeredUser = await User.register(user, password); // This ensures the password is hashed

    // Log the registered user details
    console.log("New registered user:", registeredUser);

    req.login(registeredUser, err => {
      if (err) return next(err);
      req.flash('success', 'Successfully registered!');
      res.redirect('/userHome');
    });
  } catch (e) {
    console.error(e);  // Log the error
    req.flash('error', e.message);
    res.redirect('/userRegister');
  }
});

app.get('/userLogout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash('success', 'Logged out successfully!');
    res.redirect('/home');
  });
});

app.get("/userEdit/:id",(req,res)=>{
  res.render("users/editUser.ejs")
})


app.put("/userEdit/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { username, mobileNo, guardianNo, bloodGrp, healthDetails } = req.body;

    // Find the user by ID and update their details
    await User.findByIdAndUpdate(id, {
      username,
      mobileNo,
      guardianNo,
      bloodGrp,
      healthDetails
    });

    res.redirect("/userHome"); // Redirect to user home page after successful update
  } catch (error) {
    console.error("Error updating user:", error);
    req.flash("error", "Failed to update user details");
    res.redirect("/userEdit/:id"); // Redirect back to edit page with error message
  }
});
app.get("/home",(req,res)=>{
  res.render("users/home.ejs")
})
app.get("/",(req,res)=>{
  res.render("users/home.ejs")
})
app.post('/search', async (req, res) => {
  const { userId } = req.body;

  try {
    const currUser = await User.findOne({ userId: userId });
    console.log(currUser)
    if (currUser) {
      console.log("succ")
      res.render('hospitals/userDetails.ejs', { currUser });
    } else {
      req.flash('error', 'User not found');
      res.redirect('/hospitalHome');
    }
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred while searching for the user');
    res.redirect('/hospitalHome');
  }
});

app.get("/about",(req,res)=>{
  res.render("about.ejs")
})
app.all("*", (req, res, next) => {
  next(new ExpressError(404, "page Not Found"));
});

//Error handling
app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something went Worng" } = err;
  res.status(statusCode).render("error.ejs", { err });
});

app.listen(3000, () => {
  console.log("App is listening on port 3000");
});
