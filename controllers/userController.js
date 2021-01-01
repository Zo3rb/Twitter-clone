const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follow');

exports.login = (req, res) => {
    let user = new User(req.body);
    // on Providing Correct Credentials
    user.login().then(function () {
        req.session.user = { username: user.data.username, avatar: user.avatar, _id: user.data._id }
        req.session.save(function () {
            res.redirect('/');
        });
        // on Providing False Credentials
    }).catch(function (err) {
        req.flash('errors', err);
        req.session.save(function () {
            res.redirect('/');
        });
    });
};

exports.logout = (req, res) => {
    // Killing The Session to Logout
    req.session.destroy(function () {
        res.redirect('/');
    });
};

exports.register = (req, res) => {
    let user = new User(req.body);
    user.register().then(() => {
        req.session.user = { username: user.data.username, avatar: user.avatar, _id: user.data._id }
        req.session.save(function () {
            res.redirect('/');
        });
    }).catch(regErrors => {
        regErrors.forEach(error => {
            req.flash('regErrors', error);
        });
        req.session.save(function () {
            res.redirect('/');
        });
    });
};

exports.home = async (req, res) => {
    // If Logged User Will Show Home-Dashboard / Else Will Show Home-Guest
    if (req.session.user) {
        // Fetch Feed of Posts for Current User
        let posts = await Post.getFeed(req.session.user._id);
        res.render("home-dashboard", { posts });
    } else {
        res.render('home-guest', { regErrors: req.flash('regErrors') });
    };
};

exports.mustBeLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        req.flash("errors", "You Must be Logged In to Perform That Action");
        req.session.save(function () {
            res.redirect('/');
        });
    }
};

exports.ifUserExists = (req, res, next) => {
    User.findByUsername(req.params.username).then(function (userDocument) {
        req.profileUser = userDocument;
        next();
    }).catch(function (err) {
        console.log(err);
        res.render("404");
    });
};

exports.sharedProfileData = async (req, res, next) => {
    let isVisitorsProfile = false;
    let isFollowing = false;
    if (req.session.user) {
        isVisitorsProfile = req.profileUser._id.equals(req.session.user._id)
        isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId);
    };
    req.isVisitorsProfile = isVisitorsProfile;
    req.isFollowing = isFollowing;
    // Get Post's Followers/Following Counts
    let postCountPromise = Post.countPostsByAuthor(req.profileUser._id);
    let followerCountPromise = Follow.countFollowersById(req.profileUser._id);
    let FollowingCountPromise = Follow.countFollowingById(req.profileUser._id);
    let [postCount, followersCount, FollowingCount] = await Promise.all([postCountPromise, followerCountPromise, FollowingCountPromise]);
    req.postCount = postCount;
    req.followersCount = followersCount;
    req.FollowingCount = FollowingCount;
    next();
};

exports.profilePostsScreen = (req, res) => {
    // Ask our Post Model for Posts By a Certain Author id
    Post.findByAuthorId(req.profileUser._id).then(function (posts) {
        res.render('profile', {
            posts,
            currentPage: "posts",
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: { postCount: req.postCount, followersCount: req.followersCount, followingCount: req.FollowingCount }
        });
    }).catch(function () {
        res.render("404");
    });
};

exports.profileFollowersScreen = async (req, res) => {
    try {
        let followers = await Follow.getFollowersById(req.profileUser._id);
        res.render('profile-followers', {
            followers,
            currentPage: "followers",
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: { postCount: req.postCount, followersCount: req.followersCount, followingCount: req.FollowingCount }
        });
    } catch (error) {
        res.render("404");
    };
};

exports.profileFollowingScreen = async (req, res) => {
    try {
        let following = await Follow.getFollowingById(req.profileUser._id);
        res.render('profile-following', {
            following,
            currentPage: "following",
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: { postCount: req.postCount, followersCount: req.followersCount, followingCount: req.FollowingCount }
        });
    } catch (error) {
        res.render("404");
    };
};
