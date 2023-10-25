// Dependencies
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Initial setup
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));
app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Configuring DB templates
// Create Schema and Model for Users
const userSchema = new Schema({
  username: { type: String, required: true },
});
const User = mongoose.model("User", userSchema);

// Create Schema and Model for Exercises
const exerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: Date,
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

// Handling routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app
  .route("/api/users")
  .get(async (req, res) => {
    const users = await User.find().select("_id username");
    if (!users) res.send("No users found.");
    res.json(users);
  })
  .post(async (req, res) => {
    const userObj = new User({
      username: req.body.username,
    });

    try {
      const user = await userObj.save();
      res.json(user);
    } catch (err) {
      console.error(err);
    }
  });

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) res.send("Could not find user with this ID.");

    const exerciseObj = new Exercise({
      user_id: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });
    const exercise = await exerciseObj.save();
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
    });
  } catch (err) {
    console.error(err);
    res.send("Could not save the exercise. Please, try again.");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(0);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const limit = +req.query.limit || 500;
  const uId = req.params._id;
  const response = await User.findById(uId);
  if (!response) res.send("Could not find user.");

  const queryResult = await Exercise.find({
    user_id: uId,
    date: {
      $gte: from,
      $lte: to,
    },
  }).limit(limit);

  const log = queryResult.map((entry) => ({
    description: entry.description,
    duration: entry.duration,
    date: entry.date.toDateString(),
  }));

  res.json({
    username: response.username,
    count: queryResult.length,
    _id: response._id,
    log,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
