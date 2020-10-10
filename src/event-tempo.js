/*
 * TempoEvent class.
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
 * Number of microseconds in one second.
 */
const US_PER_SEC = 1000000.0;

/**
 * Event for changing the playback rate of the song.
 *
 * This event is global and the channel is not important.
 *
 * @property {Number} beatsPerBar
 *   Number of beats in one bar.
 *
 *   For example in 3/4 time, this value is 3.  Only used to assist with
 *   correctly arranging notes into bars.
 *
 * @property {Number} beatLength
 *   Note length of each beat.
 *
 *   In 3/4 time, this value is 4.  Only used to assist with correctly
 *   arranging notes into bars.
 *
 * @property {Number} ticksPerBeat
 *   Number of ticks in a single beat.
 *
 *   This value is used to calculate speeds based around note lengths and beats
 *   like "ticks per quarter note" or beats per minute.
 *
 *   If the song is in /4 time (i.e. each beat is a quarter note), then this
 *   value is of course the same as the number of ticks per quarter note.
 *
 * @property {Number} usPerTick
 *   Number of microseconds per tick.
 *
 *   Event::absTime values are in ticks.  Two events with an absTime
 *   difference of 1 would occur this many microseconds apart.
 *
 *   This controls the actual playback speed.  None of the other values control
 *   the speed, they all assist with notation rendering and converting tempo
 *   values to and from other units.
 *
 * @property {Number} framesPerTick
 *   Number of effect frames per tick.
 *
 *   A tick is analogous to a row in a .mod file and is equal to the least
 *   amount of time possible between two non-simultaneous events.  Some effects
 *   like retrig cause multiple audible changes between two rows, i.e. at
 *   intervals of less than one tick.  This value is used to set how finely
 *   ticks can be subdivided for these effect frames.  If this value is set to
 *   2 for example, there will be two retrigs between rows (for those rows where
 *   the retrig effect is used.)
 *
 * @class
 * @alias Music.ConfigurationEvent
 */
class TempoEvent extends Event {
	constructor(params = {}) {
		super('TempoEvent', TempoEvent, params);

		this.beatsPerBar = params.beatsPerBar;
		this.beatLength = params.beatLength;
		this.ticksPerBeat = params.ticksPerBeat;
		this.framesPerTick = params.framesPerTick;
		this.usPerTick = params.usPerTick;
	}

	clone() {
		return new TempoEvent({
			beatsPerBar: this.beatsPerBar,
			beatLength: this.beatLength,
			ticksPerBeat: this.ticksPerBeat,
			framesPerTick: this.framesPerTick,
			usPerTick: this.usPerTick,
		});
	}

	/**
	 * Get/set tempo as beats-per-minute.
	 *
	 * @param {Number} newBPM
	 *   Specify new BPM, omit to retrieve current BPM.
	 *
	 * @return {Number} Current tempo as beats-per-minute.
	 */
	bpm(newBPM = undefined) {
		if (newBPM !== undefined) {
			this.usPerTick = 60.0 * US_PER_SEC / (this.ticksPerBeat * newBPM);
		}

		return Math.round(60.0 * US_PER_SEC / (this.ticksPerBeat * this.usPerTick));
	}

	/**
	 * Get/set the ticker per beat from the number of ticks in a quarter note.
	 *
	 * Precondition: `this.beatLength` is valid and correct for the song.
	 *
	 * Postcondition: `this.ticksPerBeat` is changed to achieve the desired
	 *   number of ticks per quarter note.
	 *
	 * @param {Number} ticks
	 *   Number of ticks in each quarter-note.  Omit to retrieve the current value.
	 *
	 * @return {Number} Number of ticks in each quarter-note.
	 */
	ticksPerQuarterNote(ticks = undefined)
	{
		if (ticks !== undefined) {
			this.ticksPerBeat = this.beatLength / 4 * ticks;
		}

		return this.beatLength / 4 * this.ticksPerBeat;
	}

	/**
	 * Get/set the tempo from the number of microseconds in a quarter note.
	 *
	 * @param {Number} us
	 *   Number of microseconds in each quarter-note.  Omit to retrieve the
	 *   current value.
	 *
	 * @return {Number} Number of microseconds in each quarter-note.
	 */
	usPerQuarterNote(us = undefined)
	{
		if (us !== undefined) {
			this.usPerTick = us / this.ticksPerQuarterNote();
		}

		return this.usPerTick * this.ticksPerQuarterNote();
	}

	/**
	 * Set the tempo as a .mod speed and tempo value.
	 *
	 * Postcondition: `usPerTick` is changed to achieve the desired number of
	 *   ticks per second.
	 *
	 * @param {Number} speed
	 *   Module speed value.  Becomes the `framesPerTick` value.
	 *
	 * @param {Number} tempo
	 *   Module tempo value.
	 *
	 * @return {Object} Current values as `{speed: 123, tempo: 456}` object.
	 */
	module(speed = undefined, tempo = undefined)
	{
		if (speed !== undefined && tempo !== undefined) {
			const modTicksPerSec = tempo * 2 / 5;
			this.usPerTick = US_PER_SEC / modTicksPerSec * speed;
			this.framesPerTick = speed;
		}

		const modTicksPerSec = (US_PER_SEC / this.usPerTick) * this.framesPerTick;

		return {
			speed: this.framesPerTick,
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
	 *
	 * @return {Number} Number of ticks per second.
	 */
	hertz(uhz = undefined)
	{
		if (uhz !== undefined) {
			if (uhz === 0) {
				throw new Error('The tempo cannot be set to 0 Hz.');
			}
			this.usPerTick = US_PER_SEC / uhz;
		}

		return Math.round(US_PER_SEC / this.usPerTick);
	}

	/**
	 * Set the tempo as milliseconds per tick.
	 *
	 * Preconditions: `ms` > 0.
	 *
	 * Postconditions: `usPerTick` is changed to achieve the desired number of
	 *   ticks per second.
	 *
	 * @param {Number} ms
	 *   Number of milliseconds per tick.  Omit to leave the value unchanged.
	 *
	 * @return {Number} Number of milliseconds per ticks.
	 */
	msPerTick(ms)
	{
		if (ms !== undefined) {
			if (ms === 0) {
				throw new Error('The tempo cannot be set to 0 ms per tick.');
			}
			this.usPerTick = ms * 1000;
		}

		return Math.round(this.usPerTick / 1000.0);
	}
};

module.exports = TempoEvent;
