/**
 * @file Music base class and defaults.
 * @private
 *
 * Copyright (C) 2018-2020 Adam Nielsen <malvineous@shikadi.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Base class describing the interface to a song.
 *
 * Instances of this class are returned when reading music files, and are passed
 * to the format handlers to produce new music files.
 *
 * @example
 * Music
 *  |
 *  +-- Pattern0
 *  |    |
 *  |    +-- Track0, channel set in trackConfig[0]
 *  |    |
 *  |    +-- Track1, channel set in trackConfig[1]
 *  |
 *  +-- Pattern1
 *       |
 *       +-- Track0, channel set in trackConfig[0]
 *       |
 *       +-- Track1, channel set in trackConfig[1]
 * @endexample
 *
 * @property {Array<Patch>} patches
 *   The instruments that are available for use by NoteOnEvents.
 *
 * @property {Object} tags
 *   Any metadata describing the file itself.  The key is tag ID, and the value
 *   is the tag content.
 *
 *   This is where the song title, composer, etc. will be stored.  Valid tags
 *   for a given file format are obtained from
 *   {@link MusicHandler.metadata MusicHandler.metadata()}.
 *
 * @property {Array<Music.TrackConfiguration>} trackConfig
 *   List of all tracks in the song and their channel allocations.
 *
 *   A pattern always has the same number of tracks as there are entries in
 *   this array, and the channel allocation specified here holds true for all
 *   tracks in all patterns.
 *
 * @property {Array<Pattern>} patterns
 *   Each pattern is collection of tracks, with the tracks containing the
 *   musical events.  Patterns can be played multiple times within the song
 *   to repeat parts.
 *
 *   Every pattern must have the same number of tracks.
 *
 * @property {Array<Number>} patternSequence
 *   The order in which to play the patterns.
 *
 *   Patterns are identified by index into {this.patterns}, so {0} is the
 *   first pattern.  Patterns can be played multiple times and in any order.
 */
class Music
{
	constructor() {
		this.initialTempo = new Music.TempoEvent();
		this.trackConfig = [];
		this.patches = [];
		this.patterns = [];

		// Array of numbers, first element is the index of the pattern to play
		// first, second element is the index of the pattern to play second, etc.
		this.patternSequence = [];

		// Index into patternOrder to jump to once the end of the song has been
		// reached.
		this.loopDest = null;

		this.tags = {};
	}
}

module.exports = Music;

/**
 * A pattern to be placed inside {@link Music.patterns}.
 *
 * A pattern is a collection of short tracks (a track contains musical events)
 * which can be played multiple times within a song.
 *
 * @property {Array<Track>} tracks
 *   A list of tracks used by the song.  A track is a sequence of events tied
 *   to a particular channel.
 *
 * @param {Object} params
 *   Convenience method for setting object properties during construction.
 *
 * @class
 * @alias Music.Pattern
 */
Music.Pattern = class Pattern {
	constructor(params = {}) {
		this.tracks = params.tracks || [];
	}

	clone() {
		let n = new Pattern();
		for (const t of this.tracks) {
			const tc = t.clone();
			n.tracks.push(tc);
		}

		return n;
	}
};

/**
 * The type of channel in use.
 *
 * @enum {Number}
 */
Music.ChannelType = {
	/**
	 * Any channel type (e.g. a global tempo event where the type of channel
	 * doesn't matter).
	 */
	Any: 0,

	/**
	 * OPL2 or OPL3 Rhythm/percussive channel (1-operator).
	 */
	OPLR: 1,

	/**
	 * OPL2 or OPL3 Two-operator melodic channel.
	 */
	OPLT: 2,

	/**
	 * OPL3 Four-operator melodic channel.
	 */
	OPLF: 3,

	/**
	 * Standard MIDI channel.
	 */
	MIDI: 4,

	/**
	 * Standard MIDI percussion channel.
	 */
	MIDIP: 5,

	/**
	 * Digitised audio channel for playing samples like in a .mod file.
	 */
	PCM: 6,
};

Music.ChannelType.toString = v => Object.keys(Music.ChannelType)[v] || '?';

/**
 * Channel allocation for each track in the song.
 *
 * Only used by {@link Music.trackConfig}.
 *
 * @property {Music.ChannelType} channelType
 *   What type of channel this track is allocated to.
 *
 *   For example if it is allocated to a MIDI channel, then the track can only
 *   use MIDI instruments, and notes using OPL or PCM instruments will be
 *   ignored.
 *
 *   This is used mostly for the format writers, to do things like leave the
 *   first OPL channel free for sound effects.
 *
 * @property {Number} channelIndex
 *
 *   Which hardware channel to use of the selected channelType.
 *
 *   When channelType is:
 *
 *   - `Any`: this value is 0-255.  The value is not so important, but only one
 *     note can be played on each channel at a time, across all tracks.  It is
 *     not valid to write any tracks with this channel type set.  All
 *     channelType=Any tracks must be mapped to other values before a song is
 *     passed to a format writer.  This is to prevent every format writer from
 *     having to map channels itself.
 *
 *   - `OPL`: this value is 0 to 8 for normal OPL channels on chip 1, and 9 to
 *     17 for chip 2.  Some events are global and will affect the whole chip
 *     regardless of what track they are played on.
 *
 *   - `OPLPerc`: this value is 4 for bass drum, 3 for snare, 2 for tomtom,
 *     1 for top cymbal, 0 for hi-hat.  Other values are invalid.
 *
 *   - `MIDI`: this value is 0 to 15, with 9 being percussion.
 *
 *   - `PCM`: this value is the channel index starting at 0.  For some formats
 *     like .mod, this affects the panning of the channel.
 *
 *   Note that OPL percussion mode uses channels 6, 7 and 8, so it is not
 *   valid for a song to have channelType=OPL events on these channels while
 *   channelType=OPLPer events are present.  This may happen temporarily
 *   during a format conversion, but this state must be resolved by the time
 *   the data is written out to a file.
 *
 * @param {Object} params
 *   Convenience method for setting object properties during construction.
 *
 * @class
 * @alias Music.TrackConfiguration
 */
Music.TrackConfiguration = class TrackConfiguration {
	constructor(params = {}) {
		this.channelType = params.channelType || Music.ChannelType.Unknown;
		this.channelIndex = params.channelIndex;
	}
};

/**
 * Track data within a pattern.
 *
 * @property {Array<Event>} events
 *   An array of all the events in the track.
 *
 *   Each element in the array is a Music.Event object.  Events are played in
 *   order, with an optional delay between each event indicated by a non-zero
 *   value in each event's {preDelay} property.
 *
 * @param {Object} params
 *   Convenience method for setting object properties during construction.
 *
 * @class
 * @alias Music.Track
 */
Music.Track = class Track {
	constructor(params = {}) {
		this.events = params.events || [];
		this.custom = params.custom;
	}

	clone() {
		let t = new Track({
			custom: this.custom,
		});
		for (const ev of this.events) {
			const evc = ev.clone();
			t.events.push(evc);
		}

		return t;
	}
};

Music.Event = require('./event.js');
Music.ConfigurationEvent = require('./event-configuration.js');
Music.DelayEvent = require('./event-delay.js');
Music.NoteOffEvent = require('./event-noteoff.js');
Music.NoteOnEvent = require('./event-noteon.js');
Music.TempoEvent = require('./event-tempo.js');
Music.EffectEvent = require('./event-effect.js');

Music.Patch = require('./patch.js');
