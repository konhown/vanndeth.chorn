const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Music commands')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('play')
        .setDescription('Play a song')
        .addStringOption((option) =>
          option.setName('name').setDescription('Name of song').setRequired(true)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName('stop').setDescription('Stop the song'))
    .addSubcommand((subcommand) => subcommand.setName('skip').setDescription('Skip the song'))
    .addSubcommand((subcommand) => subcommand.setName('previous').setDescription('Play previous song'))
    .addSubcommand((subcommand) => subcommand.setName('resume').setDescription('Resuming the stopped song')),

    async execute(interaction, client) {
      const voiceChannel = interaction.member.voice.channel;

    await interaction.deferReply({ ephemeral: true });

    if (!voiceChannel) {
      return await interaction.editReply('You need to be in a voice channel to use this command.');
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'play') {
      const songName = interaction.options.getString('name');

      // Create a player.
      const player = client.riffy.createConnection({
        guildId: interaction.guild.id,
        voiceChannel: voiceChannel.id,
        textChannel: interaction.channel.id,
        deaf: true,
      });

      const resolve = await client.riffy.resolve({ query: songName, requester: interaction.user });
      const { loadType, tracks, playlistInfo } = resolve;

      if (loadType === 'playlist') {
        for (const track of resolve.tracks) {
          track.info.requester = interaction.user;
          await player.queue.add(track);
        }

        const playlistEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('Playlist Added')
          .setDescription(`Added: \`${tracks.length} tracks\` from \`${playlistInfo.name}\``)
          .setFooter({text: `Requested by: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL()});

       await interaction.editReply({ embeds: [playlistEmbed] });

        if (!player.playing && !player.paused) return player.play();
      } else if (loadType === 'search' || loadType === 'track') {
        const track = tracks.shift();
        track.info.requester = interaction.user;

       await player.queue.add(track);

        const trackEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('Track Added')
          .setDescription(`Added: \`${track.info.title}\``)
          .setFooter({text: `Requested by: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL()});

        await interaction.editReply({ embeds: [trackEmbed] });

        if (!player.playing && !player.paused) return player.play();
      } else {
        const noResultsEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('No Results Found')
          .setDescription('There are no results found.');

        return await interaction.editReply({ embeds: [noResultsEmbed] });
      }
    } else if (subcommand === 'stop') {
      const player = client.riffy.players.get(interaction.guild.id);
if (!player) {
return await interaction.editReply({content: `No music is being played at the moment.`, ephemeral: true})
}
      if (player) {
        await player.stop(true); 
      }

      const stopEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Stopped Playing')
        .setFooter({ text: `Requested by: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

      return await interaction.editReply({ embeds: [stopEmbed] });

    } else if (subcommand === 'skip') {
      const player = client.riffy.players.get(interaction.guild.id);
if (!player) {
return await interaction.editReply({content: `No music is being played at the moment.`, ephemeral: true})
}
      if (player) {
        await player.stop();
      }

      const skipEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Skipped to the Next Song')
        .setFooter({ text: `Requested by: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

      return await interaction.editReply({ embeds: [skipEmbed] });
    } else if (subcommand === 'previous') {

  let player = await client.riffy.players.get(interaction.guild.id);
    if (!player?.previous)
      return interaction.editReply({
        content: `No previous track to add.`,
        ephemeral: true,
      });

   await player.queue.add(player.previous);

    await interaction.editReply({
      content: `Added the previous track.`,
      ephemeral: false,
    });
    if (!player.playing && !player.paused) return player.play();
} else if (subcommand === 'resume') {
    const player = await client.riffy.players.get(interaction.guild.id);
    let msg = await client.channels.cache.get(player.textChannel);
    msg = msg.messages.cache.get(
      player.get(`msgid_${interaction.guild.id}`),
    );
    await player.pause(false);
    await interaction.editReply({
      content: `Resuming the current track.`,
      ephemeral: true,
    });
}
  },
};
