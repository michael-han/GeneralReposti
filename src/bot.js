require('dotenv').config("../.env");

const { COMMANDS, COMMAND_NAMES } = require('./commands');
const { getGiphyUrl } = require('./gif');

const General = require('./general');
const Spice = require('./spice');
const { HOT_IMAGES, NICE_IMAGES } = require('./pasta.js');

const Discord = require('discord.js');
const client = new Discord.Client({
    messageCacheMaxSize: Infinity,  // infinite
    messageCacheLifetime: 24*60*60, // 24 hours
    messageSweepInterval: 10*60,    // 10 minutes
    intents: Discord.Intents.NON_PRIVILEGED
});

const moment = require('moment');
const logger = require('pino')();

const ROTATING_EMOTE = "848382888096825355";
const REPOSTI_EMOTE = "856036233426763777";

async function handleRepost(message, orig, start) {
    const loggerInfo = {
        function: "handleRepost",
        message: message.id,
        guild: message.channel.guild.name
    };
    
    logger.info(loggerInfo, "Repost found");

    const senderId = message.author.id;
    const guildId = message.guild.id;
    const spiceLevel = await Spice.getTolerance(senderId, guildId);

    switch (spiceLevel) {
        case 0: {
            // mild
            await message.react(ROTATING_EMOTE);
            message.react(REPOSTI_EMOTE);
            break;
        }
        case 1: {
            // medium
            await message.react(ROTATING_EMOTE);
            message.react(REPOSTI_EMOTE);
            sendMediumResponse(message, orig, start);
            break;
        }
        case 2: {
            // hot
            await message.react(ROTATING_EMOTE);
            message.react(REPOSTI_EMOTE);
            sendHotResponse(message, orig, start);
        }
    }
}

async function sendMediumResponse(message, orig, start) {
    const url = await getGiphyUrl("emergency");
    const rotatingLight = client.emojis.cache.get(ROTATING_EMOTE);
    const description = `
I found a similar message sent by ${orig.author} ${moment(orig.createdAt).fromNow()}.
You can find the original [here](${orig.url}) in ${orig.channel} to catch up on the discussion.
    `;

    const embed = new Discord.MessageEmbed()
        .setTitle(`${rotatingLight}  REPOST DETECTED  ${rotatingLight}`)
        .setDescription(description)
        .setFooter(`This response was calculated in ${moment().diff(start)} ms.`)
        .setThumbnail(url)
        .setColor("LUMINOUS_VIVID_PINK");
    message.reply({ embed: embed });
}

async function sendHotResponse(message, orig, start) {
    const rotatingLight = client.emojis.cache.get(ROTATING_EMOTE);
    const index = Math.floor(Math.random() * HOT_IMAGES.length);
    const embed = new Discord.MessageEmbed()
        .setTitle(`${rotatingLight}  REPOST DETECTED  ${rotatingLight}`)
        .setFooter(`This response was calculated in ${moment().diff(start)} ms.`)
        .setColor("LUMINOUS_VIVID_PINK")
        .setImage(HOT_IMAGES[index]);

    message.reply(embed);    
}

async function handleNice(message, which) {
    const loggerInfo = {
        function: "handleNice",
        message: message.id,
        guild: message.channel.guild.name,
        which: which
    };
    
    logger.info(loggerInfo, "Nice found");

    message.react(REPOSTI_EMOTE);

    const senderId = message.author.id;
    const guildId = message.guild.id;
    const spiceLevel = await Spice.getTolerance(senderId, guildId);

    if (spiceLevel === Spice.MAX_SPICE_TOLERANCE) {
        sendNiceResponse(message, which);
    }
}

async function sendNiceResponse(message, which) {
    const reposti = client.emojis.cache.get(REPOSTI_EMOTE);
    const embed = new Discord.MessageEmbed()
        .setTitle(`${reposti} NICE ${reposti}`)
        .setColor("LUMINOUS_VIVID_PINK")
        .setImage(NICE_IMAGES[which]);
    
    message.reply(embed);
}

async function handleSpiceCommand(interaction) {
    const loggerInfo = {
        function: "handleSpiceCommand"
    };

    let subCommand = interaction.options[0];
    if (subCommand.name === COMMAND_NAMES.spiceGet) {
        try {
            let spiceLevel = await Spice.getTolerance(interaction.user.id, interaction.guildID);
            interaction.reply(`Your spice level is currently **${Spice.SPICE_LEVELS[spiceLevel]}**`);
        }
        catch (err) {
            logger.info(loggerInfo, err);
            interaction.reply("Something went wrong. Ask my boss what's going on.");
        }
    }
    else if (subCommand.name === COMMAND_NAMES.spiceSet) {
        let spiceSetSubCommand = subCommand.options[0];
        switch (spiceSetSubCommand.value) {
            case (COMMAND_NAMES.moreTolerance): {
                try {
                    let spiceLevel = await Spice.moreSpice(interaction.user.id, interaction.guildID);
                    interaction.reply(`Your spice level is now at **${Spice.SPICE_LEVELS[spiceLevel]}**`);
                }
                catch (err) {
                    if (err.name === Spice.SPICE_ERRORS.SpiceRangeError) {
                        logger.error(loggerInfo, err);
                        interaction.reply("You're already at the max spice level.");
                    }
                    else {
                        logger.error(loggerInfo, err);
                        interaction.reply("Something went wrong. Ask my boss what's going on.");
                    }
                }
                break;
            }

            case (COMMAND_NAMES.lessTolerance): {
                try {
                    let spiceLevel = await Spice.lessSpice(interaction.user.id, interaction.guildID);
                    interaction.reply(`Your spice level is now at **${Spice.SPICE_LEVELS[spiceLevel]}**`);
                }
                catch (err) {
                    if (err.name === Spice.SPICE_ERRORS.SpiceRangeError) {
                        logger.error(loggerInfo, err);
                        interaction.reply("You're already at the min spice level.");
                    }
                    else {
                        logger.error(loggerInfo, err);
                        interaction.reply("Something went wrong. Ask my boss what's going on.");
                    }
                }
                break;
            }

            case (COMMAND_NAMES.maxTolerance): {
                try {
                    let spiceLevel = await Spice.maxSpice(interaction.user.id, interaction.guildID);
                    interaction.reply(`Your spice level is now at **${Spice.SPICE_LEVELS[spiceLevel]}**`);
                }
                catch (err) {
                    if (err.name === Spice.SPICE_ERRORS.SpiceError) {
                        logger.error(loggerInfo, err);
                        interaction.reply("You're already at the max spice level.");
                    }
                    else {
                        logger.error(loggerInfo, err);
                        interaction.reply("Something went wrong. Ask my boss what's going on.");
                    }
                }
                break;
            }

            case (COMMAND_NAMES.noTolerance): {
                try {
                    let spiceLevel = await Spice.noSpice(interaction.user.id, interaction.guildID);
                    interaction.reply(`Your spice level is now at **${Spice.SPICE_LEVELS[spiceLevel]}**`);
                }
                catch (err) {
                    if (err.name === Spice.SPICE_ERRORS.SpiceError) {
                        logger.error(loggerInfo, err);
                        interaction.reply("You're already at the min spice level.");
                    }
                    else {
                        logger.error(loggerInfo, err);
                        interaction.reply("Something went wrong. Ask my boss what's going on.");
                    }
                }
                break;
            }

            default: {
                // should never reach here
                logger.error(loggerInfo, "Somehow made it to default case");
                interaction.reply("Something went wrong. Ask my boss what's going on.");
            }
        }
    }
}

client.once('ready', async () => {
    await Spice.setup();
	logger.info('Ready!');
});

client.on('message', async message => {
    if (!message.content) { return; }
    if (message.author === client.user) { return; }
    if (message.channel.type === "dm") { return; }

    if (!client.application.owner) { await client.application.fetch(); }

    const loggerInfo = {
        function: "client.on(message)",
        message: message.id,
        guild: message.channel.guild.name
    };

    if (message.embeds.length) {
        // if it has an embed, we need to also make sure it's a link first
        if (message.embeds[0].type !== "image" && message.embeds[0].type !== "gifv") {
            try {
                const start = moment();
                const orig = await General.findRepost(message);
                if (orig) {
                    handleRepost(message, orig, start);
                }
            }
            catch (err) {
                logger.error(loggerInfo, err);
                return;
            }
        }
    }
    else if (message.mentions.has(client.user, { ignoreEveryone: true })) {
        const url = await getGiphyUrl("obi wan");
        const embed = new Discord.MessageEmbed().setImage(url);
        message.reply({embed: embed});
    }
    else if (message.content.match(/(\D|\s|^)69(\D|\s|$)/)) {
        handleNice(message, "69");
    }
    else if (message.author.id === client.application.owner.id) {
        if (message.content === "!reposti") {
            logger.info(loggerInfo, "Resetting commands");
            client.application.commands.set(COMMANDS);
        }
    }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!newMessage.content) { return; }
    if (newMessage.author === client.user) { return; }
    if (newMessage.channel.type === "dm") { return; }

    const loggerInfo = {
        function: "client.on(messageUpdate)",
        message: newMessage.id,
        guild: newMessage.channel.guild.name
    };

    // we are checking here since discord sometimes will cache the embed on msg send
    // but sometimes it loads it after the fact. so we only care at the point when
    // the embed exists on the message.
    if (oldMessage.embeds.length < newMessage.embeds.length & oldMessage.embeds.length === 0) {
        // if it has an embed, we need to also make sure it's a link first
        if (newMessage.embeds[0].type !== "image" && newMessage.embeds[0].type !== "gifv") {
            try {
                const start = moment();
                const orig = await General.findRepost(newMessage);
                if (orig) {
                    handleRepost(newMessage, orig, start);
                }
            }
            catch (error) {
                logger.error(loggerInfo, err);
                return;
            }
        }
    }
});

client.on('interaction', async interaction => {
    const loggerInfo = {
        function: "client.on(interaction)"
    };

    if (!interaction.isCommand()) { return; }

    switch (interaction.commandName) {
        case COMMAND_NAMES.coffee: {
            const url = await getGiphyUrl("coffee");
            const embed = new Discord.MessageEmbed().setImage(url);
            interaction.reply(embed);
            break;
        }

        case COMMAND_NAMES.goodMerlin: {
            const url = await getGiphyUrl("good morning");
            const embed = new Discord.MessageEmbed().setImage(url);
            interaction.reply(embed);
            break;
        }

        case COMMAND_NAMES.spice: {
            handleSpiceCommand(interaction);
            break;
        }

        default: {
            logger.info(loggerInfo, `Unhandled command: ${interaction}`);
            break;
        }
    }
});

client.login(process.env.DISCORD);

process.on('unhandledRejection', err => {
    const loggerInfo = {
        function: "process.on(unhandledRejection)"
    };
    logger.error(loggerInfo, err);
});
