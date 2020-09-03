require('dotenv').config();
const gif = require('./gif');

const Discord = require('discord.js');
const client = new Discord.Client({
    messageCacheMaxSize: -1, // infinite
    messageCacheLifetime: 48*60*60, // 48 hours
    messageSweepInterval: 30*60, // 30 minutes
    ws: { intents: Discord.Intents.NON_PRIVILEGED }
});

const moment = require('moment');
const logger = require('pino')();

async function fetchMessages(channel) {
    // expects discordjs::TextChannel
    if (channel.type !== "text") {
        throw new Error("Channel type is not text");
    }

    if (channel.messages.cache.size < 100) {
        logger.info(`${channel.guild.name}:${channel.name} is not fully cached (${channel.messages.cache.size}), grabbing from API`);
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
    // probably a temporary log line here
    logger.info(`findMessageInChannel => cache size: ${messageManager.size}`);
    // expects discordjs::Collection<Snowflake, Message> and string
    return messageManager.find(item => {
        if (item.content === message.content) {
            return true;
        }

        if (item.embeds.length && message.embeds.length) {
            let messageEmbed = message.embeds[0];
            let itemEmbed = item.embeds[0];
            if (messageEmbed.title === itemEmbed.title) {
                if (messageEmbed.description) {
                    return messageEmbed.description === itemEmbed.description;
                }
                return messageEmbed.url === itemEmbed.url;
            }
        }
        
        return false;
    });
}

async function sendRepostMessage(start, channel, originalMessage) {
    const url = await gif.fetchUrl("emergency");
    const embed = new Discord.MessageEmbed()
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
    const start = moment();
    logger.info(message);
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
	logger.info('Ready!');
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
                logger.error(error);
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
                logger.error(error);
                return;
            }
        }
    }
});

process.on('unhandledRejection', error => logger.error('Uncaught Promise Rejection', error));

client.login(process.env.DISCORD);
