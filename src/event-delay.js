/*
 * DelayEvent class.
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

const Event = require('./event.js');

/**
 * Event for waiting for some time to pass.
 *
 * The delay only applies to the current event list (so if there are multiple
 * tracks then it only applies to the current track, with delays happening in
 * parallel across all tracks).
 *
 * @property {Number} ticks
 *   Number of ticks to delay for.
 *
 * @class
 * @alias Music.DelayEvent
 */
class DelayEvent extends Event {
	constructor(params = {}) {
		super('DelayEvent', DelayEvent, params);

		this.ticks = params.ticks;
	}

	clone() {
		return new DelayEvent({
			custom: this.custom,
			ticks: this.ticks,
		});
	}
};

module.exports = DelayEvent;
