require("dotenv").config({ path: "./.env" });
const express = require("express");
const bodyParser = require(`body-parser`);
const cors = require("cors");
const app = express();

// Connect MongoDB
const mongoose = require("mongoose");
mongoose
  .connect(
    "mongodb+srv://staspogorskii:somepass@cluster0.tpz2rdo.mongodb.net/?retryWrites=true",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
app.use(bodyParser.urlencoded({ extended: false }));

// Get Schema prototype
const { Schema } = mongoose;

////// User documents logic
// Create User Schema
const userSchema = new Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: String },
      origDate: { type: Date },
    },
  ],
});

// Create User Model
const User = mongoose.model("User", userSchema); // "User" is a collection name

// Save User document
const createUser = async (username) => {
  return await User.create({ username: username })
    .then((res) => res.id)
    .catch((err) => console.error("Failed to connect to MongoDB:", err));
};

// Get username by ID
const getUsernameById = async (userId) => {
  const response = await User.findById(userId);
  return response.username;
};

////// Exercise documents logic
// Create Exercise Schema
const exerciseSchema = new Schema({
  description: { type: String },
  duration: { type: Number },
  date: { type: String },
  origDate: { type: Date },
  uId: { type: String },
});

// Create Exercise Model
const Exercise = mongoose.model("Exercise", exerciseSchema); // "Exercise" is a collection name

// Save Exercise document
const createExercise = async (data) => {
  return await Exercise.create({
    description: data.username,
    duration: data.duration,
    date: data.dateString,
    origDate: data.date,
    uId: data.uId,
  })
    .then((res) => res)
    .catch((err) => console.error("Failed to connect to MongoDB:", err));
};

// Get User logs
const getUserLogs = async (uId, from, to, limit) => {
  const user = await User.findById(uId)
    .then((res) => res.username)
    .catch((err) => console.error("Failed to connect to MongoDB:", err));
  const exercises = await Exercise.find({
    uId: uId,
    origDate: {
      $gte: from || new Date("1950-01-01"),
      $lte: to || new Date("2100-01-01"),
    },
  })
    .limit(limit)
    .select({
      username: 0,
      _id: 0,
      uId: 0,
      __v: 0,
    });
  return {
    username: user,
    count: exercises.length,
    _id: uId,
    log: exercises,
  };
};

app
  .route("/api/users")
  .post(async (req, res) => {
    const newUserId = await createUser(req.body.username);
    res.json({ username: req.body.username, _id: newUserId });
  })
  .get(async (req, res) => {
    const response = await User.find()
      .then((res) => res)
      .catch((err) => console.error("Failed to connect to MongoDB:", err));
    res.json(response);
  });

app.route("/api/users/:_id/exercises").post(async (req, res) => {
  const uId = req.body[":_id"];
  const dateRaw = req.body.date ? new Date(req.body.date) : new Date();
  const dateString = dateRaw.toDateString();
  const newExercise = {
    description: req.body.description,
    duration: req.body.duration,
    origDate: dateRaw,
    date: dateString,
  };

  console.log(newExercise);
  User.findByIdAndUpdate(uId, {
    $push: { log: newExercise },
    $inc: { count: 1 },
  });

  const exerciseData = {};
  exerciseData.uId = req.body[":_id"];
  exerciseData.description = req.body.description;
  exerciseData.duration = req.body.duration;
  exerciseData.username = await getUsernameById(exerciseData.uId);
  exerciseData.date = req.body.date ? new Date(req.body.date) : new Date();
  exerciseData.dateString = exerciseData.date.toDateString();

  await createExercise(exerciseData);

  res.json({
    username: exerciseData.username,
    description: exerciseData.description,
    duration: exerciseData.duration,
    date: exerciseData.dateString,
    _id: exerciseData.uId,
  });
});

app.route("/api/users/:_id/logs").get(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : undefined;
  const to = req.query.to ? new Date(req.query.to) : undefined;
  const limit = req.query.limit;
  const uId = req.params._id;
  const response = await getUserLogs(uId, from, to, limit);
  res.json(response);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
