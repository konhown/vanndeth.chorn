// add this before loadCommands and loadEvents

const { Riffy } = require("riffy");
const { Classic, Dynamic } = require('musicard');

const nodes = [
    {
        identifier: "Name",
        password: "yourpass",  
        host: "hostlink",
        port: ,
        secure: false
    }
];

client.riffy = new Riffy(client, nodes, {
    send: (payload) => {
        const guild = client.guilds.cache.get(payload.d.guild_id);
        if (guild) guild.shard.send(payload);
    },
    defaultSearchPlatform: "ytmsearch",
    restVersion: "v4"
});

client.on("ready", () => {
    client.riffy.init(client.user.id);
    console.log(`Logged in as ${client.user.tag}`);
});

client.riffy.on("nodeConnect", node => {
    console.log(`Node "${node.name}" connected.`);
});

client.riffy.on("nodeError", (node, error) => {
    console.log(`Node "${node.name}" encountered an error: ${error.message}.`);
});

// 🎵 **Track Start Event - Dynamic Progress Bar with Time**
client.riffy.on("trackStart", async (player, track) => {
    const channel = await client.channels.cache.get(player.textChannel);
    let progressInterval;

    // 🎛 **Playback Buttons**
    const musicButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('decrease_music').setStyle('Secondary').setEmoji('🔉'),
        new ButtonBuilder().setCustomId('previous_music').setStyle('Secondary').setEmoji('⏮️'),
        new ButtonBuilder().setCustomId('stop_music').setStyle('Danger').setEmoji('⏹️'),
        new ButtonBuilder().setCustomId('next_music').setStyle('Secondary').setEmoji('⏭️'),
        new ButtonBuilder().setCustomId('increase_music').setStyle('Secondary').setEmoji('🔊')
    );

    // Convert milliseconds to MM:SS format
    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    }

    async function updateMusicCard() {
        const elapsedTime = player.position; // Get current song position in ms
        const totalTime = track.info.length; // Get total song duration in ms
        const progressPercent = Math.floor((elapsedTime / totalTime) * 100);

        const musicCardBuffer = await Dynamic({
            thumbnailImage: track.info.thumbnail,
            backgroundColor: '#',
            progress: progressPercent, // 🔥 Dynamic Progress
            progressColor: '#FF7A00',
            progressBarColor: '#5F2D00',
            name: track.info.title,
            nameColor: '#FF7A00',
            author: `By ${track.info.author}`,
            authorColor: '#696969',
            startTime: formatTime(elapsedTime), // ⏳ Show elapsed time
            endTime: formatTime(totalTime) // ⏳ Show total duration
        });

        const attachment = new AttachmentBuilder(musicCardBuffer, { name: 'musicard.png' });

        if (player.currentMessage) {
            // 🔄 Update the existing message instead of sending a new one
            await player.currentMessage.edit({ files: [attachment] }).catch(console.error);
        } else {
            // 📩 Send the music card if it's the first update
            player.currentMessage = await channel.send({ files: [attachment], components: [musicButtons] });
        }
    }

    // 🗑️ Delete the previous message (prevents spam)
    if (player.currentMessage) {
        player.currentMessage.delete().catch(console.error);
    }

    // 📩 Send initial music card
    await updateMusicCard();

    // ⏳ **Start interval to update progress every 5 seconds**
    progressInterval = setInterval(async () => {
        if (!player.playing) return clearInterval(progressInterval);
        await updateMusicCard();
    }, 5000);

    // 🛑 **Clear interval when track ends**
    client.riffy.on("trackEnd", async () => {
        clearInterval(progressInterval);
    });
});

// 🎵 **Queue End Event**
client.riffy.on("queueEnd", async (player) => {
    const channel = client.channels.cache.get(player.textChannel);
    player.destroy();
    channel.send("Queue has ended.");
});

// 🎛 **Button Interaction Handling**
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    const player = client.riffy.players.get(interaction.guildId);
    if (!player) return interaction.reply({ content: "❌ No music is playing!", ephemeral: true });

    switch (interaction.customId) {
        case "decrease_music":
            player.setVolume(Math.max(player.volume - 10, 0));
            await interaction.reply({ content: `🔉 Volume decreased to ${player.volume}%`, ephemeral: true });
            break;
        case "increase_music":
            player.setVolume(Math.min(player.volume + 10, 100));
            await interaction.reply({ content: `🔊 Volume increased to ${player.volume}%`, ephemeral: true });
            break;
        case "previous_music":
            player.previousTrack();
            await interaction.reply({ content: "⏮️ Playing previous track.", ephemeral: true });
            break;
        case "stop_music":
            player.stop();
            await interaction.reply({ content: "⏹️ Stopped music.", ephemeral: true });
            break;
        case "next_music":
            player.skip();
            await interaction.reply({ content: "⏭️ Skipping track.", ephemeral: true });
            break;
    }
});

// 🎙 **Voice State Handling**
client.on("raw", (d) => {
    if (![GatewayDispatchEvents.VoiceStateUpdate, GatewayDispatchEvents.VoiceServerUpdate].includes(d.t)) return;
    client.riffy.updateVoiceState(d);
});
