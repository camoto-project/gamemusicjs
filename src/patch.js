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

/**
 * Base class for an instrument's settings.
 */
class Patch
{
	constructor(type, params) {
		this.type = type;
		this.title = params.title || null;
	}
}

class PatchOPL extends Patch {
	constructor(params = {}) {
		super('PatchOPL', params);

		this.slot = params.slot || [];
		this.feedback = 0;
		this.connection = 0;
	}

	clone() {
		// Deep copy the slot array.
		let slot2 = [];
		for (const s in this.slot) {
			slot2[s] = {...this.slot[s]};
		}

		return new PatchOPL({
			slot: slot2,
			feedback: this.feedback,
			connection: this.connection,
		});
	}
}

class PatchMIDI extends Patch {
	constructor(params = {}) {
		super('PatchMIDI', params);
		
		this.midiPatch = params.midiPatch;
	}

	clone() {
		return new PatchMIDI({
			midiPatch: this.midiPatch,
		});
	}
}

class PatchPCM extends Patch {
	constructor(params = {}) {
		super('PatchPCM', params);
		
		this.sampleRate = params.sampleRate || 8000;
	}

	clone() {
		return new PatchMIDI({
			sampleRate: this.sampleRate,
		});
	}
}

Patch.OPL = PatchOPL;
Patch.MIDI = PatchMIDI;
Patch.PCM = PatchPCM;

module.exports = Patch;
