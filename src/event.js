/*
 * Event base class.
 *
 * Copyright (C) 2010-2020 Adam Nielsen <malvineous@shikadi.net>
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
 * Base class describing a single musical event, such as a note being played.
 *
 * Instances of this class are returned in the 'events' array in the {Music}
 * instance.
 *
 * @property {string} type
 *   Event type ID for debugging messages.
 *
 * @property {Number} preDelay
 *   Delay before this event is actioned, in milliseconds.
 *
 * @param {Object} params
 *   Convenience method for setting object properties during construction.
 *
 * @class
 * @alias Music.Event
 */
class Event {
	constructor(typeName, type, params = {}) {
		this.typeName = typeName;
		this.type = type;
	}

	clone() {
		throw new Error('Cannot clone a generic event, add a clone() method.');
	}
};

module.exports = Event;
