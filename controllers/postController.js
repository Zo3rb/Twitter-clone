const Post = require('../models/Post');

exports.viewCreateScreen = (req, res) => {
    res.render('create-post');
};

exports.create = (req, res) => {
    let post = new Post(req.body, req.session.user._id);
    post.create().then(function (newId) {
        req.flash("success", "New Post Successfully Created");
        req.session.save(() => res.redirect(`/post/${newId}`));
    }).catch(function (errors) {
        errors.forEach(error => req.flash("errors", error));
        req.session.save(() => res.redirect("/create-post"));
    });
};

exports.viewSingle = async (req, res) => {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId);
        res.render('single-post-screen', { post });
    } catch (error) {
        res.render('404');
    };
};

exports.viewEditScreen = async (req, res) => {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId);
        if (post.isVisitorOwner) {
            res.render('edit-post', { post });
        } else {
            req.flash("errors", "You don't Have a permission to Perform That Action");
            res.session.save(() => res.redirect("/"));
        };
    } catch (error) {
        res.render("404");
    };
};

exports.edit = (req, res) => {
    let post = new Post(req.body, req.visitorId, req.params.id);
    post.update().then(status => {
        // The Post Was Successfully Updated in The Database
        // or User Did Have Permission But There Were Validation Errors
        if (status === "success") {
            req.flash("success", "Post Successfully Updated");
            req.session.save(function () {
                res.redirect(`/post/${req.params.id}/edit`);
            });
        }
        else {
            post.errors.forEach(function (error) {
                req.flash("errors", error);
                req.session.save(function () {
                    res.redirect(`/post/${req.params.id}/edit`);
                });
            })
        };
    }).catch(() => {
        // Post With The requested ID doesn't Exists
        // or The Current Visitor is not The Owner of The Post
        req.flash("errors", "You Don't Have a Permission to Perform That Action");
        req.session.save(function () {
            res.redirect('/');
        });
    });
};

exports.delete = (req, res) => {
    Post.delete(req.params.id, req.visitorId).then(() => {
        req.flash("success", "Post Successfully Deleted");
        req.session.save(() => {
            res.redirect(`/profile/${req.session.user.username}`);
        });
    }).catch(() => {
        req.flash("errors", "You don't Have a Permission to Perform That action");
        req.session.save(() => {
            res.redirect("/");
        });
    });
};

exports.search = (req, res) => {
    Post.search(req.body.searchTerm).then(posts => {
        res.json(posts);
    }).catch(() => {
        res.json([]);
    });
};
