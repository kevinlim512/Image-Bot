const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const imageSearch = require('../image_search');
const resultMap = require('../resultMap');

function buildSearchEmbed(query, searchResult) {
    const current = searchResult.currentSearch();

    return new MessageEmbed()
        .setTitle(`Images of ${query}`)
        .setURL(current.sourceLink)
        .setDescription(`Result ${searchResult.currentResult + 1} of ${searchResult.resultArray.length}`)
        .addField(current.title, current.displayDomain)
        .setImage(current.imageUrl);
}

function buildSearchButtons(searchResult) {
    const current = searchResult.currentSearch();

    return new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('prev')
                .setLabel('Previous')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setLabel('Open Source Page')
                .setStyle('LINK')
                .setURL(current.sourceLink),
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('img')
        .setDescription('Search for an image')
        .addStringOption(option =>
            option.setName('input')
                .setDescription('The search term')
                .setRequired(true)),

    buildSearchEmbed,
    buildSearchButtons,

    async execute(interaction) {
        const query = interaction.options.getString('input');
        const searchResult = await imageSearch.search(query);
        const resultEmbed = buildSearchEmbed(query, searchResult);
        const row = buildSearchButtons(searchResult);

        const response = await interaction.reply({ embeds: [resultEmbed], components: [row], fetchReply: true });
        await resultMap.set(response.id, { query, searchResult });
    },
};
