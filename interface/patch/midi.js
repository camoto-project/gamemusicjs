/*
 * MIDI instrument settings.
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

import Patch from './patch.js';

export default class PatchMIDI extends Patch
{
	constructor(params = {}) {
		super(params);

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

	equalTo(b) {
		const a = this;

		return (
			(a.midiBank === b.midiBank)
			&& (a.midiPatch === b.midiPatch)
		);
	}
}
