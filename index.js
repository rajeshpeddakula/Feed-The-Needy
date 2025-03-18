const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Donation = require("./models/Donation");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
})
  .then(() => console.log("MongoDB Connected Successfully!"))
  .catch((error) => console.log(`MongoDB connection error: ${error}`));

const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: "mySessions",
});

store.on("error", (error) => console.log(error));

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    store: store,
  })
);

const checkAuth = (req, res, next) => {
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.redirect("/login");
  }
};

app.get("/", (req, res) => res.render("home"));
app.get("/signup", (req, res) => res.render("register"));
app.get("/login", (req, res) => res.render("login"));

app.get("/dashboard", checkAuth, async (req, res) => {
  const donations = await Donation.find();
  res.render("welcome", { username: req.session.person, donations });
});

app.post("/register", async (req, res) => {
  const { username, email, password, contactNumber } = req.body;

  let user = await User.findOne({ email });
  if (user) return res.redirect("/signup");

  const hashedPassword = await bcrypt.hash(password, 12);
  user = new User({ username, email, password: hashedPassword, contactNumber });

  await user.save();
  req.session.person = user.username;
  res.redirect("/login");
});

app.post("/user-login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.redirect("/signup");

  const checkPassword = await bcrypt.compare(password, user.password);
  if (!checkPassword) return res.redirect("/signup");

  req.session.isAuthenticated = true;
  req.session.person = user.username;
  res.redirect("/dashboard");
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/");
  });
});

app.post("/donate", checkAuth, async (req, res) => {
  try {
    const { donor, contactInfo, location, quantity, foodDetails } = req.body;
    const newDonation = new Donation({
      donor,
      contactInfo,
      location,
      quantity,
      foodDetails,
      status: "available",
    });
    await newDonation.save();
    res.status(201).json({ message: "Donation saved successfully!" });
  } catch (error) {
    console.error("Error saving donation:", error);
    res.status(500).json({ error: "Error saving donation." });
  }
});

app.get("/donations", checkAuth, async (req, res) => {
  try {
    const donations = await Donation.find();
    res.json(donations);
  } catch (error) {
    console.error("Error fetching donations:", error);
    res.status(500).json({ error: "Error fetching donations." });
  }
});

app.get("/receive", checkAuth, async (req, res) => {
  try {
    const donations = await Donation.find({ status: "available" });
    res.render("receive", { donations });
  } catch (error) {
    console.error("Error fetching donations:", error);
    res.status(500).send("Error loading donations.");
  }
});

app.post("/donations/:id/accept", checkAuth, async (req, res) => {
  try {
    const donationId = req.params.id;
    const donation = await Donation.findById(donationId);

    if (!donation) return res.status(404).json({ error: "Donation not found." });
    if (donation.status === "accepted") return res.status(400).json({ error: "Donation already accepted." });

    donation.status = "accepted";
    await donation.save();
    res.status(200).json({ message: "Donation accepted successfully!" });
  } catch (error) {
    console.error("Error claiming donation:", error);
    res.status(500).json({ error: "Error claiming donation." });
  }
});

app.listen(PORT, () => {
  console.log(`Server started and running at http://localhost:${PORT}`);
});
