/** 
 * db handling for user spice tolerance levels
 */

const MAX_SPICE_TOLERANCE = 2;
const SPICE_LEVELS = [
    "Mild",     // 0
    "Medium",   // 1
    "HOT"       // 2
];

const SPICE_ERRORS = {
    SpiceError: "SpiceError",
    SpiceRangeError: "SpiceRangeError"
};

class SpiceError extends Error {
    constructor(message) {
        super(message);
        this.name = SPICE_ERRORS.SpiceError
    }
};

class SpiceRangeError extends Error {
    constructor(message) {
        super(message);
        this.name = SPICE_ERRORS.SpiceRangeError
    }
};

const { Sequelize, DataTypes }  = require('sequelize');
const logger = require('pino')();
const globalLoggerInfo = {
    function: "Spice.sequelize"
};

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'db/spiceStore.sqlite',
    logging: msg => logger.info(globalLoggerInfo, msg)
});

const Tolerance = sequelize.define("tolerance", {
    userId: {
        type: DataTypes.STRING,
        unique: 'compositeIndex'
    },
    guildId: {
        type: DataTypes.STRING,
        unique: 'compositeIndex'
    },
    level: DataTypes.INTEGER
});

async function setup() {
    await sequelize.authenticate();
    await Tolerance.sync();
}

async function lookupTolerance(userId, guildId) {
    let [tolerance] = await Tolerance.findOrCreate({
        where: {
            userId: userId,
            guildId: guildId
        },
        defaults: {
            level: 0
        }
    });

    return tolerance;
}

async function getTolerance(userId, guildId) {
    const loggerInfo = {
        function: "Spice.getTolerance"
    };

    let tolerance = await lookupTolerance(userId, guildId);

    logger.info(loggerInfo, tolerance);
    return tolerance.level;
}

async function moreSpice(userId, guildId) {
    const loggerInfo = {
        function: "Spice.moreSpice"
    };

    let tolerance = await lookupTolerance(userId, guildId);    
    if (tolerance.level < MAX_SPICE_TOLERANCE) {
        tolerance.level += 1;
        tolerance.save();
        return tolerance.level;
    }
    else {
        logger.info(loggerInfo, `${userId} in ${guildId} already at max`)
        throw new SpiceRangeError("Already at maximum");
    }
}

async function maxSpice(userId, guildId) {
    const loggerInfo = {
        function: "Spice.maxSpice"
    };

    let tolerance = await lookupTolerance(userId, guildId);
    if (tolerance.level !== MAX_SPICE_TOLERANCE) {
        tolerance.level = MAX_SPICE_TOLERANCE;
        tolerance.save();
        return tolerance.level;
    }
    else {
        logger.info(loggerInfo, `${userId} in ${guildId} already at max`)
        throw new SpiceError("Already at maximum");
    }
}

async function lessSpice(userId, guildId) {
    const loggerInfo = {
        function: "Spice.lessSpice"
    };

    let tolerance = await lookupTolerance(userId, guildId);
    if (tolerance.level > 0) {
        tolerance.level -= 1;
        tolerance.save();
        return tolerance.level;
    }
    else {
        logger.info(loggerInfo, `${userId} in ${guildId} already at min`)
        throw new SpiceRangeError("Already at minimum");
    }
}

async function noSpice(userId, guildId) {
    const loggerInfo = {
        function: "Spice.noSpice"
    };

    let tolerance = await lookupTolerance(userId, guildId);
    if (tolerance.level !== 0) {
        tolerance.level = 0;
        tolerance.save();
        return tolerance.level;
    }
    else {
        logger.info(loggerInfo, `${userId} in ${guildId} already at min`)
        throw new SpiceRangeError("Already at minimum");
    }
}

module.exports = {
    MAX_SPICE_TOLERANCE,
    SPICE_LEVELS,
    SPICE_ERRORS,
    setup,
    getTolerance,
    moreSpice,
    maxSpice,
    lessSpice,
    noSpice
};
