const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const markdown = require("marked");
const sanitizeHTML = require("sanitize-html");

// Creating Express Instance
const app = express();

// Configuring Session
const sessionOptions = session({
  secret: "JavaScript is Soo Cool",
  store: new MongoStore({
    client: require("./db"),
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
  },
});

// Register Session
app.use(sessionOptions);

// Register Flash Messages
app.use(flash());

// Middleware to pass Session Infos
app.use(function (req, res, next) {
  // Make Our Markdown Function Available to Our EJS
  res.locals.filterUserHTML = function (content) {
    return sanitizeHTML(markdown(content), {
      // Preventing Users to Markdown Links in Post's Content
      allowedTags: [
        "p",
        "br",
        "ul",
        "ol",
        "li",
        "bold",
        "i",
        "em",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
      ],
      allowedAttributes: {},
    });
  };

  // Make All Errors and Flash Messages Available from Templates
  res.locals.errors = req.flash("errors");
  res.locals.success = req.flash("success");

  // Make Current User Id Available on The Req Object
  if (req.session.user) req.visitorId = req.session.user._id;
  else req.visitorId = 0;

  // Make User Session Data Available from within View Templates
  res.locals.user = req.session.user;
  next();
});

// configuring The App
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static("public"));
app.set("views", "views");
app.set("view engine", "ejs");

// Registering the App Router
app.use("/", require("./router"));

module.exports = app;
