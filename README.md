# Discord -> PunBB Cross Posting Bot

This is a bot that cross posts music from a discord channel to a PunBB thread.

## Setup

Just Run:

```git clone https://github.com/Jchase2/punbbDiscordBot```

Fill in the dotenv file:

```
CLIENT_TOKEN=''
CLIENT_ID=''
DB_USERNAME='postgres'
DB_PW=''
DB_HOST=''
DB_PORT='5432'
DB_NAME=''
FORUM_USER_ID=''
```

Finally, in a tmux session or similar, run:

```node index.js```

## TODO:

- Implement posting from forums to discord.
- Add an example env file.
- Improve setup instructions.
