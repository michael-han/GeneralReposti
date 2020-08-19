require('dotenv').config();

const Discord = require('discord.js');
const client = new Discord.Client({
    messageCacheMaxSize: -1, // infinite
    messageCacheLifetime: 48*60*60, // 48 hours
    messageSweepInterval: 30*60, // 30 minutes
    ws: { intents: Discord.Intents.NON_PRIVILEGED }
});

const fetch = require('node-fetch');
if (!globalThis.fetch) {
    globalThis.fetch = fetch;
}
const Giphy = require('@giphy/js-fetch-api');
const giphy = new Giphy.GiphyFetch(process.env.GIPHY);

const moment = require('moment');

async function fetchGifUrl(searchTerm) {
    const { data: gifs } = await giphy.search(searchTerm, {
        type: "gifs",
        sort: "relevant",
        limit: 25
    });
    return gifs[Math.floor(Math.random() * 25)].images.downsized.url;
}

async function fetchMessages(channel) {
    // expects discordjs::TextChannel
    if (channel.type !== "text") {
        throw new Error("Channel type is not text");
    }

    if (channel.messages.cache.size < 100) {
        // fetch from API to double check that there are more than 100 messages in the channel
        return await channel.messages.fetch({"limit": 100}, true);
    }
    return channel.messages.cache;
}

async function fetchPinnedMessages(channel) {
     // expects discordjs::TextChannel
     if (channel.type !== "text") {
        throw new Error("Channel type is not text");
    }

    return await channel.messages.fetchPinned(true);
}

function findMessageInChannel(message, messageManager) {
    // expects discordjs::Collection<Snowflake, Message> and string
    return messageManager.find(item => {
        if (item.content === message.content) {
            return true;
        }

        if (item.embeds.length && message.embeds.length) {
            let itemEmbed = item.embeds[0];
            let messageEmbed = message.embeds[0];
            if (itemEmbed.title === messageEmbed.title &&
                itemEmbed.description === messageEmbed.description) {
                return true;
            }
        }
        
        return false;
    });
}

async function sendRepostMessage(start, channel, originalMessage) {
    let url = await fetchGifUrl("emergency");
    let embed = new Discord.MessageEmbed()
        .setTitle(":rotating_light: REPOST DETECTED :rotating_light:")
        .setDescription(`
I found a message sent by ${originalMessage.author} ${moment(originalMessage.createdAt).fromNow()}.
Link to the *real* post is [here](${originalMessage.url}) in ${originalMessage.channel}.
        `)
        .setFooter(`This response was calculated in ${moment().diff(start)} ms.`)
        .setThumbnail(url)
        .setColor("LUMINOUS_VIVID_PINK");
    channel.send(embed);
}

async function findRepost(message) {
    // expects discordjs::Message
    let start = moment();
    // start by searching for messages in current channel
    let currentChannelCache = await fetchMessages(message.channel);
    let filteredCurrentChannelCache = currentChannelCache.filter(m => {
        // only messages before the one we are checking
        return m.createdTimestamp < message.createdTimestamp;
    });

    let originalMessage = findMessageInChannel(message, filteredCurrentChannelCache);
    if (originalMessage) {
        sendRepostMessage(start, message.channel, originalMessage);
        return;
    }

    // check every other channel for previous messages
    const allChannels = message.guild.channels.cache.array();
    for (const channel of allChannels) {
        if (channel.type === "text" && channel !== message.channel && channel.viewable) {
            let channelCache = await fetchMessages(channel);
            let filteredChannelCache = channelCache.filter(m => {
                return m.createdTimestamp < message.createdTimestamp;
            });

            originalMessage = findMessageInChannel(message, filteredChannelCache);
            if (originalMessage) {
                sendRepostMessage(start, message.channel, originalMessage);
                return;
            }
        }
    }

    // next, check pinned messages (if we don't already have them cached)
    let pinned = await fetchPinnedMessages(message.channel);
    originalMessage = findMessageInChannel(message, pinned);
    if (originalMessage) {
        sendRepostMessage(start, message.channel, originalMessage);
        return;
    }

    for (const channel of allChannels) {
        if (channel.type === "text" && channel !== message.channel && channel.viewable) {
            pinned = await fetchPinnedMessages(channel);

            originalMessage = findMessageInChannel(message, pinned);
            if (originalMessage) {
                sendRepostMessage(start, message.channel, originalMessage);
                return;
            }
        }
    }

    if (originalMessage) {
        sendRepostMessage(start, message.channel, originalMessage);
        return;
    }
}

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', async message => {
    if (!message.content) { return; }
    if (message.author === client.user) { return; }
    if (message.channel.type === "dm") { return; }

    if (message.embeds.length) {
        // if it has an embed, we need to also make sure it's a link first
        if (message.embeds[0].type !== "image" && message.embeds[0].type !== "gifv") {
            try {
                await findRepost(message);
            }
            catch (error) {
                console.error(error);
                return;
            }
        }
    }
    else if (message.mentions.has(client.user, { ignoreEveryone: true })) {
        let embed = new Discord.MessageEmbed()
            .setImage("https://media.giphy.com/media/Nx0rz3jtxtEre/giphy.gif");
        message.channel.send(embed);
    }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!newMessage.content) { return; }
    if (newMessage.author === client.user) { return; }
    if (newMessage.channel.type === "dm") { return; }

    // we are checking here since discord sometimes will cache the embed on msg send
    // but sometimes it loads it after the fact. so we only care at the point when
    // the embed exists on the message.
    if (oldMessage.embeds.length < newMessage.embeds.length) {
        // if it has an embed, we need to also make sure it's a link first
        if (newMessage.embeds[0].type !== "image" && newMessage.embeds[0].type !== "gifv") {
            try {
                await findRepost(newMessage);
            }
            catch (error) {
                console.error(error);
                return;
            }
        }
    }
});

process.on('unhandledRejection', error => console.error('Uncaught Promise Rejection', error));

client.login(process.env.DISCORD);
