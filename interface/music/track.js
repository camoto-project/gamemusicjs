/*
 * One track in a collection of them in a Pattern instance.
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
export default class Track
{
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
}
