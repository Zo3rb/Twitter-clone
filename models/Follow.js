const ObjectID = require('mongodb').ObjectID;
const usersCollection = require('../db').db().collection('users');
const followsCollection = require('../db').db().collection('follows');
const User = require('./User');

let Follow = function (followedUsername, authorId) {
    this.followedUsername = followedUsername;
    this.authorId = authorId;
    this.errors = [];
};

Follow.prototype.cleanup = function () {
    if (typeof (this.followedUsername) != "string") this.followedUsername = "";
};

Follow.prototype.validate = async function (action) {
    // FollowedUsername Must Exists in Database
    let followedAccount = await usersCollection.findOne({ username: this.followedUsername });
    if (followedAccount) {
        this.followedId = followedAccount._id;
    } else {
        this.errors.push("You Can't Follow a User That Doesn't Exist");
    };

    let doesFollowAlreadyExist = await followsCollection.findOne({ followedId: this.followedId, authorId: new ObjectID(this.authorId) });
    if (action == "create") {
        if (doesFollowAlreadyExist) this.errors.push("You're Already Following This User");
    };
    if (action == "delete") {
        if (!doesFollowAlreadyExist) this.errors.push("You Can't Following Someone You don't Already Follow");
    };

    // Avoid Follow Your self
    if (this.followedId.equals(this.authorId)) this.errors.push("You Can't Follow Your Self");
};

Follow.prototype.create = function () {
    return new Promise(async (resolve, reject) => {
        this.cleanup();
        await this.validate("create");
        if (!this.errors.length) {
            await followsCollection.insertOne({ followedId: this.followedId, authorId: new ObjectID(this.authorId) });
            resolve();
        } else {
            reject(this.errors);
        };
    });
};

Follow.prototype.delete = function () {
    return new Promise(async (resolve, reject) => {
        this.cleanup();
        await this.validate("delete");
        if (!this.errors.length) {
            await followsCollection.deleteOne({ followedId: this.followedId, authorId: new ObjectID(this.authorId) });
            resolve();
        } else {
            reject(this.errors);
        };
    });
};

Follow.isVisitorFollowing = async function (followedId, visitorId) {
    let followDoc = await followsCollection.findOne({ followedId, authorId: new ObjectID(visitorId) });
    if (followDoc) {
        return true;
    } else {
        return false;
    };
};

Follow.getFollowersById = function (id) {
    return new Promise(async (resolve, reject) => {
        try {
            let followers = await followsCollection.aggregate([
                { $match: { followedId: id } },
                { $lookup: { from: "users", localField: "authorId", foreignField: "_id", as: "userDoc" } },
                {
                    $project: {
                        username: { $arrayElemAt: ["$userDoc.username", 0] },
                        email: { $arrayElemAt: ["$userDoc.email", 0] }
                    }
                }
            ]).toArray();
            followers = followers.map(follower => {
                let user = new User(follower, true);
                return { username: follower.username, avatar: user.avatar };
            });
            resolve(followers);
        } catch (error) {
            reject();
        }
    });
};

Follow.getFollowingById = function (id) {
    return new Promise(async (resolve, reject) => {
        try {
            let followers = await followsCollection.aggregate([
                { $match: { authorId: id } },
                { $lookup: { from: "users", localField: "followedId", foreignField: "_id", as: "userDoc" } },
                {
                    $project: {
                        username: { $arrayElemAt: ["$userDoc.username", 0] },
                        email: { $arrayElemAt: ["$userDoc.email", 0] }
                    }
                }
            ]).toArray();
            followers = followers.map(follower => {
                let user = new User(follower, true);
                return { username: follower.username, avatar: user.avatar };
            });
            resolve(followers);
        } catch (error) {
            reject();
        }
    });
};

Follow.countFollowersById = function (id) {
    return new Promise(async (resolve, reject) => {
        let followersCount = await followsCollection.countDocuments({ followedId: id });
        resolve(followersCount);
    });
};

Follow.countFollowingById = function (id) {
    return new Promise(async (resolve, reject) => {
        let followingCount = await followsCollection.countDocuments({ authorId: id });
        resolve(followingCount);
    });
};

module.exports = Follow;
