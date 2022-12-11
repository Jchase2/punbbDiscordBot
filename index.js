require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');


const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USERNAME,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PW,
    port: process.env.DB_PORT,
});

const createNewPost = async (userName, url, topicId) => {
    try {
        const message = `Posted by ${userName} in DnE Discord Music Channel: [video][url]${url}[/url][/video]`;
        const text = 'INSERT INTO posts(poster, poster_id, poster_ip, message, hide_smilies, posted, topic_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
        const values = ['dneBot', process.env.FORUM_USER_ID, '127.0.0.1', message, 0, Math.floor(+new Date() / 1000), topicId];
        let result = await pool.query(text, values);
        console.log("RESULT FROM CREATE NEW POST: ", result.rows[0])
        let topicReplies = await countTopicReplies(topicId);
        await updateTopic(topicReplies, result.rows[0]['posted'], result.rows[0]['id'], result.rows[0]['poster'], result.rows[0]['topic_id']);
        const topicData = await pool.query(`SELECT * FROM topics WHERE id = ${topicId}`)
        console.log("TOPIC DATA ID: ", topicData.rows[0]['id']);
        await syncForum(topicData.rows[0]['id']);
    } catch (err) {
        console.log("ERROR: ", err.message)
    }
}

const countTopicReplies = async (topicId) => {
    const text = `SELECT COUNT(id) FROM posts AS p WHERE p.topic_id = $1`;
    const values = [topicId]
    try {
        let res = await pool.query(text, values);
        console.log("SENDING BACK FROM COUNT TOPIC REPLIES: ", res.rows[0].count);
        return parseInt(res.rows[0].count);
    } catch (err) {
        console.log("Count Topic Replies Error: ", err.message)
    }
}

const updateTopic = async (numReplies, lastPostTime, lastPostId, lastPosterUsername, topicId) => {
    const text = `UPDATE topics SET num_replies = $1, last_post = $2, last_post_id = $3, last_poster = $4 WHERE id = $5`;
    const values = [numReplies, lastPostTime, lastPostId, lastPosterUsername, topicId];

    console.log("UPDATE TOPIC VALUES: ", values)

    try {
        let res = await pool.query(text, values);
        console.log("SENDING BACK THIS RES FROM UPDATE TOPIC: ", res)
        return res;
    } catch (err) {
        console.log("Update Topic Error: ", err.message)
    }
};

// Update posts, topics, last_post, last_post_id and last_poster for a forum
const syncForum = async (forumId) => {
    try {
        // Get the num_posts and num_topics.
        const text = `SELECT COUNT(t.id) AS num_topics, SUM(t.num_replies) AS num_posts FROM topics AS t WHERE t.forum_id = $1`
        const values = [forumId];
        let result = await pool.query(text, values);
        console.log("RESULT 1 IN SYNC: ", result);
        // Total number of posts. Opening post + replies.
        let numPosts = result.rows[0]['num_posts'] + result.rows[0]['num_topics'];
        // Get last_post, last_post_id and last_poster for the forum (if any);
        const text2 = `SELECT t.last_post, t.last_post_id, t.last_poster FROM topics AS t WHERE t.forum_id = $1 AND t.moved_to is NULL ORDER BY t.last_post DESC LIMIT 1`;
        const values2 = [forumId];
        const result2 = await pool.query(text2, values2);
        console.log("RESULT 2 IN SYNC: ", result2)
        // Run query to update the forum.
        const text3 = `UPDATE forums SET num_topics = $1, num_posts = $2, last_post = $3, last_post_id = $4, last_poster = $5 WHERE id = $6`;
        const values3 = [result.rows[0]['num_topics'], numPosts, result2.rows[0]['last_post'], result2.rows[0]['last_post_id'], result2.rows[0]['last_poster'], forumId];
        pool.query(text3, values3);
    } catch (err) {
        console.log("Sync Forum Error: ", err.message)
    }
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
    console.log(`Logged in as ${client.user.tag}!"`);
});


// We're only interested in posting from the music disc channel to the music thread on the forums for now.
client.on('messageCreate', async msg => {
    if (msg.content.startsWith('https://www.youtube.com') || msg.content.startsWith('https://youtube.com') || msg.content.startsWith('https://youtu.be')) {
        createNewPost(msg.author.username, msg.content, 35);
    }
});

client.login(process.env.CLIENT_TOKEN);