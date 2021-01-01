const postsCollection = require('../db').db().collection('posts');
const ObjectID = require('mongodb').ObjectID;
const User = require('./User');
const sanitizeHTML = require('sanitize-html');
const followsCollection = require('../db').db().collection('follows');

let Post = function (data, userId, requestedPostId) {
    this.data = data;
    this.errors = [];
    this.userId = userId;
    this.requestedPostId = requestedPostId;
};

Post.prototype.cleanup = function () {
    if (typeof (this.data.title) !== "string") this.data.title = "";
    if (typeof (this.data.body) !== "string") this.data.body = "";

    // Remove any Bogus properties
    this.data = {
        title: sanitizeHTML(this.data.title.trim(), { allowedTags: [], allowedAttributes: {} }),
        body: sanitizeHTML(this.data.body.trim(), { allowedTags: [], allowedAttributes: {} }),
        createdDate: new Date(),
        author: ObjectID(this.userId)
    };
};

Post.prototype.validate = function () {
    if (this.data.title === "") this.errors.push('You Must Provide a Title');
    if (this.data.body === "") this.errors.push('You Must Provide a Post Content');
};

Post.prototype.create = function () {
    return new Promise((resolve, reject) => {
        this.cleanup();
        this.validate();
        if (!this.errors.length) {
            // Save Post into the Database
            postsCollection.insertOne(this.data).then(info => {
                resolve(info.ops[0]._id);
            }).catch(() => {
                this.errors.push('Please Try Again Later');
                reject(this.errors);
            });
        } else {
            reject(this.errors);
        };
    });
};

Post.prototype.update = function () {
    return new Promise(async (resolve, reject) => {
        try {
            let post = await Post.findSingleById(this.requestedPostId, this.userId);
            if (post.isVisitorOwner) {
                let status = await this.actuallyUpdate();
                resolve(status);
            }
            else reject();
        } catch (error) {
            reject();
        };
    });
};

Post.prototype.actuallyUpdate = function () {
    return new Promise(async (resolve, reject) => {
        this.cleanup();
        this.validate();
        if (!this.errors.length) {
            await postsCollection.findOneAndUpdate({ _id: new ObjectID(this.requestedPostId) }, {
                $set: {
                    title: this.data.title,
                    body: this.data.body
                }
            });
            resolve("success");
        } else {
            resolve("failure");
        }
    });
};

Post.reuseablePostQuery = function (uniqueOperations, visitorId) {
    return new Promise(async (resolve, reject) => {

        let aggOperations = uniqueOperations.concat([
            { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "authorDocument" } },
            {
                $project: {
                    title: 1,
                    body: 1,
                    createdDate: 1,
                    authorId: "$author",
                    author: { $arrayElemAt: ["$authorDocument", 0] }
                }
            }
        ]);

        let posts = await postsCollection.aggregate(aggOperations).toArray();

        // Cleanup Author Property in each Post Object
        posts = posts.map(post => {
            post.isVisitorOwner = post.authorId.equals(visitorId);
            post.authorId = undefined;
            post.author = {
                username: post.author.username,
                avatar: new User(post.author, true).avatar,
            }
            return post;
        });
        resolve(posts);
    });
};

Post.findSingleById = function (id, visitorId) {
    return new Promise(async (resolve, reject) => {
        if (typeof (id) !== "string" || !ObjectID.isValid(id)) {
            reject();
            return;
        };

        let posts = await Post.reuseablePostQuery([
            { $match: { _id: new ObjectID(id) } }
        ], visitorId);

        if (posts.length) resolve(posts[0])
        else reject();
    });
};

Post.findByAuthorId = function (authorId) {
    return Post.reuseablePostQuery([
        { $match: { author: authorId } },
        { $sort: { createdDate: -1 } }
    ]);
};

Post.delete = function (postIdToDelete, currentUserId) {
    return new Promise(async (resolve, reject) => {
        try {
            let post = await Post.findSingleById(postIdToDelete, currentUserId);
            if (post.isVisitorOwner) {
                await postsCollection.deleteOne({ _id: new ObjectID(postIdToDelete) });
                resolve();
            } else {
                reject();
            };
        } catch (error) {
            reject();
        };
    });
};

Post.search = function (searchTerm) {
    return new Promise(async (resolve, reject) => {
        if (typeof (searchTerm) === "string") {
            let posts = await Post.reuseablePostQuery([
                { $match: { $text: { $search: searchTerm } } },
                { $sort: { score: { $meta: "textScore" } } }
            ]);
            resolve(posts);
        } else {
            reject();
        };
    });
};

Post.countPostsByAuthor = function (id) {
    return new Promise(async (resolve, reject) => {
        let postCount = await postsCollection.countDocuments({ author: id });
        resolve(postCount);
    });
};

Post.getFeed = async function (id) {
    // Create an Array of User Ids That Current User Follows
    let followedUsers = await followsCollection.find({ authorId: new ObjectID(id) }).toArray();
    followedUsers = followedUsers.map(followedDoc => {
        return followedDoc.followedId;
    });
    // Look for Posts Where The Author is in The Above Array of Followed User
    return Post.reuseablePostQuery([
        { $match: { author: { $in: followedUsers } } },
        { $sort: { createdDate: -1 } }
    ]);
};

module.exports = Post;
