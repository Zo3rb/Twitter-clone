const client = require("../db");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  try {
    const db = client.db();
    const users = db.collection("users");
    const posts = db.collection("posts");
    const follows = db.collection("follows");
    const comments = db.collection("comments");

    // Clean existing data (development only)
    await users.deleteMany({});
    await posts.deleteMany({});
    await follows.deleteMany({});
    await comments.deleteMany({});

    // Create 15 users
    const N_USERS = 15;
    const plainPassword = "password";
    const salt = bcrypt.genSaltSync(10);
    const hashed = bcrypt.hashSync(plainPassword, salt);

    const userDocs = [];
    for (let i = 1; i <= N_USERS; i++) {
      userDocs.push({
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: hashed,
        createdDate: new Date(Date.now() - i * 1000 * 60 * 60 * 24),
      });
    }
    const userInsert = await users.insertMany(userDocs);
    const userIds = Object.values(userInsert.insertedIds);

    // Create follows: each user follows between 3 and 7 other users (no self-follow)
    const followDocs = [];
    for (let i = 0; i < userIds.length; i++) {
      const authorId = userIds[i];
      const nFollows = 3 + Math.floor(Math.random() * 5); // 3..7
      const chosen = new Set();
      while (chosen.size < nFollows) {
        const target = sample(userIds);
        if (!target.equals(authorId)) chosen.add(target.toString());
      }
      for (const fid of chosen) {
        followDocs.push({ followedId: new ObjectId(fid), authorId: authorId });
      }
    }
    // Deduplicate
    const uniqueFollows = [];
    const seen = new Set();
    for (const f of followDocs) {
      const key = f.authorId.toString() + "->" + f.followedId.toString();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueFollows.push(f);
      }
    }
    if (uniqueFollows.length) await follows.insertMany(uniqueFollows);

    // Create 30 posts distributed across users
    const N_POSTS = 30;
    const postDocs = [];
    const sampleBodies = [
      "Thoughts on today",
      "Short update from me",
      "Sharing a link to something cool",
      "Random thoughts",
      "Throwback to a few months ago",
      "A quick tip for productivity",
      "Weekend plans",
      "Photo from my trip",
      "Question for the community",
      "What are you reading?",
    ];
    for (let i = 0; i < N_POSTS; i++) {
      const author = sample(userIds);
      postDocs.push({
        title: `Post ${i + 1}`,
        body: sample(sampleBodies) + ` (post ${i + 1})`,
        createdDate: new Date(Date.now() - i * 1000 * 60 * 60),
        author: author,
      });
    }
    const postInsert = await posts.insertMany(postDocs);
    const postIds = Object.values(postInsert.insertedIds);

    // Create 100 comments distributed across posts/users
    const N_COMMENTS = 100;
    const commentDocs = [];
    const sampleComments = [
      "Nice post!",
      "Thanks for sharing",
      "I totally agree",
      "Interesting perspective",
      "Could you expand on this?",
      "Love this",
      "Great tip",
      "Haha that's funny",
      "Well said",
      "Bookmarking this",
    ];
    for (let i = 0; i < N_COMMENTS; i++) {
      const author = sample(userIds);
      const postId = sample(postIds);
      commentDocs.push({
        postId: postId,
        author: author,
        body: sample(sampleComments) + ` (c${i + 1})`,
        createdDate: new Date(Date.now() - i * 1000 * 60),
      });
    }
    if (commentDocs.length) await comments.insertMany(commentDocs);

    console.log("Seed completed:");
    console.log(`  users: ${userIds.length}`);
    console.log(`  follows: ${uniqueFollows.length}`);
    console.log(`  posts: ${postIds.length}`);
    console.log(`  comments: ${commentDocs.length}`);
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed", err);
    process.exit(1);
  }
}

// Run seed
seed();
