/*
 * TempoEvent class.
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

import assert from 'assert';
import Event from './event.js';

/**
 * Number of microseconds in one second.
 *
 * @private
 */
const US_PER_SEC = 1000000.0;

/**
 * Event for changing the playback rate of the song.
 *
 * This event is global and the channel/track is not important.
 */
export default class TempoEvent extends Event
{
	constructor(params = {}) {
		super('TempoEvent', TempoEvent, params);

		// Set some sensible defaults
		this._beatsPerBar = 4;
		this._beatLength = 4;
		this._ticksPerQuarterNote = 48;
		this._framesPerTick = 6;
		this._usPerTick = 1000;

		// Pass other values through the setters for validation.
		if (params.beatsPerBar !== undefined) this.beatsPerBar = params.beatsPerBar;
		if (params.beatLength !== undefined) this.beatLength = params.beatLength;
		if (params.ticksPerQuarterNote !== undefined) this.ticksPerQuarterNote = params.ticksPerQuarterNote;
		if (params.framesPerTick !== undefined) this.framesPerTick = params.framesPerTick;
		if (params.usPerTick !== undefined) this.usPerTick = params.usPerTick;

		// Set derived units if passed.
		if (params.bpm !== undefined) this.bpm = params.bpm;
		if (params.usPerQuarterNote !== undefined) this.usPerQuarterNote = params.usPerQuarterNote;
		if (params.module !== undefined) this.module = params.module;
		if (params.hertz !== undefined) this.hertz = params.hertz;
	}

	clone() {
		return new TempoEvent({
			custom: this.custom,
			beatsPerBar: this._beatsPerBar,
			beatLength: this._beatLength,
			ticksPerQuarterNote: this._ticksPerQuarterNote,
			framesPerTick: this._framesPerTick,
			usPerTick: this._usPerTick,
		});
	}

	toString() {
		return `[TempoEvent`
			+ ` us/t:${Math.round(this._usPerTick) || '?'}`
			+ ` tsig:${this._beatsPerBar || '?'}/${this._beatLength || '?'}`
			+ ` t/qn:${this._ticksPerQuarterNote || '?'}`
			+ ` f/t:${this._framesPerTick || '?'}`
			+ `]`;
	}

	//
	// The following values are all canonical values, as opposed to the derived
	// units further below which are all calculated from these.
	//

	/**
	 * Number of beats in one bar.
	 *
	 * For example in 3/4 time, this value is 3.  Only used to assist with
	 * correctly arranging notes into bars.
	 */
	set beatsPerBar(v) {
		if ((v < 1) || (v > 16)) {
			throw new Error(`beatsPerBar value out of 1..16 range: ${v}.`);
		}
		this._beatsPerBar = v;
	}

	/**
	 * Number of beats in one bar.
	 *
	 * See corresponding setter for details.
	 */
	get beatsPerBar() {
		return this._beatsPerBar;
	}

	/**
	 * Note length of one beat.
	 *
	 * 4 means 1/4 (quarter) note, 8 means a 1/8 (eighth) note, etc.
	 *
	 * In 3/4 time, this value is 4.  Used to assist with correctly arranging
	 * notes into bars, as well as tempo calculations involving beats (e.g.
	 * `bpm()`).
	 */
	set beatLength(v) {
		if ((v < 1) || (v > 16)) {
			throw new Error(`beatLength value out of 1..16 range: ${v}.`);
		}
		this._beatLength = v;
	}

	/**
	 * Number of beats in one bar.
	 *
	 * See corresponding setter for details.
	 */
	get beatLength() {
		return this._beatLength;
	}

	/**
	 * Number of ticks in a quarter note.
	 *
	 * This value is used to convert event duration (note length) from ticks to
	 * more conventional note lengths like quavers, semiquavers, etc.  Some
	 * formats like MIDI also use it indirectly for timing, by specifying both
	 * this value along with a second value for the number of microseconds per
	 * quarter note.  (See `this.usPerQuarterNote()`).
	 *
	 * If the song is in /4 time (i.e. each beat is a quarter note), then this
	 * value is of course the same as the number of ticks per beat.  In /8 time,
	 * where there are two beats per quarter-note (one beat per eighth-note),
	 * this value will be double the number of ticks per beat.
	 */
	set ticksPerQuarterNote(v) {
		// Prevent invalid values from being set.
		if (!v) {
			throw new Error(`Invalid value for ticksPerQuarterNote: ${v}.`);
		}

		this._ticksPerQuarterNote = v;
	}

	/**
	 * Number of ticks in a quarter note.
	 *
	 * See corresponding setter for details.
	 */
	get ticksPerQuarterNote() {
		return this._ticksPerQuarterNote;
	}

	/**
	 * Number of effect frames per tick.
	 *
	 * A tick is analogous to a row in a .mod file and is equal to the least
	 * amount of time possible between two non-simultaneous events.  Some effects
	 * like retrig cause multiple audible changes between two rows, i.e. at
	 * intervals of less than one tick.  This value is used to set how finely
	 * ticks can be subdivided for these effect frames.  If this value is set to
	 * 2 for example, there will be two retrigs between rows (for those rows where
	 * the retrig effect is used.)
	 */
	set framesPerTick(v) {
		if ((v < 1) || (v > 64)) {
			throw new Error(`framesPerTick value out of 1..64 range: ${v}.`);
		}

		this._framesPerTick = v;
	}

	/**
	 * Number of effect frames per tick.
	 *
	 * See corresponding setter for details.
	 */
	get framesPerTick() {
		return this._framesPerTick;
	}

	/**
	 * Number of microseconds per tick.
	 *
	 * Delay values are in ticks.  A delay value of 1 would cause a delay for
	 * the number of microseconds specified by this variable.
	 *
	 * This controls the actual playback speed.  None of the other values control
	 * the speed, they all assist with notation rendering and converting tempo
	 * values to and from other units.
	 */
	set usPerTick(v) {
		if (v <= 0) {
			throw new Error(`usPerTick value must be > 0.`);
		}
		if (v > 600 * US_PER_SEC) {
			throw new Error(`usPerTick value must be under 10 minutes.`);
		}

		this._usPerTick = v;
	}

	/**
	 * Number of microseconds per tick.
	 *
	 * See corresponding setter for details.
	 */
	get usPerTick() {
		return this._usPerTick;
	}

	//
	// The following functions are all derived units, in that they set and
	// retrieve their values by performing a calculation on the variables above.
	//

	/**
	 * Set current tempo as beats-per-minute.
	 *
	 * `this.ticksPerQuarterNote` must be set in order to calculate the beat
	 * length.
	 *
	 * @return No return value, and `this.usPerTick` is updated accordingly.
	 */
	set bpm(v) {
		// These values should always be valid as they are set in the constructor
		// and the setters prevent invalid values from being set.
		assert.ok(this._ticksPerQuarterNote);
		assert.ok(this._beatLength);

		const notesPerBeat = 1 / this._beatLength;
		const ticksPerNote = this._ticksPerQuarterNote * 4;
		const ticksPerBeat = ticksPerNote * notesPerBeat;
		this.usPerTick = 60.0 * US_PER_SEC / (ticksPerBeat * v);
	}

	/**
	 * Get current tempo as beats-per-minute.
	 *
	 * @return {Number} Current tempo as beats-per-minute.
	 */
	get bpm() {
		// These values should always be valid as they are set in the constructor
		// and the setters prevent invalid values from being set.
		assert.ok(this._ticksPerQuarterNote);
		assert.ok(this._beatLength);

		const notesPerBeat = 1 / this._beatLength;
		const ticksPerNote = this._ticksPerQuarterNote * 4;
		return Math.round(60.0 * US_PER_SEC / (ticksPerNote * notesPerBeat * this._usPerTick));
	}

	/**
	 * Get/set the tempo from the number of microseconds in a quarter note.
	 *
	 * @param {Number} v
	 *   Number of microseconds in each quarter-note.  Omit to retrieve the
	 *   current value.
	 *
	 * @return {Number} Number of microseconds in each quarter-note.
	 */
	set usPerQuarterNote(v) {
		// These values should always be valid as they are set in the constructor
		// and the setters prevent invalid values from being set.
		assert.ok(this._ticksPerQuarterNote);

		this.usPerTick = v / this._ticksPerQuarterNote;
	}

	get usPerQuarterNote() {
		// These values should always be valid as they are set in the constructor
		// and the setters prevent invalid values from being set.
		assert.ok(this._ticksPerQuarterNote);

		return this._usPerTick * this._ticksPerQuarterNote;
	}

	/**
	 * Set the tempo as a .mod speed and tempo value.
	 *
	 * Postcondition: `usPerTick` is changed to achieve the desired number of
	 *   ticks per second.
	 *
	 * @param {object} v
	 *   New speed and tempo to set.
	 *
	 * @param {Number} v.speed
	 *   Module speed value.  Becomes the `framesPerTick` value.
	 *
	 * @param {Number} v.tempo
	 *   Module tempo value.
	 */
	set module(v) {
		if ((v.speed === undefined) || (v.tempo === undefined)) {
			throw new Error('module(): Missing speed or tempo parameters.');
		}
		const modTicksPerSec = v.tempo * 2 / 5;
		this.usPerTick = US_PER_SEC / modTicksPerSec * v.speed;
		this.framesPerTick = v.speed;
	}

	/**
	 * Get the tempo as a .mod speed and tempo value.
	 *
	 * @return {object} Current values as `{speed: 123, tempo: 456}` object.
	 */
	get module() {
		const modTicksPerSec = (US_PER_SEC / this._usPerTick) * this._framesPerTick;

		return {
			speed: this._framesPerTick,
			tempo: Math.round(modTicksPerSec * 5 / 2),
		};
	}

	/**
	 * Set the tempo as ticks per second.
	 *
	 * Postconditions: `usPerTick` is changed to achieve the desired number of
	 *   ticks per second.
	 *
	 * @param {Number} uhz
	 *   Number of ticks per second.  Omit to leave the value unchanged.
	 */
	set hertz(v) {
		if (v === 0) {
			throw new Error('The tempo cannot be set to 0 Hz.');
		}
		this.usPerTick = US_PER_SEC / v;
	}

	/**
	 * Get the tempo as ticks per second.
	 *
	 * @return {Number} Number of ticks per second.
	 */
	get hertz() {
		return Math.round(US_PER_SEC / this._usPerTick);
	}
}
