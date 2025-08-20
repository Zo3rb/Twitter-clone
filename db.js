require("dotenv").config({ path: "./.env" });
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.CONNECTIONSTRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Export the client immediately so other scripts can require it synchronously.
module.exports = client;

client
  .connect()
  .then(() => {
    const app = require("./app");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log("Database and App are running"));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
