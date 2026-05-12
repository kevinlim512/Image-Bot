require('dotenv').config();

const getConfig = () => {
    const env_client_id = process.env.CLIENT_ID;
    const env_guild_id = process.env.GUILD_ID;
    const env_guild_ids = process.env.GUILD_IDS;
    const env_token = process.env.TOKEN;
    const guildIds = env_guild_ids
        ? env_guild_ids.split(',').map(id => id.trim()).filter(Boolean)
        : env_guild_id
            ? [env_guild_id.trim()]
            : [];

    return {
        clientId: env_client_id,
        guildId: env_guild_id,
        guildIds,
        token: env_token,
    };
}

exports.getConfig = getConfig;
