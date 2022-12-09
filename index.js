require('dotenv').config();

const { REST, Routes, Client, GatewayIntentBits, Intents } = require('discord.js');


const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USERNAME,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PW,
    port: process.env.DB_PORT,
});

const createNewPost = async (userName, url, topicId) => {
    const message = `Posted by ${userName}: [video][url]${url}[/url][/video]`;
    const text = 'INSERT INTO posts(poster, poster_id, poster_ip, message, hide_smilies, posted, topic_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
    const values = ['dneBot', 999999, '127.0.0.1', message, 0, Math.floor(+new Date() / 1000), topicId];

    // Result should include:
    /// id: int
    // poster: string
    // poster_id: int
    // poster_ip: string
    // message: string
    // hide_smilies: int
    // posted: int
    // topic_id: int
    let result = await pool.query(text, values, (err, res) => {
        if (err) {
            console.log("ERR MSG: ", err.message);
        } else {
            return res;
        }
    })

    let topicReplies = await countTopicReplies(topicId);

    await updateTopic(topicReplies, result['posted'], result['id'], result['poster'], result['topic_id']);
    const topicData = await pool.query(`SELECT * FROM topics WHERE id = ${topicId}`)
    await syncForum(topicData['id']);

}

const countTopicReplies = async (topicId) => {

    const text = `SELECT COUNT(id) FROM posts AS p WHERE p.topic_id = $1`;
    const values = [topicId]

    pool.query(text, values, (err, res) => {
        if (err) {
            console.log("ERR MSG: ", err.message);
        } else {
            console.log(res.rows[0]);
            return res.rows[0];
        }
    })
}

const updateTopic = async (numReplies, lastPostTime, lastPostId, lastPosterUsername, topicId) => {
    const text = `UPDATE topics SET num_replies = $1, last_post = $2, last_post_id = $3, last_poster = $4 WHERE id = $5`;
    const values = [numReplies, lastPostTime, lastPostId, lastPosterUsername, topicId];

    pool.query(text, values, (err, res) => {
        if (err) {
            console.log("ERR MSG: ", err.message);
        } else {
            console.log(res.rows[0]);
            return res.rows[0];
        }
    });
};

// Update posts, topics, last_post, last_post_id and last_poster for a forum
const syncForum = async (forumId) => {

    // Get the num_posts and num_topics.
    const text = `SELECT COUNT(t.id) AS num_topics, SUM(t.num_replies) AS num_posts FROM topics AS t WHERE t.forum_id = $1`
    const values = [forumId];

    // Result should be, for example:
    // num_topics: int
    // num_posts: int
    const result = await pool.query(text, values, (err, res) => {
        if (err) {
            console.log("ERR MSG: ", err.message);
        } else {
            return res;
        }
    });

    // Total number of posts. Opening post + replies.
    let numPosts = result['num_posts'] + result['num_topics'];


    // Get last_post, last_post_id and last_poster for the forum (if any);
    const text2 = `SELECT t.last_post, t.last_post_id, t.last_poster FROM topics AS t WHERE t.forum_id = $1 AND t.moved_to is NULL ORDER BY t.last_post DESC LIMIT 1`;
    const values2 = [forumId];

    // Result 2 should be:
    // last_post: int
    // last_post_id: int
    // last_poster: string
    const result2 = await pool.query(text2, values2, (err, res) => {
        if (err) {
            console.log("ERR MSG: ", err.message);
        } else {
            return res;
        }
    });

    // Run query to update the forum.
    const text3 = `UPDATE forums SET num_topics = $1, num_posts = $2, last_post = $3, last_post_id = $4, last_poster = $5 WHERE id = $6`;
    const values3 = [result['num_topics'], numPosts, result2['last_post'], result2['last_post_id'], result2['last_poster'], forumId];

    pool.query(text3, values3, (err, res) => {
        if (err) {
            console.log("ERR MSG: ", err.message);
        } else {
           console.log("response: ", res)
        }
    });
};

// Updates search index with contents of post_id and subject.
// const updateSearchIndex = async (post_id, message) => {

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}! Serving in " + ${client.channels}`);
});


// We're only interested in posting from the music disc channel to the music thread on the forums for now.
client.on('messageCreate', async msg => {
    if (msg.content.startsWith('https://www.youtube.com') || msg.content.startsWith('https://youtube.com') || msg.content.startsWith('https://youtu.be')) {
        createNewPost(msg.author.username, msg.content, 35);
    }
});

client.login(process.env.CLIENT_TOKEN);