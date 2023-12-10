const express = require("express");
const app = express();
const port = 3007;
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const salt = 10;
var jwt = require("jsonwebtoken");
const cors = require("cors");

const whitelist = ["http://localhost:3000"];
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
//  Enable pre-flight requests
app.options("*", cors());
const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "Content-Type",
    "Authorization"
  );
  next();
});
//connection
mongoose
  .connect("mongodb://127.0.0.1:27017/database1", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("mongodb connected"))
  .catch((err) => console.log("error in connection", err));

//schema
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    role: {
      type: String,
    },
    email: {
      type: String,
    },
    contact: {
      type: String,
    },
    permission: {
      type: String,
    },
    pKey: {
      type: String,
    },
    cpKey: {
      type: String,
    },
  },
  {
    timestamps: true, // automatically created and updated will be added
  }
);

//model
const User = mongoose.model("user", userSchema);

const attendanceSchema = new mongoose.Schema(
  {
    email: {
      type: String,
    },
    date: {
      type: String,
    },
    userId: {
      type: String,
    },
    checkedIn: {
      type: String,
    },
    checkedOut: {
      type: String,
    },
  },
  {
    timestamps: true, // automatically created and updated will be added
  }
);
const Attendance = mongoose.model("attendance", attendanceSchema);

app.get("/users", async (req, res) => {
  const allDbUsers = await User.find({});
  res.json(allDbUsers);
});

app.get("/users/:id", async (req, res) => {
  let user = {};
  try {
    user = await User.findById(req.params.id);
    user.pKey = "";
    user.cpKey = "";
  } catch (err) {
    console.log("error=>", err);
  }
  user && user !== undefined ? res.send(user) : "";
});

app.post("/users", async (req, res) => {
  let body = { ...req.body };
  console.log("body", body);
  if (!body) {
    return res
      .status(400)
      .json({ massage: "please add details in requred fields" });
  }
  await bcrypt.hash(body.pKey, salt, async (err, hash) => {
    if (err) {
      console.log("error=>", err);
    }
    body.pKey = hash;
    body.cpKey = hash;
    console.log("hashed=>", hash);
    console.log("hashed body", body);
    const result = await User.create({ ...body });
    console.log("result", result);
    return res.status(200).json({ massage: "Success" });
  });
});
app.patch("/users/:id", async (req, res) => {
  let body = { ...req.body };
  if (body.pKey != "" && body.pKey != undefined) {
    await bcrypt.hash(body.pKey, salt, async (err, hash) => {
      if (err) {
        console.log("error=>", err);
      }
      body.pKey = hash;
      body.cpKey = hash;
      await User.findByIdAndUpdate(req.params.id, body);
      return res.json({ status: "Success" });
    });
  } else {
    await User.findByIdAndUpdate(req.params.id, body);
    return res.json({ status: "Success" });
  }
});
app.delete("/users/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  return res.json({ status: "Success" });
});

app.post("/userauth", async (req, res) => {
  let body = { ...req.body };
  console.log("body", body);
  let doc;
  console.log("email", body.email);
  try {
    doc = await User.findOne({ email: body.email }).lean();
  } catch (err) {
    console.error("Error executing query:", err);
    return res.json({ error: "Email is Incorrect" });
  }
  console.log("Matching records:", doc);
  // mongoose.connection.close();
  if (doc != null) {
    try {
      const match = await bcrypt.compare(body.pKey, doc.pKey);
      // console.log("ok=>",match)
      if (match) {
        console.log("correct");
        var privateKey = "HIthere222";
        let obj = {
          _id: doc._id,
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          permission: doc.permission,
        };
        var token = jwt.sign(obj, privateKey);
        console.log("token", token);
        return res.json({ token: token });
      } else {
        return res.json({ error: "Email or Password is Incorrect" });
      }
    } catch (err) {
      console.log("fail");
      return res.json({ error: "Email or Password is Incorrect" });
    }
  } else {
    console.log("fail");
    return res.json({ error: "Email or Password is Incorrect" });
  }
});

app.post("/verifytoken", async (req, res) => {
  try {
    console.log("bodyy", req.body);
    let verfiedtoken = jwt.verify(req.body.token, "HIthere222");
    console.log("verfiedtoken=>", verfiedtoken);
    let user = {};
    try {
      user = await User.findById(verfiedtoken._id);
    } catch (err) {
      console.log("error=>", err);
    }
    return res.json({ currentUser: user });
  } catch (err) {
    console.log("err", err);
    return res.json({ error: "User verification failed" });
  }
});

app.post("/checkin", async (req, res) => {
  let body = { ...req.body };
  console.log("body", body);
  if (!body) {
    return res
      .status(400)
      .json({ massage: "please add details in requred fields" });
  }
  try {
    const result = await Attendance.create({ ...body });
    console.log("result", result);
    return res.status(200).json({ massage: "Success" });
  } catch (err) {
    console.log("err", err);
  }
});

app.patch("/checkout", async (req, res) => {
  console.log("checkoutapi")
  let body = { ...req.body };
  console.log("body", body);
  if (!body) {
    return res
      .status(400)
      .json({ massage: "please add details in requred fields" });
  }
  try {
    doc = await Attendance.findOne({
      userId: body.userId,
      date: body.date,
    }).lean();
    console.log("doc", doc);
    if (doc) {
      let abc=await Attendance.findByIdAndUpdate(doc._id, body);
      console.log("abc",abc)
      return res.json({ status: "Success" });
    } else {
      return res.json({ error: "no record found" });
    }
  } catch (err) {
    console.error("Error executing query:", err);
    return res.json({ error: "no record found" });
  }
});

app.post("/getuserattendance", async (req, res) => {
  let body = { ...req.body };
  console.log("body", body);
  let records = {};
  try {
    records = await Attendance.find({ userId: body.userId });
    console.log("records", records);
    if (records.length > 0) {
      return res.send(records);
    } else {
      return res.send({ error: "no record found" });
    }
  } catch (err) {
    console.log("error=>", err);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on the port ${port}`);
});
