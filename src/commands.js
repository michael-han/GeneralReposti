/**
 * slash command enums
 */

const COMMAND_NAMES = {
    coffee: "coffee",
    goodMerlin: "goodmerlin",
    spice: "spice",
    spiceGet: "get",
    spiceSet: "set",
    spiceTolerance: "tolerance",
    moreTolerance: "more",
    maxTolerance: "max",
    lessTolerance: "less",
    noTolerance: "min"
};

const COMMANDS = [
    {
        name: COMMAND_NAMES.coffee,
        description: "Gives you coffee"
    },
    {
        name: COMMAND_NAMES.goodMerlin,
        description: "Say good morning"
    },
    {
        name: COMMAND_NAMES.spice,
        description: "Get or set your tolerance level for spiciness from the bot",
        options: [
            {
                name: COMMAND_NAMES.spiceGet,
                type: "SUB_COMMAND",
                description: "See how much spice you are currently set for"
            },
            {
                name: COMMAND_NAMES.spiceSet,
                type: "SUB_COMMAND",
                description: "Set your spice level",
                options: [{
                    name: COMMAND_NAMES.spiceTolerance,
                    type: "STRING",
                    description: "Specify more or less spice (sass)",
                    required: true,
                    choices: [
                        {
                            name: COMMAND_NAMES.moreTolerance,
                            value: COMMAND_NAMES.moreTolerance
                        },
                        {
                            name: COMMAND_NAMES.lessTolerance,
                            value: COMMAND_NAMES.lessTolerance
                        },
                        {
                            name: COMMAND_NAMES.maxTolerance,
                            value: COMMAND_NAMES.maxTolerance
                        },
                        {
                            name: COMMAND_NAMES.noTolerance,
                            value: COMMAND_NAMES.noTolerance
                        }
                    ]
                }]
            }
        ]
    }
];

module.exports = {
    COMMAND_NAMES,
    COMMANDS
};
