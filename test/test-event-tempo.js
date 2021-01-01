/*
 * Tests for event-tempo.js.
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

const TestUtil = require('./util.js');
const Music = require('../src/music.js');

describe(`TempoEvent tests`, function() {

	function runTest(field, value, usPerTick, extras) {
		it(`${field} -> usPerTick`, function() {
			let t = new Music.TempoEvent({
				...extras,
				[field]: value,
			});
			TestUtil.almostEqual(t.usPerTick, usPerTick, 0.01);
		});

		it(`usPerTick -> ${field}`, function() {
			let t = new Music.TempoEvent({
				...extras,
				usPerTick: usPerTick,
			});
			TestUtil.almostEqual(t[field], value, 0.01);
		});
	}

	runTest('bpm', 120, 10416.66, {});
	runTest('bpm', 144, 8680.55, {});

	it('.bpm throws on out of range values', function() {
		function t() {
			new Music.TempoEvent({
				bpm: 0,
			});
		}
		assert.throws(t, Error);
	});

	runTest('usPerQuarterNote', 500000, 10416.66666, {});
	runTest('usPerQuarterNote', 300000, 6250, {});

	it('.usPerQuarterNote throws on out of range values', function() {
		function t() {
			new Music.TempoEvent({
				usPerQuarterNote: 0,
			});
		}
		assert.throws(t, Error);
	});

	runTest('hertz', 560, 1785.71, {});
	runTest('hertz', 700, 1428.57, {});

	it('.hertz throws on out of range values', function() {
		function t() {
			new Music.TempoEvent({
				hertz: 0,
			});
		}
		assert.throws(t, Error);
	});

	runTest('module', { speed: 6, tempo: 120 }, 125000, {});
	runTest('module', { speed: 4, tempo: 100 }, 100000, {});

	it('.module throws on out of range values', function() {
		function t() {
			new Music.TempoEvent({
				module: { speed: 6, tempo: 0 },
			});
		}
		assert.throws(t, Error);
	});

}); // TempoEvent tests
