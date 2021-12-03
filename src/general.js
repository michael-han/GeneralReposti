/**
 * Helper functions to search through discord channels and find repeats
 */

const Discord = require('discord.js');
const logger = require('pino')();

const GENERAL_ERRORS = {
    GeneralChannelTypeError: "GeneralChannelTypeError"
};

class GeneralChannelTypeError extends Error {
    constructor(message) {
        super(message);
        this.name = GENERAL_ERRORS.GeneralChannelTypeError
    }
};

async function fetchMessages(channel) {
    const loggerInfo = {
        channel: `${channel.guild.name}:${channel.name}`,
        function: "General.fetchMessages"
    };

    // expects discordjs::TextChannel
    if (channel.type !== "GUILD_TEXT") {
        throw new GeneralChannelTypeError("Channel type is not text");
    }

    if (channel.messages.cache.size < 100) {
        logger.info(loggerInfo, `channel might not be fully cached (${channel.messages.cache.size}), grabbing from API`);
        // fetch from API to double check that there are more than 100 messages in the channel
        return await channel.messages.fetch({"limit": 100});
    }
    return channel.messages.cache;
}

async function fetchPinnedMessages(channel) {
    // expects discordjs::TextChannel
    if (channel.type !== "GUILD_TEXT") {
        throw new GeneralChannelTypeError("Channel type is not text");
    }

    return await channel.messages.fetchPinned(true);
}

function findMatchInCache(message, messageManager) {
    // expects Message and Collection<Snowflake, Message>
    return messageManager.find(orig => {
        if (orig.content === message.content) {
            return true;
        }

        if (orig.embeds.length && message.embeds.length) {
            let messageEmbed = message.embeds[0];
            let origEmbed = orig.embeds[0];
            if (messageEmbed.title === origEmbed.title) {
                if (messageEmbed.description) {
                    return messageEmbed.description === origEmbed.description;
                }
                return messageEmbed.url === origEmbed.url;
            }
        }
        
        return false;
    });
}

async function findRepost(message) {
    // expects discordjs::Message
    // returns original Message if there is a repost, else null
    const loggerInfo = {
        function: "General.findRepost",
        message: message.id,
        guild: message.channel.guild.name
    };

    logger.info(loggerInfo, "Starting findRepost");
    
    // start by searching for messages in current channel
    let cache = await fetchMessages(message.channel);
    let filteredCache = cache.filter(m => {
        // only messages before the one we are checking
        return m.createdTimestamp < message.createdTimestamp;
    });

    logger.info(loggerInfo, `[${message.channel.name}] filtered to [${filteredCache.size}] messages`);
    
    let originalMessage = findMatchInCache(message, filteredCache);
    if (originalMessage) {
        return originalMessage;
    }

    logger.info(loggerInfo, "Not found in original channel, searching others now");

    // check every other channel for previous messages
    const allChannels = message.guild.channels.cache.array();
    for (const channel of allChannels) {
        if (channel.type === "GUILD_TEXT" && channel !== message.channel && channel.viewable) {
            let cache = await fetchMessages(channel);
            let filteredCache = cache.filter(m => {
                return m.createdTimestamp < message.createdTimestamp;
            });

            logger.info(loggerInfo, `[${channel.name}] filtered to [${filteredCache.size}] messages`);

            originalMessage = findMatchInCache(message, filteredCache);
            if (originalMessage) {
                return originalMessage;
            }
        }
    }

    logger.info(loggerInfo, "Checking pins");
    // next, check pinned messages (if we don't already have them cached)
    let pinned = await fetchPinnedMessages(message.channel);
    originalMessage = findMatchInCache(message, pinned);
    if (originalMessage) {
        return originalMessage;
    }

    for (const channel of allChannels) {
        if (channel.type === "GUILD_TEXT" && channel !== message.channel && channel.viewable) {
            pinned = await fetchPinnedMessages(channel);
            originalMessage = findMatchInCache(message, pinned);
            if (originalMessage) {
                return originalMessage;
            }
        }
    }

    if (originalMessage) {
        return originalMessage;
    }

    return null;
}

module.exports = {
    findRepost
};
