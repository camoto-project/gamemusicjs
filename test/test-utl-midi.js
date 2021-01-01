/*
 * Tests for utl-midi.js.
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

const assert = require('assert');

const UtilMIDI = require('../src/utl-midi.js');

const TestUtil = require('./util.js');

describe(`UtilMIDI tests`, function() {

	describe('midiToFrequency()', function() {
		it('various values are converted correctly', function() {
			TestUtil.almostEqual(UtilMIDI.midiToFrequency(  0),     8.175);
			TestUtil.almostEqual(UtilMIDI.midiToFrequency(  1),     8.661);
			TestUtil.almostEqual(UtilMIDI.midiToFrequency( 45),   110.000);
			TestUtil.almostEqual(UtilMIDI.midiToFrequency( 57),   220.000);
			TestUtil.almostEqual(UtilMIDI.midiToFrequency( 69),   440.000);
			TestUtil.almostEqual(UtilMIDI.midiToFrequency( 93),  1760.000);
			TestUtil.almostEqual(UtilMIDI.midiToFrequency(117),  7040.000);
			TestUtil.almostEqual(UtilMIDI.midiToFrequency(123),  9956.063);
			TestUtil.almostEqual(UtilMIDI.midiToFrequency(127), 12543.853);
		});
	}); // midiToFrequency()

	describe('frequencyToMIDI()', function() {
		it('various values are converted correctly', function() {
			const check_freq = (freq, note, bend) => {
				const r = UtilMIDI.frequencyToMIDIBend(freq, undefined);
				assert.equal(r.note, note);
				assert.equal(r.bend, 8192 + bend);
			};
			check_freq(    8.175,   0, +0);
			check_freq(    8.661,   1, -8);
			check_freq(  110.000,  45, +0);
			check_freq(  220.000,  57, +0);
			check_freq(  440.000,  69, +0);
			check_freq( 1760.000,  93, +0);
			check_freq( 7040.000, 117, +0);
			check_freq( 9956.063, 123, +0);
			check_freq(12543.853, 127, +0);
		});
	}); // frequencyToMIDI()

}); // UtilMIDI tests
