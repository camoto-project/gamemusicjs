/*
 * EffectEvent class.
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

import Event from './event.js';

/**
 * Event for changing aspects of a currently playing note.
 *
 * The channel is not specified here as it is set at the track level, with all
 * notes in the track being played on that same channel.
 *
 * For simplicity, only one note can be played at a time on each track.  If a
 * format is used like MIDI that supports polyphony within the same track,
 * these notes must be split out onto separate tracks.
 *
 * @property {Number} pitchbend
 *   Amount to pitchbend the channel, -1..+1, or `undefined` to leave the
 *   pitch bend setting unchanged.
 *
 * @property {Number} volume
 *   Note velocity (volume), as a floating-point number between 0 (silent)
 *   and 1 (loudest), or `undefined` to leave the volume unchanged.  It is
 *   possible to set the volume to zero without stopping the note, so the volume
 *   can be increased again later to resume the note without playing a new one.
 *
 * @param {Object} params
 *   Convenience method for setting object properties during construction.
 */
export default class EffectEvent extends Event
{
	constructor(params = {}) {
		super('EffectEvent', EffectEvent, params);

		this.pitchbend = params.pitchbend;
		this.volume = params.volume;
	}

	clone() {
		return new EffectEvent({
			custom: this.custom,
			pitchbend: this.pitchbend,
			volume: this.volume,
		});
	}

	toString() {
		let s = '[EffectEvent';
		if (this.pitchbend) {
			s += ` PB:${this.pitchbend.toFixed(2)}`;
		}
		if (this.volume) {
			s += ` V:${this.volume.toFixed(2)}`;
		}
		s += ']';
		return s;
	}
}
