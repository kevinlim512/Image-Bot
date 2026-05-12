const fs = require('node:fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
// Read environment variables
const config = require('./env-var');
const clientId = config.getConfig().clientId;
const token = config.getConfig().token;

const commands = [];
const commandDirectories = ['./commands', './commands-dev'];

for (const directory of commandDirectories) {
	if (!fs.existsSync(directory)) {
		continue;
	}

	const commandFiles = fs.readdirSync(directory).filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		const command = require(`${directory}/${file}`);
		commands.push(command.data.toJSON());
	}
}
const numCommands = commands.length;
const rest = new REST({ version: '9' }).setToken(token);

(async () => {
	try {
		console.log(`Started refreshing global application (/) commands with ${numCommands} command(s).`);

		await rest.put(
			Routes.applicationCommands(clientId),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${numCommands} global application (/) command(s).`);
	} catch (error) {
		console.error(error);
	}
})();
