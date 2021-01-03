/*
 * One pattern in a collection of them in a Music instance.
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
export default class Pattern
{
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
}
