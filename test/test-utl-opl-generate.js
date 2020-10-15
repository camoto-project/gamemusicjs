/*
 * Tests for utl-opl-parse.js.
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

describe('generateOPL() tests', function() {

	const trackConfig = [
		new Music.TrackConfiguration({
			channelType: Music.ChannelType.OPLT,
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
			for (const ev of events) ev.custom.idxTrack = 0;
			const { oplData } = UtilOPL.generateOPL(events, [], trackConfig);

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
			for (const ev of events) ev.custom.idxTrack = 0;
			const { oplData } = UtilOPL.generateOPL(events, [], trackConfig);

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
		for (const ev of events) ev.custom.idxTrack = 0;
		const { oplData } = UtilOPL.generateOPL(events, [], trackConfig);

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
		for (const ev of events) ev.custom.idxTrack = 0;
		const { oplData } = UtilOPL.generateOPL(events, [], trackConfig);

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

	it('should handle NoteOnEvent/NoteOffEvent', function() {
		const events = [
			new Music.TempoEvent({ usPerTick: 1000 }),
			new Music.NoteOnEvent({
				frequency: 440,
				velocity: 1,
				instrument: 0,
			}),
			new Music.DelayEvent({ticks: 10}),
			new Music.NoteOffEvent(),
			// No delay
			new Music.NoteOnEvent({
				frequency: 220,
				velocity: 1,
				instrument: 0,
			}),
			new Music.DelayEvent({ticks: 20}),
			new Music.NoteOffEvent(),
			new Music.DelayEvent({ticks: 40}),
			new Music.NoteOnEvent({
				frequency: 110,
				velocity: 1,
				instrument: 0,
			}),
			new Music.DelayEvent({ticks: 80}),
			new Music.NoteOffEvent(),
		];
		for (const ev of events) ev.custom.idxTrack = 0;
		const { oplData } = UtilOPL.generateOPL(events, [], trackConfig);

		assert.equal(oplData[0].tempo.usPerTick, 1000, 'Wrong tempo value');

		// Because there's no delay between the pitch (0xA0) and noteon (0xB0),
		// they can come in in any order.
		function checkNoteOn(reg) {
			assert.equal(typeof reg, 'number');
			assert.ok([0xA0, 0xB0].includes(reg),
				`Wrong registers for NoteOnEvent (exp 0xA0/0xB0, got 0x${reg.toString(16)})`);
		}
		checkNoteOn(oplData[1].reg);
		checkNoteOn(oplData[2].reg);

		assert.equal(oplData[3].delay, 10, 'Wrong delay');

		// NoteOff and next NoteOn happen at the same time
		checkNoteOn(oplData[4].reg);
		checkNoteOn(oplData[5].reg);
		checkNoteOn(oplData[6].reg);

		assert.equal(oplData[7].delay, 20, 'Wrong delay');

		assert.equal(oplData[8].reg, 0xB0, 'Wrong register for NoteOffEvent');

		assert.equal(oplData[9].delay, 40, 'Wrong delay');

		checkNoteOn(oplData[10].reg);
		checkNoteOn(oplData[11].reg);

		assert.equal(oplData[12].delay, 80, 'Wrong delay');

		assert.equal(oplData[13].reg, 0xB0, 'Wrong register for NoteOffEvent');
	});

	it('should handle 2-op patches', function() {
		const patches = [
			new Music.Patch.OPL({
				slot: [
					{
						enableTremolo: true,
						enableVibrato: false,
						enableSustain: true,
						enableKSR: false,
						waveSelect: 1,
						freqMult: 2,
						scaleLevel: 3,
						outputLevel: 4,
						attackRate: 5,
						decayRate: 6,
						sustainRate: 7,
						releaseRate: 8,
					}, {
						enableTremolo: false,
						enableVibrato: true,
						enableSustain: false,
						enableKSR: true,
						waveSelect: 2,
						freqMult: 3,
						scaleLevel: 2,
						outputLevel: 5,
						attackRate: 6,
						decayRate: 7,
						sustainRate: 8,
						releaseRate: 9,
					},
				],
				feedback: 2,
				connection: 1,
				rhythm: 0,
			}),
		];

		const events = [
			new Music.TempoEvent({ usPerTick: 1000 }),
			new Music.NoteOnEvent({
				frequency: 440,
				velocity: 1,
				instrument: 0,
			}),
		];
		for (const ev of events) ev.custom.idxTrack = 0;
		const { oplData } = UtilOPL.generateOPL(events, patches, trackConfig);

		let oplState = [];
		function advanceToNextDelay() {
			oplData.shift(); // discard oplData[0] we looked at before this function
			while (oplData[0] && (oplData[0].reg !== undefined)) {
				const o = oplData.shift();
				oplState[o.reg] = o.val;
			}
		}

		advanceToNextDelay();

		assert.equal(oplState[0xB0] & 0x20, 0x20, 'Keyon missing');
		assert.equal(oplState[0x20] & 0x80, 0x80, 'slot[0].enableTremolo incorrect');
		assert.equal(oplState[0x23] & 0x80, 0x00, 'slot[1].enableTremolo incorrect');
		assert.equal(oplState[0x20] & 0x40, 0x00, 'slot[0].enableVibrato incorrect');
		assert.equal(oplState[0x23] & 0x40, 0x40, 'slot[1].enableVibrato incorrect');
		assert.equal(oplState[0x20] & 0x20, 0x20, 'slot[0].enableSustain incorrect');
		assert.equal(oplState[0x23] & 0x20, 0x00, 'slot[1].enableSustain incorrect');
		assert.equal(oplState[0x20] & 0x10, 0x00, 'slot[0].enableKSR incorrect');
		assert.equal(oplState[0x23] & 0x10, 0x10, 'slot[1].enableKSR incorrect');
		assert.equal(oplState[0x20] & 0x0F, 0x02, 'slot[0].freqMult incorrect');
		assert.equal(oplState[0x23] & 0x0F, 0x03, 'slot[1].freqMult incorrect');

		assert.equal(oplState[0x40] & 0xC0, 3 << 6, 'slot[0].scaleLevel incorrect');
		assert.equal(oplState[0x43] & 0xC0, 2 << 6, 'slot[1].scaleLevel incorrect');
		assert.equal(oplState[0x40] & 0x3F, 4, 'slot[0].outputLevel incorrect');
		assert.equal(oplState[0x43] & 0x3F, 5, 'slot[1].outputLevel incorrect');

		assert.equal(oplState[0x60] & 0xF0, 5 << 4, 'slot[0].attackRate incorrect');
		assert.equal(oplState[0x63] & 0xF0, 6 << 4, 'slot[1].attackRate incorrect');
		assert.equal(oplState[0x60] & 0x0F, 6, 'slot[0].decayRate incorrect');
		assert.equal(oplState[0x63] & 0x0F, 7, 'slot[1].decayRate incorrect');

		assert.equal(oplState[0x80] & 0xF0, 7 << 4, 'slot[0].sustainRate incorrect');
		assert.equal(oplState[0x83] & 0xF0, 8 << 4, 'slot[1].sustainRate incorrect');
		assert.equal(oplState[0x80] & 0x0F, 8, 'slot[0].releaseRate incorrect');
		assert.equal(oplState[0x83] & 0x0F, 9, 'slot[1].releaseRate incorrect');

		assert.equal(oplState[0xE0] & 0x07, 1, 'slot[0].waveSelect incorrect');
		assert.equal(oplState[0xE3] & 0x07, 2, 'slot[1].waveSelect incorrect');

		assert.equal(oplState[0xC0] & 0x01, 1, 'patch.connection incorrect');
		assert.equal(oplState[0xC0] & 0x0E, 2 << 1, 'patch.feedback incorrect');
	});

}); // generateOPL() tests
