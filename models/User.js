const validator = require('validator');
const usersCollection = require('../db').db().collection('users');
const bcrypt = require('bcryptjs');
const md5 = require('md5');

// New Constructor Function Could be Replaced with Class
let User = function (data, getAvatar) {
    this.data = data;
    this.errors = [];
    if (getAvatar === undefined) getAvatar = false;
    if (getAvatar) this.getAvatar();
};

// Getting User Avatar using Gravatar Service
User.prototype.getAvatar = function () {
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`;
};

// Cleaning up Function
User.prototype.cleanUp = function () {
    if (typeof (this.data.username) !== "string") this.data.username = "";
    if (typeof (this.data.email) !== "string") this.data.email = "";
    if (typeof (this.data.password) !== "string") this.data.password = "";
    // Get rid of any bogus properties
    this.data = {
        username: this.data.username.trim().toLowerCase(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password
    };
};

// Validation Function
User.prototype.validate = function () {
    return new Promise(async (resolve, reject) => {
        if (this.data.username === "") this.errors.push("You Must Provide a Username");
        if (this.data.username !== "" && !validator.isAlphanumeric(this.data.username)) this.errors.push("Username can only contains Letters and Number");
        if (!validator.isEmail(this.data.email)) this.errors.push("You Must Provide a Valid Email Address");
        if (this.data.password === "") this.errors.push("You Must Provide a Password");
        if (this.data.password.length > 0 && this.data.password.length < 6) this.errors.push("Password Must be at least 6 characters");
        if (this.data.password.length > 50) this.errors.push("Password can't Exceed 50 Characters");
        if (this.data.username.length > 0 && this.data.username.length < 4) this.errors.push("Username Must be at least 4 characters");
        if (this.data.username > 30) this.errors.push("Username can't Exceed 30 Characters");

        // Only if The Username is valid then Check to See if it's already taken
        if (this.data.username.length > 3 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
            let usernameExists = await usersCollection.findOne({ username: this.data.username });
            if (usernameExists) { this.errors.push("That Username is Already Taken") }
        };

        // Only if The email is valid then Check to See if it's already taken
        if (validator.isEmail(this.data.email)) {
            let emailExists = await usersCollection.findOne({ email: this.data.email });
            if (emailExists) { this.errors.push("That Email is Already Taken") }
        };
        resolve();
    });
}

User.prototype.register = function () {
    return new Promise(async (resolve, reject) => {
        // Step Number One --> Validate User Data
        this.cleanUp();
        await this.validate();
        // Step Number Two --> only if no validation errors => then save the data in our database
        if (!this.errors.length) {
            // Hashing The User Password
            let salt = bcrypt.genSaltSync(10);
            this.data.password = bcrypt.hashSync(this.data.password, salt);
            usersCollection.insertOne(this.data);
            this.getAvatar();
            resolve();
        } else {
            reject(this.errors);
        }
    });
}

User.prototype.login = function () {
    return new Promise((resolve, reject) => {
        this.cleanUp();
        usersCollection.findOne({ username: this.data.username }).then(attemptedUser => {
            if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
                this.data = attemptedUser;
                this.getAvatar();
                resolve("Gz");
            } else {
                reject("Invalid Credentials");
            };
        }).catch(function () {
            reject("Please Try Again Later");
        });
    });
};

User.findByUsername = function (username) {
    return new Promise(function (resolve, reject) {
        if (typeof (username) !== "string") {
            reject();
            return;
        }
        usersCollection.findOne({ username }).then(userDoc => {
            if (userDoc) {
                userDoc = new User(userDoc, true);
                userDoc = {
                    _id: userDoc.data._id,
                    username: userDoc.data.username,
                    avatar: userDoc.avatar
                }
                resolve(userDoc);
            }
            else {
                reject();
            }
        }).catch(() => {
            reject();
        });
    });
};

module.exports = User;
