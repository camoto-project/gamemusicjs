/*
 * Tests for utl-opl.js.
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

const assert = require('assert');

const Music = require('../src/music.js');
const UtilOPL = require('../src/utl-opl.js');

const TestUtil = require('./util.js');

describe(`UtilOPL tests`, function() {

	describe('fnumToFrequency()', function() {
		it('various values are converted correctly', function() {
			TestUtil.almostEqual(UtilOPL.fnumToFrequency( 545, 1, 49716),   51.680);

			TestUtil.almostEqual(UtilOPL.fnumToFrequency( 128, 2, 49716),   24.275);
			TestUtil.almostEqual(UtilOPL.fnumToFrequency( 128, 5, 49716),  194.203);

			TestUtil.almostEqual(UtilOPL.fnumToFrequency(1023, 1, 49716),   97.006);
			TestUtil.almostEqual(UtilOPL.fnumToFrequency(1023, 2, 49716),  194.013);
			TestUtil.almostEqual(UtilOPL.fnumToFrequency(1023, 7, 49716), 6208.431);

			TestUtil.almostEqual(UtilOPL.fnumToFrequency(580, 4, 49716),  439.991);
		});
	}); // fnumToFrequency()

	describe('frequencyToFnum()', function() {
		it('various values are converted correctly', function() {
			const check = (freq, fnum, block, clip) => {
				const r = UtilOPL.frequencyToFnum(freq, block, 49716);
				assert.equal(r.fnum, fnum);
				assert.equal(r.block, block);
				assert.equal(r.clip, clip);
			};
			check(  51.680,  545, 1, false);

			check(  24.275,  256, 1, false);
			check( 194.203,  512, 3, false);

			check(  97.006,  256, 3, false);
			check( 193.820,  511, 3, false);
			check(6208.431, 1023, 7, false);

			check(6209.431, 1023, 7, true);

			check( 439.991, 580, 4, false);
		});
	}); // frequencyToFnum()

	describe('outputLevelToVelocity()', function() {
		it('various values are converted correctly', function() {
			TestUtil.almostEqual(UtilOPL.log_volume_to_lin_velocity(  0,  15), 0.0);
			TestUtil.almostEqual(UtilOPL.log_volume_to_lin_velocity(  8,  15), 0.25);
			TestUtil.almostEqual(UtilOPL.log_volume_to_lin_velocity( 15,  15), 1.0);

			TestUtil.almostEqual(UtilOPL.log_volume_to_lin_velocity(  0, 127), 0.0);
			TestUtil.almostEqual(UtilOPL.log_volume_to_lin_velocity( 63, 127), 0.1397);
			TestUtil.almostEqual(UtilOPL.log_volume_to_lin_velocity(127, 127), 1.0);
		});
	}); // outputLevelToVelocity()

	describe('velocityToOutputLevel()', function() {
		it('various values are converted correctly', function() {
			TestUtil.almostEqual(UtilOPL.lin_velocity_to_log_volume(0.00, 15),   0);
			TestUtil.almostEqual(UtilOPL.lin_velocity_to_log_volume(0.25, 15),   8);
			TestUtil.almostEqual(UtilOPL.lin_velocity_to_log_volume(1.00, 15),  15);

			TestUtil.almostEqual(UtilOPL.lin_velocity_to_log_volume(0.0000, 127),   0);
			TestUtil.almostEqual(UtilOPL.lin_velocity_to_log_volume(0.1397, 127),  63);
			TestUtil.almostEqual(UtilOPL.lin_velocity_to_log_volume(1.0000, 127), 127);
		});
	}); // velocityToOutputLevel()

	describe('oplOperatorOffset()', function() {
		it('various values are converted correctly', function() {
			// (channel, slot), operatorOffset
			assert.equal(UtilOPL.oplOperatorOffset(0, 0), 0x00);
			assert.equal(UtilOPL.oplOperatorOffset(4, 0), 0x09);
			assert.equal(UtilOPL.oplOperatorOffset(8, 0), 0x12);

			assert.equal(UtilOPL.oplOperatorOffset(0, 1), 0x03);
			assert.equal(UtilOPL.oplOperatorOffset(4, 1), 0x0C);
			assert.equal(UtilOPL.oplOperatorOffset(8, 1), 0x15);

			assert.equal(UtilOPL.oplOperatorOffset(0, 2), 0x08);
			assert.equal(UtilOPL.oplOperatorOffset(1, 2), 0x09);
			assert.equal(UtilOPL.oplOperatorOffset(2, 2), 0x0A);

			assert.equal(UtilOPL.oplOperatorOffset(0, 3), 0x0B);
			assert.equal(UtilOPL.oplOperatorOffset(1, 3), 0x0C);
			assert.equal(UtilOPL.oplOperatorOffset(2, 3), 0x0D);

			assert.equal(UtilOPL.oplOperatorOffset(9, 0), 0x100);
			assert.equal(UtilOPL.oplOperatorOffset(13, 0), 0x109);
			assert.equal(UtilOPL.oplOperatorOffset(17, 0), 0x112);

			assert.equal(UtilOPL.oplOperatorOffset(9, 1), 0x103);
			assert.equal(UtilOPL.oplOperatorOffset(13, 1), 0x10C);
			assert.equal(UtilOPL.oplOperatorOffset(17, 1), 0x115);

			// 4-OP
			assert.equal(UtilOPL.oplOperatorOffset(9, 2), 0x108);
			assert.equal(UtilOPL.oplOperatorOffset(10, 2), 0x109);
			assert.equal(UtilOPL.oplOperatorOffset(11, 2), 0x10A);

			assert.equal(UtilOPL.oplOperatorOffset(9, 3), 0x10B);
			assert.equal(UtilOPL.oplOperatorOffset(10, 3), 0x10C);
			assert.equal(UtilOPL.oplOperatorOffset(11, 3), 0x10D);

		});
	}); // velocityToOutputLevel()

	describe('PatchOPL.equalTo()', function() {
		it('single-operator instruments are matched', function() {
			const a = new Music.Patch.OPL({
				slot: [
					{
						enableTremolo: 1,
						enableVibrato: 1,
						enableSustain: 1,
						enableKSR: 0,
						freqMult: 2,
						scaleLevel: 3,
						outputLevel: 4,
						attackRate: 5,
						decayRate: 6,
						sustainRate: 7,
						releaseRate: 8,
						waveSelect: 9,
					},
				],
				feedback: 3,
				connection: 1,
				rhythm: 0,
			});

			// Same as above, with some entries overridden with the same value.
			// This confirms overriding values doesn't break anything.
			let a2 = a.clone();
			a2.slot[0].scaleLevel = 3;
			a2.feedback = 3;

			// As above with a change to the modulator only.
			// All changes have been tested in `a2` to show overriding these elements
			// isn't the cause of the problem.
			let x1 = a.clone();
			x1.slot[0].scaleLevel = 4;
			x1.feedback = 3;

			// As with `x1` but with the difference outside the OPL operator.
			let x2 = a.clone();
			x2.feedback = 2;

			// As with `x1` but comparing against a modulator-only patch.
			let x3 = a.clone();
			x3.slot[1] = x3.slot[0];
			delete x3.slot[0];

			// As with `x1` but comparing against a two-operator patch where the
			// carrier matches this patch, but the modulator is additional.
			let x4 = a.clone();
			x4.slot[1] = x4.slot[0];

			assert.ok(a.equalTo(a));
			assert.ok(a.equalTo(a2));

			assert.ok(!a.equalTo(x1));
			assert.ok(!a.equalTo(x2));
			assert.ok(!a.equalTo(x3));
			assert.ok(!a.equalTo(x4));
		});

		it('two-operator instruments are matched', function() {
			const a = new Music.Patch.OPL({
				slot: [
					{
						enableTremolo: 1,
						enableVibrato: 1,
						enableSustain: 1,
						enableKSR: 0,
						freqMult: 2,
						scaleLevel: 3,
						outputLevel: 4,
						attackRate: 5,
						decayRate: 6,
						sustainRate: 7,
						releaseRate: 8,
						waveSelect: 9,
					}, {
						enableTremolo: 1,
						enableVibrato: 0,
						enableSustain: 1,
						enableKSR: 0,
						freqMult: 3,
						scaleLevel: 4,
						outputLevel: 5,
						attackRate: 6,
						decayRate: 7,
						sustainRate: 8,
						releaseRate: 9,
						waveSelect: 10,
					},
				],
				feedback: 4,
				connection: 0,
				rhythm: 0,
			});

			// Same as above, with some entries overridden with the same value.
			// This confirms overriding values doesn't break anything.
			let a2 = a.clone();
			a2.slot[0].attackRate = 5;
			a2.slot[1].decayRate = 7;
			a2.feedback = 4;

			// As above with a change to the modulator only.
			// All changes have been tested in `a2` to show overriding these elements
			// isn't the cause of the problem.
			let x1 = a.clone();
			x1.slot[0].attackRate = 3;
			x1.slot[1].decayRate = 5;

			// As with `x1` but for carrier only.
			let x2 = a.clone();
			x2.slot[1].decayRate = 8;

			// As with `x1` but with the difference outside the OPL operator.
			let x3 = a.clone();
			x3.feedback = 2;

			assert.ok(a.equalTo(a));
			assert.ok(a.equalTo(a2));

			assert.ok(!a.equalTo(x1));
			assert.ok(!a.equalTo(x2));
			assert.ok(!a.equalTo(x3));
		});

		it('outputLevel differences are ignored in slot[0] for 1op', function() {
			const a = new Music.Patch.OPL({
				slot: [
					{
						enableTremolo: 1,
						enableVibrato: 1,
						enableSustain: 1,
						enableKSR: 0,
						freqMult: 2,
						scaleLevel: 3,
						outputLevel: 4,
						attackRate: 5,
						decayRate: 6,
						sustainRate: 7,
						releaseRate: 8,
						waveSelect: 9,
					},
				],
				feedback: 4,
				connection: 0,
				rhythm: 0,
			});

			// Operator 0 only, should be ignored.
			let a2 = a.clone();
			a2.slot[0].outputLevel = 2;

			assert.ok(a.equalTo(a));
			assert.ok(a.equalTo(a2));
		});

		it('outputLevel differences are ignored in slot[1] for 2op', function() {
			const a = new Music.Patch.OPL({
				slot: [
					{
						enableTremolo: 1,
						enableVibrato: 1,
						enableSustain: 1,
						enableKSR: 0,
						freqMult: 2,
						scaleLevel: 3,
						outputLevel: 4,
						attackRate: 5,
						decayRate: 6,
						sustainRate: 7,
						releaseRate: 8,
						waveSelect: 9,
					}, {
						enableTremolo: 1,
						enableVibrato: 0,
						enableSustain: 1,
						enableKSR: 0,
						freqMult: 3,
						scaleLevel: 4,
						outputLevel: 5,
						attackRate: 6,
						decayRate: 7,
						sustainRate: 8,
						releaseRate: 9,
						waveSelect: 10,
					},
				],
				feedback: 4,
				connection: 0,
				rhythm: 0,
			});

			// Operator 0 only, should cause mismatch.
			let a2 = a.clone();
			a2.slot[0].outputLevel = 2;

			// Operator 1 only, should be ignored.
			let a3 = a.clone();
			a3.slot[1].outputLevel = 2;

			assert.ok(a.equalTo(a));
			assert.ok(!a.equalTo(a2));
			assert.ok(a.equalTo(a3));
		});

	}); // Patch.equalTo()

}); // UtilOPL tests
