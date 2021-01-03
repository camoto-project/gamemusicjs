/*
 * Interface to a song.
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

import { Tempo as TempoEvent } from '../events/index.js';
import Pattern from './pattern.js';
import Track from './track.js';
import TrackConfiguration from './track-configuration.js';

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
export default class Music
{
	constructor() {
		this.initialTempo = new TempoEvent();
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

Music.Pattern = Pattern;
Music.Track = Track;
Music.TrackConfiguration = TrackConfiguration;
