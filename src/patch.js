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
	constructor(params) {
		this.custom = params.custom || {};
		this.title = params.title || null;
	}

	clone() {
		throw new Error(`BUG: clone() not implemented by descendent class.`);
	}

	equalTo(b) {
		throw new Error(`BUG: equalTo() not implemented by descendent class.`);
	}
}

class PatchOPL extends Patch {
	constructor(params = {}) {
		super(params);

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

	equalTo(b) {
		const a = this;
		function compareOp(opA, opB, includeOutput) {
			return (
				(opA.enableTremolo === opB.enableTremolo)
				&& (opA.enableVibrato === opB.enableVibrato)
				&& (opA.enableSustain === opB.enableSustain)
				&& (opA.enableKSR === opB.enableKSR)
				&& (opA.freqMult === opB.freqMult)
				&& (opA.scaleLevel === opB.scaleLevel)
				&& (
					!includeOutput || (opA.outputLevel === opB.outputLevel)
				)
				&& (opA.attackRate === opB.attackRate)
				&& (opA.decayRate === opB.decayRate)
				&& (opA.sustainRate === opB.sustainRate)
				&& (opA.releaseRate === opB.releaseRate)
				&& (opA.waveSelect === opB.waveSelect)
			);
		}

		for (let s = 0; s < 4; s++) {
			if (!a.slot[s] && !b.slot[s]) continue; // neither patch has this slot
			if (
				(a.slot[s] && !b.slot[s])
				|| (!a.slot[s] && b.slot[s])
			) {
				return false;
			}
			// Ignore the outputLevel in slot1 if it exists, otherwise assume rhythm
			// and ignore the outputLevel in slot0 instead.
			const outputSlot = a.slot[1] ? 1 : 0;
			const includeOutput = s != outputSlot;
			if (!compareOp(a.slot[s], b.slot[s], includeOutput)) return false;
		}

		return (
			(a.feedback === b.feedback)
			&& (a.connection === b.connection)
		);
	}
}

class PatchMIDI extends Patch {
	constructor(params = {}) {
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
