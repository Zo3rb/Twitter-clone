require('dotenv').config({ path: "./.env" });
const mongodb = require('mongodb');

mongodb.connect(process.env.CONNECTIONSTRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, function (err, client) {
    module.exports = client
    const app = require('./app');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log('Database and App are running'));
});
