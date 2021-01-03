/*
 * Settings for digital audio samples used as instruments.
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

// Compare PCM samples.
function arrayEqual(a, b) {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] ^ b[i]) return false;
	}
	return true;
}

export default class PatchPCM extends Patch
{
	constructor(params = {}) {
		super(params);

		this.sampleRate = params.sampleRate || 8000;
		this.loopStart = params.loopStart || 0;
		this.loopEnd = params.loopEnd || 0;
		// loop type? fwd/back/pingpong
		this.samples = params.samples || new Uint8Array(0);
	}

	clone() {
		return new PatchPCM({
			custom: this.custom,
			sampleRate: this.sampleRate,
			loopStart: this.loopStart,
			loopEnd: this.loopEnd,
			samples: new Uint8Array(this.samples, 0, this.samples.length),
		});
	}

	toString() {
		return `[PCM:${this.sampleRate}Hz]`;
	}

	equalTo(b) {
		const a = this;

		return (
			(a.sampleRate === b.sampleRate)
			&& (a.loopStart === b.loopStart)
			&& (a.loopEnd === b.loopEnd)
			&& arrayEqual(a.samples, b.samples)
		);
	}
}
