/**
 * @file Patch classes.
 * @private
 *
 * Copyright (C) 2018-2020 Adam Nielsen <malvineous@shikadi.net>
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

const Music = require('./music.js');
const UtilOPL = require('./utl-opl.js');

/**
 * Base class for an instrument's settings.
 */
class Patch
{
	constructor(channelType, params) {
		this.custom = params.custom || {};
		this.channelType = channelType;
		this.title = params.title || null;
	}
}

class PatchOPL extends Patch {
	constructor(params = {}) {
		super(Music.ChannelType.OPL, params);

		this.slot = params.slot || [];
		this.feedback = params.feedback || 0;
		this.connection = params.connection || 0;
		this.rhythm = 0;
	}

	clone() {
		// Deep copy the slot array.
		let slot2 = [];
		for (const s in this.slot) {
			slot2[s] = {...this.slot[s]};
		}

		return new PatchOPL({
			custom: this.custom,
			slot: slot2,
			feedback: this.feedback,
			connection: this.connection,
			rhythm: this.rhythm,
		});
	}

	toString() {
		const pad2 = i => i.toString(16).toUpperCase().padStart(2, '0');
		const operatorToString = o => (
			(o.enableTremolo ? 'T' : 't')
			+ (o.enableVibrato ? 'V' : 'v')
			+ (o.enableSustain ? 'S' : 's')
			+ (o.enableKSR ? 'K' : 'k')
			+ pad2(o.freqMult)
			+ pad2(o.scaleLevel)
			+ pad2(o.outputLevel)
			+ pad2(o.attackRate)
			+ pad2(o.decayRate)
			+ pad2(o.sustainRate)
			+ pad2(o.releaseRate)
			+ o.waveSelect
		);
		return (
			'[PATCH:OPL:'
			+ UtilOPL.Rhythm.toString(this.rhythm)
			+ ':'
			+ this.feedback
			+ (this.connection ? 'N' : 'n')
			+ '/'
			+ this.slot.map(s => operatorToString(s)).join('/')
			+ ']'
		);
	}
}

class PatchMIDI extends Patch {
	constructor(params = {}) {
		super(Music.ChannelType.MIDI, params);

		this.midiBank = params.midiBank || 0;
		this.midiPatch = params.midiPatch || 0;
	}

	clone() {
		return new PatchMIDI({
			custom: this.custom,
			midiBank: this.midiBank,
			midiPatch: this.midiPatch,
		});
	}

	toString() {
		const b = this.midiBank.toString(16).padStart(2, '0');
		const p = this.midiPatch.toString(16).padStart(2, '0');
		return `[PATCH:MIDI:${b}.${p}]`;
	}
}

class PatchPCM extends Patch {
	constructor(params = {}) {
		super(Music.ChannelType.PCM, params);

		this.sampleRate = params.sampleRate || 8000;
	}

	clone() {
		return new PatchMIDI({
			custom: this.custom,
			sampleRate: this.sampleRate,
		});
	}

	toString() {
		return `[PCM:${this.sampleRate}Hz]`;
	}
}

Patch.OPL = PatchOPL;
Patch.MIDI = PatchMIDI;
Patch.PCM = PatchPCM;

module.exports = Patch;
