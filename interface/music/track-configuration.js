/*
 * Information about a single track's settings in a Music instance.
 *
 * Copyright (C) 2010-2021 Adam Nielsen <malvineous@shikadi.net>
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

const nullCo = (v, d) => ((v === null) || (v === undefined)) ? d : v;

/**
 * The type of channel in use.
 *
 * @enum {Number}
 */
export const ChannelType = {
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

ChannelType.toString = v => (
	nullCo(Object.entries(ChannelType).find(
		n => n[1] === v
	), ['?'])
)[0];

/**
 * Channel allocation for each track in the song.
 *
 * Only used by {@link Music.trackConfig}.
 *
 * @property {TrackConfiguration.ChannelType} channelType
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
export default class TrackConfiguration
{
	constructor(params = {}) {
		this.channelType = params.channelType;
		this.channelIndex = params.channelIndex;
	}

	toString() {
		return ChannelType.toString(this.channelType) + '-' + nullCo(this.channelIndex, '?');
	}
}

TrackConfiguration.ChannelType = ChannelType;
