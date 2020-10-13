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
			for (const ev of events) ev.custom.idxTrack = 0;
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
			for (const ev of events) ev.custom.idxTrack = 0;
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
		for (const ev of events) ev.custom.idxTrack = 0;
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
		for (const ev of events) ev.custom.idxTrack = 0;
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
		const oplData = UtilOPL.generateOPL(events, trackConfig);

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

}); // generateOPL() tests
