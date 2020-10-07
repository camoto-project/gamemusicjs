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

const defaultTempo = new Music.TempoEvent({usPerTick: 1000});

describe(`UtilOPL tests`, function() {

	describe('parseOPL()', function() {

		it('should handle WaveSel register 0x01', function() {
			const events = UtilOPL.parseOPL([
				{reg: 0x01, val: 0x20},
				{delay: 10},
				{reg: 0x01, val: 0x21},
				{delay: 10},
				{reg: 0x01, val: 0x01},
				{delay: 10},
				{reg: 0x01, val: 0x00},
				{delay: 10},
			], defaultTempo).events;

			assert.ok(events[0]);
			assert.equal(events[0].usPerTick, 1000, 'Wrong tempo');

			assert.ok(events[1]);
			assert.equal(events[1].type, 'ConfigurationEvent', 'Wrong event type');
			assert.equal(events[1].option, Music.ConfigurationEvent.Option.EnableWaveSel, 'Wrong ConfigurationEvent option');
			assert.equal(events[1].value, true, 'Wrong ConfigurationEvent value');

			assert.ok(events[2]);
			assert.equal(events[2].ticks, 10 + 10, 'Wrong delay value');

			assert.ok(events[3]);
			assert.equal(events[3].type, 'ConfigurationEvent', 'Wrong event type');
			assert.equal(events[3].option, Music.ConfigurationEvent.Option.EnableWaveSel, 'Wrong ConfigurationEvent option');
			assert.equal(events[3].value, false, 'Wrong ConfigurationEvent value');

			assert.ok(events[4]);
			assert.equal(events[4].ticks, 10 + 10, 'Wrong delay value');

			assert.equal(events.length, 5, 'Incorrect number of events produced');
		});

		it('should handle OPL3 enabling register 0x105', function() {
			const events = UtilOPL.parseOPL([
				{reg: 0x105, val: 0x01},
				{delay: 10},
				{reg: 0x105, val: 0x00},
			], defaultTempo).events;

			assert.ok(events[1]);
			assert.equal(events[1].type, 'ConfigurationEvent', 'Wrong event type');
			assert.equal(events[1].option, Music.ConfigurationEvent.Option.EnableOPL3, 'Wrong ConfigurationEvent option');
			assert.equal(events[1].value, true, 'Wrong ConfigurationEvent value');

			assert.ok(events[2]);
			assert.equal(events[2].ticks, 10, 'Wrong delay value');

			assert.ok(events[3]);
			assert.equal(events[3].type, 'ConfigurationEvent', 'Wrong event type');
			assert.equal(events[3].option, Music.ConfigurationEvent.Option.EnableOPL3, 'Wrong ConfigurationEvent option');
			assert.equal(events[3].value, false, 'Wrong ConfigurationEvent value');

			assert.equal(events.length, 4, 'Incorrect number of events produced');
		});

		it('should handle melodic notes', function() {
			const events = UtilOPL.parseOPL([
				{reg: 0x20, val: 0x55},
				{reg: 0x40, val: 0xAA},
				{reg: 0x60, val: 0x55},
				{reg: 0x80, val: 0xAA},
				{reg: 0xA0, val: 0x5A},
				{reg: 0xC0, val: 0x35},
				{reg: 0xB0, val: 0x38},
				{delay: 10},
				{reg: 0xB0, val: 0x18},
			], defaultTempo).events;

			assert.ok(events[1]);
			assert.equal(events[1].type, 'NoteOnEvent', 'Wrong event type');
			TestUtil.almostEqual(events[1].freq, 169.928);
			TestUtil.almostEqual(events[1].velocity, 1);

			assert.ok(events[2]);
			assert.equal(events[2].ticks, 10, 'Wrong delay value');

			assert.ok(events[3]);
			assert.equal(events[3].type, 'NoteOffEvent', 'Wrong event type');

			assert.equal(events.length, 4, 'Incorrect number of events produced');
		});

		it('should handle tempo changes', function() {
			const events = UtilOPL.parseOPL([
				{reg: 0x01, val: 0x20},
				{delay: 10},
				{tempo: new Music.TempoEvent({usPerTick: 2000})},
				{reg: 0x01, val: 0x21}, // no-op
				{delay: 20},
				{tempo: new Music.TempoEvent({usPerTick: 3000})},
				{delay: 30},
				{tempo: new Music.TempoEvent({usPerTick: 4000})},
			], defaultTempo).events;

			assert.ok(events[0]);
			assert.equal(events[0].type, 'TempoEvent', 'Wrong event type');
			assert.equal(events[0].usPerTick, 1000, 'Wrong tempo value');

			assert.ok(events[3]);
			assert.equal(events[3].type, 'TempoEvent', 'Wrong event type');
			assert.equal(events[3].usPerTick, 2000, 'Wrong tempo value');

			assert.ok(events[5]);
			assert.equal(events[5].type, 'TempoEvent', 'Wrong event type');
			assert.equal(events[5].usPerTick, 3000, 'Wrong tempo value');

			assert.ok(events[6]);
			assert.equal(events[6].ticks, 30, 'Wrong delay value');

			assert.ok(events[7]);
			assert.equal(events[7].type, 'TempoEvent', 'Wrong event type');
			assert.equal(events[7].usPerTick, 4000, 'Wrong tempo value');

			assert.equal(events.length, 8, 'Incorrect number of events produced');
		});

	}); // parseOPL()

	describe('generateOPL()', function() {

		const trackConfig = [
			new Music.TrackConfiguration({
				channelType: Music.ChannelType.OPL,
				channelIndex: 0,
			}),
		];

		describe('should handle ConfigurationEvent', function() {
			it('should handle EnableWaveSel', function() {
				const events = [
					new Music.ConfigurationEvent({
						option: Music.ConfigurationEvent.Option.EnableWaveSel,
						value: true,
					}),
					new Music.DelayEvent({ticks: 10}),
					new Music.ConfigurationEvent({
						option: Music.ConfigurationEvent.Option.EnableWaveSel,
						value: false,
					}),
					new Music.DelayEvent({ticks: 10}),
					new Music.ConfigurationEvent({
						option: Music.ConfigurationEvent.Option.EnableWaveSel,
						value: false,
					}),
					new Music.DelayEvent({ticks: 10}),
				];
				for (const ev of events) ev.idxTrack = 0;
				const oplData = UtilOPL.generateOPL(events, trackConfig);

				assert.equal(oplData.length, 4, 'Incorrect number of register writes produced');

				assert.equal(oplData[0].reg, 0x01, 'Wrong register');
				assert.equal(oplData[0].val, 0x20, 'Wrong value');

				assert.equal(oplData[1].delay, 10, 'Wrong delay');

				assert.equal(oplData[2].reg, 0x01, 'Wrong register');
				assert.equal(oplData[2].val, 0x00, 'Wrong value');

				assert.equal(oplData[3].delay, 20, 'Wrong delay');
			});

			it('should handle EnableOPL3', function() {
				const events = [
					new Music.ConfigurationEvent({
						option: Music.ConfigurationEvent.Option.EnableOPL3,
						value: true,
					}),
					new Music.DelayEvent({ticks: 10}),
					new Music.ConfigurationEvent({
						option: Music.ConfigurationEvent.Option.EnableOPL3,
						value: false,
					}),
				];
				for (const ev of events) ev.idxTrack = 0;
				const oplData = UtilOPL.generateOPL(events, trackConfig);

				assert.equal(oplData.length, 3, 'Incorrect number of register writes produced');

				assert.equal(oplData[0].reg, 0x105, 'Wrong register');
				assert.equal(oplData[0].val, 0x01, 'Wrong value');

				assert.equal(oplData[1].delay, 10, 'Wrong delay');

				assert.equal(oplData[2].reg, 0x105, 'Wrong register');
				assert.equal(oplData[2].val, 0x00, 'Wrong value');
			});
		});

		it('should handle DelayEvent', function() {
			const events = [
				new Music.ConfigurationEvent({
					option: Music.ConfigurationEvent.Option.EnableWaveSel,
					value: true,
				}),
				new Music.DelayEvent({ticks: 10}),
				new Music.ConfigurationEvent({
					option: Music.ConfigurationEvent.Option.EnableWaveSel,
					value: false,
				}),
				new Music.DelayEvent({ticks: 20}),
				new Music.ConfigurationEvent({
					option: Music.ConfigurationEvent.Option.EnableWaveSel,
					value: false,
				}),
				new Music.DelayEvent({ticks: 30}),
			];
			for (const ev of events) ev.idxTrack = 0;
			const oplData = UtilOPL.generateOPL(events, trackConfig);

			// First delay should be unchanged.
			assert.equal(oplData[1].delay, 10, 'Wrong delay');

			// Second delay should be merged.
			assert.equal(oplData[3].delay, 20 + 30, 'Wrong delay');
		});

		it('should handle TempoEvent', function() {
			const events = [
				new Music.TempoEvent({ usPerTick: 1000 }),
				new Music.ConfigurationEvent({
					option: Music.ConfigurationEvent.Option.EnableWaveSel,
					value: true,
				}),
				new Music.DelayEvent({ticks: 10}),
				new Music.ConfigurationEvent({
					option: Music.ConfigurationEvent.Option.EnableWaveSel,
					value: false,
				}),
				// Do a tempo event with no delay-merging.
				new Music.TempoEvent({ usPerTick: 2000 }),
				new Music.DelayEvent({ticks: 20}),
				new Music.ConfigurationEvent({
					option: Music.ConfigurationEvent.Option.EnableWaveSel,
					value: true,
				}),
				// Do a tempo event between delays to ensure they don't get merged.
				new Music.DelayEvent({ticks: 30}),
				new Music.TempoEvent({ usPerTick: 3000 }),
				new Music.DelayEvent({ticks: 40}),
				new Music.ConfigurationEvent({
					option: Music.ConfigurationEvent.Option.EnableWaveSel,
					value: false,
				}),
			];
			for (const ev of events) ev.idxTrack = 0;
			const oplData = UtilOPL.generateOPL(events, trackConfig);

			assert.equal(oplData[0].tempo.usPerTick, 1000, 'Wrong tempo value');
			assert.equal(oplData[2].delay, 10, 'Wrong delay');

			// Because there's no delay between the TempoEvent and the
			// ConfigurationEvent, they can come in in any order.
			const tempo34 = oplData[3].tempo || oplData[4].tempo;
			assert.equal(tempo34.usPerTick, 2000, 'Wrong tempo value');

			assert.equal(oplData[5].delay, 20, 'Wrong delay');
			assert.equal(oplData[7].delay, 30, 'Wrong delay');
			assert.equal(oplData[8].tempo.usPerTick, 3000, 'Wrong tempo value');
			assert.equal(oplData[9].delay, 40, 'Wrong delay');
		});

	}); // generateOPL()

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

	describe('comparePatch()', function() {
		it('modulator-only instruments are matched', function() {
			const a = {
				mod: {
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
				feedback: 3,
				connection: 1,
			};

			// Same as above, with some entries overridden with the same value.
			// This confirms overriding values doesn't break anything.
			const a2 = {
				...a,
				mod: {
					...a.mod,
					scaleLevel: 3,
				},
				feedback: 3,
			};

			// As above with a change to the modulator only.
			// All changes have been tested in `a2` to show overriding these elements
			// isn't the cause of the problem.
			const x1 = {
				...a,
				mod: {
					...a.mod,
					scaleLevel: 4,
				},
				feedback: 3,
			};

			// As with `x1` but with the difference outside the OPL operator.
			const x2 = {
				...a,
				mod: {
					...a.mod,
				},
				feedback: 2,
			};

			// As with `x1` but comparing against a modulator-only patch.
			const x3 = {
				...a,
				mod: {
					...a.car,
				},
			};

			// As with `x1` but comparing against a two-operator patch where the
			// carrier matches this patch, but the modulator is additional.
			const x4 = {
				...a,
				car: {
					...a.car,
				},
				mod: {
					...a.car,
				},
			};

			assert.ok(UtilOPL.comparePatch(a, a));
			assert.ok(UtilOPL.comparePatch(a, a2));

			assert.ok(!UtilOPL.comparePatch(a, x1));
			assert.ok(!UtilOPL.comparePatch(a, x2));
			assert.ok(!UtilOPL.comparePatch(a, x3));
			assert.ok(!UtilOPL.comparePatch(a, x4));
		});

		it('carrier-only instruments are matched', function() {
			const a = {
				car: {
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
				feedback: 3,
				connection: 1,
			};

			// Same as above, with some entries overridden with the same value.
			// This confirms overriding values doesn't break anything.
			const a2 = {
				...a,
				car: {
					...a.car,
					scaleLevel: 3,
				},
				feedback: 3,
			};

			// As above with a change to the carrier only.
			// All changes have been tested in `a2` to show overriding these elements
			// isn't the cause of the problem.
			const x1 = {
				...a,
				car: {
					...a.car,
					scaleLevel: 4,
				},
				feedback: 3,
			};

			// As with `x1` but with the difference outside the OPL operator.
			const x2 = {
				...a,
				car: {
					...a.car,
				},
				feedback: 2,
			};

			// As with `x1` but comparing against a modulator-only patch.
			const x3 = {
				...a,
				car: undefined,
				mod: {
					...a.car,
				},
			};

			// As with `x1` but comparing against a two-operator patch where the
			// carrier matches this patch, but the modulator is additional.
			const x4 = {
				...a,
				car: {
					...a.car,
				},
				mod: {
					...a.car,
				},
			};

			assert.ok(UtilOPL.comparePatch(a, a));
			assert.ok(UtilOPL.comparePatch(a, a2));

			assert.ok(!UtilOPL.comparePatch(a, x1));
			assert.ok(!UtilOPL.comparePatch(a, x2));
			assert.ok(!UtilOPL.comparePatch(a, x3));
			assert.ok(!UtilOPL.comparePatch(a, x4));
		});

		it('two-operator instruments are matched', function() {
			const a = {
				mod: {
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
				car: {
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
				feedback: 4,
				connection: 0,
			};

			// Same as above, with some entries overridden with the same value.
			// This confirms overriding values doesn't break anything.
			const a2 = {
				...a,
				mod: {
					...a.mod,
					outputLevel: 4,
				},
				car: {
					...a.car,
					attackRate: 6,
				},
				feedback: 4,
			};

			// As above with a change to the modulator only.
			// All changes have been tested in `a2` to show overriding these elements
			// isn't the cause of the problem.
			const x1 = {
				...a,
				mod: {
					...a.mod,
					outputLevel: 3,
				},
				car: {
					...a.car,
					attackRate: 5,
				},
				feedback: 4,
			};

			// As with `x1` but for carrier only.
			const x2 = {
				...a,
				mod: {
					...a.mod,
					outputLevel: 4,
				},
				car: {
					...a.car,
					attackRate: 7,
				},
				feedback: 4,
			};

			// As with `x1` but with the difference outside the OPL operator.
			const x3 = {
				...a,
				mod: {
					...a.mod,
				},
				car: {
					...a.car,
				},
				feedback: 2,
			};

			assert.ok(UtilOPL.comparePatch(a, a));
			assert.ok(UtilOPL.comparePatch(a, a2));

			assert.ok(!UtilOPL.comparePatch(a, x1));
			assert.ok(!UtilOPL.comparePatch(a, x2));
			assert.ok(!UtilOPL.comparePatch(a, x3));
		});
	}); // velocityToOutputLevel()

}); // UtilOPL tetss
