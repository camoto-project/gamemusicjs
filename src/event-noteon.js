/*
 * NoteOnEvent class.
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
 * Event for when a note is played in a track.
 *
 * The channel is not specified here as it is set at the track level, with all
 * notes in the track being played on that same channel.
 *
 * For simplicity, only one note can be played at a time on each track.  If a
 * format is used like MIDI that supports polyphony within the same track,
 * these notes must be split out onto separate tracks.
 *
 * @property {Number} frequency
 *   Note frequency in Hertz, e.g. 440.
 *
 * @property {Number} velocity
 *   Note velocity (volume), as a floating-point number between 0 (silent)
 *   and 1 (loudest).
 *
 * @property {Number} instrument
 *   Zero-based index into the song's patch list, for the instrument to use for
 *   this note.
 *
 * @param {Object} params
 *   Convenience method for setting object properties during construction.
 *
 * @class
 * @alias Music.NoteOnEvent
 */
class NoteOnEvent extends Event {
	constructor(params = {}) {
		super('NoteOnEvent', NoteOnEvent, params);

		this.frequency = params.frequency;
		this.velocity = params.velocity;
		this.instrument = params.instrument;

		if (typeof this.frequency !== 'number') {
			throw new Error('NoteOnEvent requires a numeric value for: frequency, got ${typeof this.frequency}.');
		}
		if (this.frequency < 1) {
			throw new Error(`NoteOnEvent frequency ${this.frequency} is too low, must be >= 1.`);
		}

		if (typeof this.velocity !== 'number') {
			throw new Error('NoteOnEvent requires a numeric value for: velocity, got ${typeof this.velocity}.');
		}
		if ((this.velocity < 0) || (this.velocity > 1)) {
			throw new Error(`NoteOnEvent velocity ${this.velocity} is out of range, must be between 0 and 1.`);
		}

		if (typeof this.instrument !== 'number') {
			throw new Error(`NoteOnEvent requires a numeric value for: instrument, got ${typeof this.instrument}.`);
		}
	}

	clone() {
		return new NoteOnEvent({
			custom: this.custom,
			frequency: this.frequency,
			velocity: this.velocity,
			instrument: this.instrument,
		});
	}
};

module.exports = NoteOnEvent;
