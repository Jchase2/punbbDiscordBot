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

const createNewMusicPost = async (userName, url) => {

    const message = `Posted by ${userName}: [video][url]${url}[/url][/video]`;

    const text = 'INSERT INTO posts(poster, poster_id, poster_ip, message, hide_smilies, posted, topic_id) VALUES ($1, $2, $3, $4, $5, $6, $7)';
    const values = ['dneBot', 999999, '127.0.0.1', message, 0, Math.floor(+new Date() / 1000), 35];

    pool.query(text, values, (err, res) => {
        if (err) {
            console.log("ERR MSG: ", err.message);
        } else {
            console.log(res.rows[0])
        }
    })

}

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


client.on('messageCreate', async msg => {

    if (msg.content.startsWith('https://www.youtube.com') || msg.content.startsWith('https://youtube.com') || msg.content.startsWith('https://youtu.be')) {
        createNewMusicPost(msg.author.username, msg.content);
    }
});

client.login(process.env.CLIENT_TOKEN);