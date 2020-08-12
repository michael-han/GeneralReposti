const Discord = require('discord.js');
const { prefix, token } = require('./config.json');

const client = new Discord.Client({ "ws": { "intents": ["GUILDS", "GUILD_MESSAGES"] } });

async function getPreviousMessage(message) {
    // message is the message that triggered our response
    // get all messages in the channel and get the last one sent before message was sent
    let target = await message.channel.messages.cache.filter(m => m.createdAt < message.createdAt).last();

    if (target === undefined) {
        // something went wrong, we need to fetch it from the API instead
        console.log("Fetching previous message from API");

        let manager = await message.channel.messages.fetch({"limit": 1, "before": message.id});
        target = manager.first();
        
        if (target === undefined) {
            // if target is *still* undefined, something is wrong. 
            throw(new Error("Message was not found even from the API"));
        }
    }
    return target;
}

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', async message => {
    console.log(message.content);

    if (message.content.startsWith(`${prefix}repost`)) {
        message.channel.send('You rang?');

        try {
            // get message sent that is in question
            let previousMessage = await getPreviousMessage(message);

            // console.log(previousMessage);
            message.channel.send(`Checking on message -> '${previousMessage.content}'`);
            
            let embed;
            if (previousMessage.embeds.length) {
                embed = previousMessage.embeds[0];
                // console.log("Message has embed");
            }
            else {
                // console.log("Message has no embed")
            }

            // find messages that have the same exact content, starting with the current channel
            // for now we will start with the last 100 messages
            let found = false;
            let channelCache = message.channel.messages.cache.filter(m => m.createdAt < message.createdAt).last(100);
            console.log("current channel cache size:", channelCache.length)
            if (channelCache.length < 100) {
                console.log("fetching more messages from API");
                channelCache = await message.channel.messages.fetch({"limit": 100, "before": previousMessage.id});
                console.log("cache size", channelCache.array().length);
                // found = channelCache.find(m => m.content === message.content);
            }
            
            found = channelCache.find(m => m.content === previousMessage.content);

            // console.log(found);
            if (found) {
                message.channel.send("Repost found!");
            }
            else {
                message.channel.send("Searching other channels.....");
            }

            // check each channel for previous messages
            message.guild.channels.cache.each(channel => {
                if (channel.type === "text" && channel !== message.channel) {
                    let found = channel.messages.cache.filter(m => m.createdAt < message.createdAt).
                        last(100).find(m => m.content === previousMessage.content);

                    if (found) {
                        message.channel.send("Repost found in a different channel...");
                    }
                }
            });
        }
        catch (error) {
            console.error(error);
            message.channel.send("Something went catastrophically wrong. Please let my owner know.");
            message.channel.send(error);
            return;
        }
        
    }
    else if (message.mentions.has(client.user)) {
        let embed = new Discord.MessageEmbed()
            .setImage("https://media.giphy.com/media/Nx0rz3jtxtEre/giphy.gif");
        message.channel.send(embed);
        // message.channel.send('You rang?');

        // get quoted text

        // pull up previous messages

        // find exact matches
    }
    else if (message.content === `${prefix}server`) {
        message.channel.send(`This server's name is: ${message.guild.name}`);
    }
});

process.on('unhandledRejection', error => console.error('Uncaught Promise Rejection', error));

client.login(token);
