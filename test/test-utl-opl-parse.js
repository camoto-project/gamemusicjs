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

const TestUtil = require('./util.js');

const defaultTempo = new Music.TempoEvent({usPerTick: 1000});

describe('parseOPL() tests', function() {

	describe('should handle global registers', function() {

		it('should handle 0x01/waveSelect', function() {
			const { events } = UtilOPL.parseOPL([
				{reg: 0x01, val: 0x20},
				{delay: 10},
				{reg: 0x01, val: 0x21},
				{delay: 10},
				{reg: 0x01, val: 0x01},
				{delay: 10},
				{reg: 0x01, val: 0x00},
				{delay: 10},
			], defaultTempo);

			assert.ok(events[0]);
			assert.equal(events[0].usPerTick, 1000, 'Wrong tempo');

			assert.ok(events[1]);
			assert.equal(events[1].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[1].option, Music.ConfigurationEvent.Option.EnableWaveSel, 'Wrong ConfigurationEvent option');
			assert.equal(events[1].value, true, 'Wrong ConfigurationEvent value');

			assert.ok(events[2]);
			assert.equal(events[2].ticks, 10 + 10, 'Wrong delay value');

			assert.ok(events[3]);
			assert.equal(events[3].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[3].option, Music.ConfigurationEvent.Option.EnableWaveSel, 'Wrong ConfigurationEvent option');
			assert.equal(events[3].value, false, 'Wrong ConfigurationEvent value');

			assert.ok(events[4]);
			assert.equal(events[4].ticks, 10 + 10, 'Wrong delay value');

			assert.equal(events.length, 5, 'Incorrect number of events produced');
		});

		it('should handle 0x105/enableOPL3', function() {
			const { events } = UtilOPL.parseOPL([
				{reg: 0x105, val: 0x01},
				{delay: 10},
				{reg: 0x105, val: 0x00},
			], defaultTempo);

			assert.ok(events[1]);
			assert.equal(events[1].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[1].option, Music.ConfigurationEvent.Option.EnableOPL3, 'Wrong ConfigurationEvent option');
			assert.equal(events[1].value, true, 'Wrong ConfigurationEvent value');

			assert.ok(events[2]);
			assert.equal(events[2].ticks, 10, 'Wrong delay value');

			assert.ok(events[3]);
			assert.equal(events[3].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[3].option, Music.ConfigurationEvent.Option.EnableOPL3, 'Wrong ConfigurationEvent option');
			assert.equal(events[3].value, false, 'Wrong ConfigurationEvent value');

			assert.equal(events.length, 4, 'Incorrect number of events produced');
		});

		it('should handle 0xBD/tremolo', function() {
			const { events } = UtilOPL.parseOPL([
				{reg: 0xBD, val: 0x80},
				{delay: 10},
				{reg: 0xBD, val: 0x00},
			], defaultTempo);

			assert.ok(events[1]);
			assert.equal(events[1].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[1].option, Music.ConfigurationEvent.Option.EnableDeepTremolo, 'Wrong ConfigurationEvent option');
			assert.equal(events[1].value, true, 'Wrong ConfigurationEvent value');

			assert.ok(events[2]);
			assert.equal(events[2].ticks, 10, 'Wrong delay value');

			assert.ok(events[3]);
			assert.equal(events[3].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[3].option, Music.ConfigurationEvent.Option.EnableDeepTremolo, 'Wrong ConfigurationEvent option');
			assert.equal(events[3].value, false, 'Wrong ConfigurationEvent value');

			assert.equal(events.length, 4, 'Incorrect number of events produced');
		});

		it('should handle 0xBD/vibrato', function() {
			const { events } = UtilOPL.parseOPL([
				{reg: 0xBD, val: 0x40},
				{delay: 10},
				{reg: 0xBD, val: 0x00},
			], defaultTempo);

			assert.ok(events[1]);
			assert.equal(events[1].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[1].option, Music.ConfigurationEvent.Option.EnableDeepVibrato, 'Wrong ConfigurationEvent option');
			assert.equal(events[1].value, true, 'Wrong ConfigurationEvent value');

			assert.ok(events[2]);
			assert.equal(events[2].ticks, 10, 'Wrong delay value');

			assert.ok(events[3]);
			assert.equal(events[3].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[3].option, Music.ConfigurationEvent.Option.EnableDeepVibrato, 'Wrong ConfigurationEvent option');
			assert.equal(events[3].value, false, 'Wrong ConfigurationEvent value');

			assert.equal(events.length, 4, 'Incorrect number of events produced');
		});

		it('should handle 0xBD/rhythm', function() {
			const { events } = UtilOPL.parseOPL([
				{reg: 0xBD, val: 0x20},
				{delay: 10},
				{reg: 0xBD, val: 0x00},
			], defaultTempo);

			assert.ok(events[1]);
			assert.equal(events[1].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[1].option, Music.ConfigurationEvent.Option.EnableRhythm, 'Wrong ConfigurationEvent option');
			assert.equal(events[1].value, true, 'Wrong ConfigurationEvent value');

			assert.ok(events[2]);
			assert.equal(events[2].ticks, 10, 'Wrong delay value');

			assert.ok(events[3]);
			assert.equal(events[3].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[3].option, Music.ConfigurationEvent.Option.EnableRhythm, 'Wrong ConfigurationEvent option');
			assert.equal(events[3].value, false, 'Wrong ConfigurationEvent value');

			assert.equal(events.length, 4, 'Incorrect number of events produced');
		});

	}); // global registers

	describe('should handle OPL patches', function() {

		describe('should handle operator/slot registers', function() {

			it('should handle 0x20/tremolo', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0x7F},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].enableTremolo, 1);
				assert.equal(patches[1].slot[0].enableTremolo, 0);
			});

			it('should handle 0x20/vibrato', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xBF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].enableVibrato, 1);
				assert.equal(patches[1].slot[0].enableVibrato, 0);
			});

			it('should handle 0x20/sustain', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xDF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].enableSustain, 1);
				assert.equal(patches[1].slot[0].enableSustain, 0);
			});

			it('should handle 0x20/KSR', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xEF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].enableKSR, 1);
				assert.equal(patches[1].slot[0].enableKSR, 0);
			});

			it('should handle 0x20/mult', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xF1},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].freqMult, 0xF);
				assert.equal(patches[1].slot[0].freqMult, 0x1);
			});

			it('should handle 0x40/scaleLevel', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0x3F},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].scaleLevel, 0x3);
				assert.equal(patches[1].slot[0].scaleLevel, 0x0);
			});

			it('should handle 0x40/outputLevel', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xC0},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].outputLevel, 0x3F);
				assert.equal(patches[1].slot[0].outputLevel, 0x00);
			});

			it('should handle 0x60/attackRate', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0x1F},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].attackRate, 0xF);
				assert.equal(patches[1].slot[0].attackRate, 0x1);
			});

			it('should handle 0x60/decayRate', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xF1},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].decayRate, 0xF);
				assert.equal(patches[1].slot[0].decayRate, 0x1);
			});

			it('should handle 0x80/sustainRate', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0x1F},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].sustainRate, 0xF);
				assert.equal(patches[1].slot[0].sustainRate, 0x1);
			});

			it('should handle 0x80/releaseRate', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xF1},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].releaseRate, 0xF);
				assert.equal(patches[1].slot[0].releaseRate, 0x1);
			});

			it('should handle 0xE0/waveSelect', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xF9},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].waveSelect, 0x7);
				assert.equal(patches[1].slot[0].waveSelect, 0x1);
			});

			it('should handle chip 0/channel 0/slot 0', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x60, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x60, val: 0x1F},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].attackRate, 0xF);
				assert.equal(patches[1].slot[0].attackRate, 0x1);
			});

			it('should handle chip 0/channel 0/slot 1', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x63, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x63, val: 0x1F},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[1].attackRate, 0xF);
				assert.equal(patches[1].slot[1].attackRate, 0x1);
			});

			it('should handle chip 0/channel 1/slot 0', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x61, val: 0xFF},
					{reg: 0xB1, val: 0x3F},
					{delay: 10},
					{reg: 0xB1, val: 0x1F},
					{delay: 10},
					{reg: 0x61, val: 0x1F},
					{reg: 0xB1, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].attackRate, 0xF);
				assert.equal(patches[1].slot[0].attackRate, 0x1);
			});

			it('should handle chip 0/channel 1/slot 1', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x64, val: 0xFF},
					{reg: 0xB1, val: 0x3F},
					{delay: 10},
					{reg: 0xB1, val: 0x1F},
					{delay: 10},
					{reg: 0x64, val: 0x1F},
					{reg: 0xB1, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[1].attackRate, 0xF);
				assert.equal(patches[1].slot[1].attackRate, 0x1);
			});

			it('should handle chip 0/channel 8/slot 0', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x72, val: 0xFF},
					{reg: 0xB8, val: 0x3F},
					{delay: 10},
					{reg: 0xB8, val: 0x1F},
					{delay: 10},
					{reg: 0x72, val: 0x1F},
					{reg: 0xB8, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].attackRate, 0xF);
				assert.equal(patches[1].slot[0].attackRate, 0x1);
			});

			it('should handle chip 0/channel 8/slot 1', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x75, val: 0xFF},
					{reg: 0xB8, val: 0x3F},
					{delay: 10},
					{reg: 0xB8, val: 0x1F},
					{delay: 10},
					{reg: 0x75, val: 0x1F},
					{reg: 0xB8, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[1].attackRate, 0xF);
				assert.equal(patches[1].slot[1].attackRate, 0x1);
			});

			it('should handle chip 1/channel 0(9)/slot 0', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x105, val: 0x01},
					{reg: 0x160, val: 0xFF},
					{reg: 0x1B0, val: 0x3F},
					{delay: 10},
					{reg: 0x1B0, val: 0x1F},
					{delay: 10},
					{reg: 0x160, val: 0x1F},
					{reg: 0x1B0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].attackRate, 0xF);
				assert.equal(patches[1].slot[0].attackRate, 0x1);
			});

			it('should handle chip 1/channel 0(9)/slot 1', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x105, val: 0x01},
					{reg: 0x163, val: 0xFF},
					{reg: 0x1B0, val: 0x3F},
					{delay: 10},
					{reg: 0x1B0, val: 0x1F},
					{delay: 10},
					{reg: 0x163, val: 0x1F},
					{reg: 0x1B0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[1].attackRate, 0xF);
				assert.equal(patches[1].slot[1].attackRate, 0x1);
			});

			it('should handle chip 1/channel 1(10)/slot 0', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x105, val: 0x01},
					{reg: 0x161, val: 0xFF},
					{reg: 0x1B1, val: 0x3F},
					{delay: 10},
					{reg: 0x1B1, val: 0x1F},
					{delay: 10},
					{reg: 0x161, val: 0x1F},
					{reg: 0x1B1, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].attackRate, 0xF);
				assert.equal(patches[1].slot[0].attackRate, 0x1);
			});

			it('should handle chip 1/channel 1(10)/slot 1', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x105, val: 0x01},
					{reg: 0x164, val: 0xFF},
					{reg: 0x1B1, val: 0x3F},
					{delay: 10},
					{reg: 0x1B1, val: 0x1F},
					{delay: 10},
					{reg: 0x164, val: 0x1F},
					{reg: 0x1B1, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[1].attackRate, 0xF);
				assert.equal(patches[1].slot[1].attackRate, 0x1);
			});

			it('should handle chip 1/channel 8/slot 0', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x172, val: 0xFF},
					{reg: 0x1B8, val: 0x3F},
					{delay: 10},
					{reg: 0x1B8, val: 0x1F},
					{delay: 10},
					{reg: 0x172, val: 0x1F},
					{reg: 0x1B8, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].attackRate, 0xF);
				assert.equal(patches[1].slot[0].attackRate, 0x1);
			});

			it('should handle chip 1/channel 8(17)/slot 1', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x175, val: 0xFF},
					{reg: 0x1B8, val: 0x3F},
					{delay: 10},
					{reg: 0x1B8, val: 0x1F},
					{delay: 10},
					{reg: 0x175, val: 0x1F},
					{reg: 0x1B8, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[1].attackRate, 0xF);
				assert.equal(patches[1].slot[1].attackRate, 0x1);
			});

			it('should handle chip 0/channel 0/slot 3 (4op)', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x105, val: 0x01},
					{reg: 0x104, val: 0x01},
					{reg: 0x6B, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x6B, val: 0x1F},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[3].attackRate, 0xF);
				assert.equal(patches[1].slot[3].attackRate, 0x1);
			});

			it('should handle chip 0/channel 1/slot 2 (4op)', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x105, val: 0x01},
					{reg: 0x104, val: 0x02},
					{reg: 0x69, val: 0xFF},
					{reg: 0xB1, val: 0x3F},
					{delay: 10},
					{reg: 0xB1, val: 0x1F},
					{delay: 10},
					{reg: 0x69, val: 0x1F},
					{reg: 0xB1, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[2].attackRate, 0xF);
				assert.equal(patches[1].slot[2].attackRate, 0x1);
			});

			it('should handle chip 1/channel 0(9)/slot 3 (4op)', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x105, val: 0x01},
					{reg: 0x104, val: 0x08},
					{reg: 0x16B, val: 0xFF},
					{reg: 0x1B0, val: 0x3F},
					{delay: 10},
					{reg: 0x1B0, val: 0x1F},
					{delay: 10},
					{reg: 0x16B, val: 0x1F},
					{reg: 0x1B0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[3].attackRate, 0xF);
				assert.equal(patches[1].slot[3].attackRate, 0x1);
			});

			it('should handle chip 1/channel 2(11)/slot 0..3 (4op)', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x105, val: 0x01},
					{reg: 0x104, val: 0x20},
					{reg: 0x160 + 0x02, val: 0xFF},
					{reg: 0x160 + 0x05, val: 0xFF},
					{reg: 0x160 + 0x0A, val: 0xFF},
					{reg: 0x160 + 0x0D, val: 0xFF},
					{reg: 0x1B2, val: 0x3F},
					{delay: 10},
					{reg: 0x1B2, val: 0x1F},
					{delay: 10},
					{reg: 0x160 + 0x02, val: 0x2F},
					{reg: 0x160 + 0x05, val: 0x3F},
					{reg: 0x160 + 0x0A, val: 0x4F},
					{reg: 0x160 + 0x0D, val: 0x5F},
					{reg: 0x1B2, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].slot[0].attackRate, 0xF);
				assert.equal(patches[0].slot[1].attackRate, 0xF);
				assert.equal(patches[0].slot[2].attackRate, 0xF);
				assert.equal(patches[0].slot[3].attackRate, 0xF);
				assert.equal(patches[1].slot[0].attackRate, 0x2);
				assert.equal(patches[1].slot[1].attackRate, 0x3);
				assert.equal(patches[1].slot[2].attackRate, 0x4);
				assert.equal(patches[1].slot[3].attackRate, 0x5);
			});
		}); // should handle operator/slot registers

		describe('should handle channel registers', function() {

			it('should handle 0xC0/feedback', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xF3},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].feedback, 0x7);
				assert.equal(patches[1].feedback, 0x1);
			});

			it('should handle 0xC0/connection', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFF},
					{reg: 0xB0, val: 0x3F},
					{delay: 10},
					{reg: 0xB0, val: 0x1F},
					{delay: 10},
					{reg: 0x20, val: 0xFF},
					{reg: 0x40, val: 0xFF},
					{reg: 0x60, val: 0xFF},
					{reg: 0x80, val: 0xFF},
					{reg: 0xA0, val: 0xFF},
					{reg: 0xE0, val: 0xFF},
					{reg: 0xC0, val: 0xFE},
					{reg: 0xB0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].connection, 0x1);
				assert.equal(patches[1].connection, 0x0);
			});

			it('should handle 0xC0 (OPL3)', function() {
				const { patches } = UtilOPL.parseOPL([
					{reg: 0x120, val: 0xFF},
					{reg: 0x140, val: 0xFF},
					{reg: 0x160, val: 0xFF},
					{reg: 0x180, val: 0xFF},
					{reg: 0x1A0, val: 0xFF},
					{reg: 0x1C0, val: 0xFF},
					{reg: 0x1E0, val: 0xFF},
					{reg: 0x1B0, val: 0x3F},
					{delay: 10},
					{reg: 0x1B0, val: 0x1F},
					{delay: 10},
					{reg: 0x120, val: 0xFF},
					{reg: 0x140, val: 0xFF},
					{reg: 0x160, val: 0xFF},
					{reg: 0x180, val: 0xFF},
					{reg: 0x1A0, val: 0xFF},
					{reg: 0x1C0, val: 0xF3},
					{reg: 0x1E0, val: 0xFF},
					{reg: 0x1B0, val: 0x3F},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches[0].feedback, 0x7);
				assert.equal(patches[1].feedback, 0x1);
			});

		}); // should handle channel registers

		describe('patch handling', function() {

			it('should recognise existing patch reused', function() {
				const { patches, events } = UtilOPL.parseOPL([
					// Inst1
					{reg: 0x23, val: 0x55},
					{reg: 0x43, val: 0x55},
					{reg: 0x63, val: 0x55},
					{reg: 0x83, val: 0x55},
					{reg: 0xA3, val: 0x55},
					{reg: 0xE3, val: 0x55},
					{reg: 0xC0, val: 0x55},
					{reg: 0xB0, val: 0x25},
					{delay: 10},
					{reg: 0xB0, val: 0x05},
					{delay: 10},
					// Inst2
					{reg: 0x23, val: 0xAA},
					{reg: 0x43, val: 0xAA},
					{reg: 0x63, val: 0xAA},
					{reg: 0x83, val: 0xAA},
					{reg: 0xA3, val: 0xAA},
					{reg: 0xE3, val: 0xAA},
					{reg: 0xC0, val: 0xAA},
					{reg: 0xB0, val: 0x2A},
					{delay: 10},
					{reg: 0xB0, val: 0x0A},
					{delay: 10},
					// Inst1 again, should not be picked up as new patch
					{reg: 0x23, val: 0x55},
					{reg: 0x43, val: 0x55},
					{reg: 0x63, val: 0x55},
					{reg: 0x83, val: 0x55},
					{reg: 0xA3, val: 0x55},
					{reg: 0xE3, val: 0x55},
					{reg: 0xC0, val: 0x55},
					{reg: 0xB0, val: 0x25},
					{delay: 10},
					{reg: 0xB0, val: 0x05},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.ok(patches[1], 'Failed to supply patch 1');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches[1].channelType, Music.ChannelType.OPL);
				assert.equal(patches.length, 2, 'Wrong number of patches read');

				assert.ok(events[1], 'Missing event');
				assert.equal(events[1].type, Music.NoteOnEvent, 'Wrong event type');
				assert.equal(events[1].instrument, 0);

				assert.ok(events[5], 'Missing event');
				assert.equal(events[5].type, Music.NoteOnEvent, 'Wrong event type');
				assert.equal(events[5].instrument, 1);

				assert.ok(events[9], 'Missing event');
				assert.equal(events[9].type, Music.NoteOnEvent, 'Wrong event type');
				assert.equal(events[9].instrument, 0);
			});

			it('should ignore outputLevel and use it as velocity', function() {
				const { patches, events } = UtilOPL.parseOPL([
					{reg: 0x23, val: 0x55},
					{reg: 0x43, val: 0xC0}, // outputLevel=0
					{reg: 0x63, val: 0x55},
					{reg: 0x83, val: 0x55},
					{reg: 0xA3, val: 0x55},
					{reg: 0xC3, val: 0x55},
					{reg: 0xE3, val: 0x55},
					{reg: 0xB0, val: 0x25},
					{delay: 10},
					{reg: 0xB0, val: 0x05},
					{delay: 10},
					{reg: 0x43, val: 0xC8}, // outputLevel=8
					{reg: 0xB0, val: 0x25},
					{delay: 10},
					{reg: 0xB0, val: 0x05},
					{delay: 10},
					{reg: 0x43, val: 0xFF}, // outputLevel=0x3F
					{reg: 0xB0, val: 0x25},
					{delay: 10},
					{reg: 0xB0, val: 0x05},
				], defaultTempo);

				assert.ok(patches[0], 'Failed to supply patch 0');
				assert.equal(patches[0].channelType, Music.ChannelType.OPL);
				assert.equal(patches.length, 1, 'Wrong number of patches read');

				assert.ok(events[1], 'Missing event');
				assert.equal(events[1].type, Music.NoteOnEvent, 'Wrong event type');
				assert.equal(events[1].velocity, 1);
				assert.equal(events[1].instrument, 0);

				assert.ok(events[5], 'Missing event');
				assert.equal(events[5].type, Music.NoteOnEvent, 'Wrong event type');
				TestUtil.almostEqual(events[5].velocity, 0.4716);
				assert.equal(events[5].instrument, 0);

				assert.ok(events[9], 'Missing event');
				assert.equal(events[9].type, Music.NoteOnEvent, 'Wrong event type');
				assert.equal(events[9].velocity, 0);
				assert.equal(events[9].instrument, 0);
			});

		}); // patch handling

	}); // OPL patch

	it('should handle melodic notes', function() {
		const { patches, events } = UtilOPL.parseOPL([
			{reg: 0x20, val: 0x01},
			{reg: 0x40, val: 0x23},
			{reg: 0x60, val: 0x45},
			{reg: 0x80, val: 0x67},
			{reg: 0xA0, val: 0x89},
			{reg: 0xC0, val: 0xAB},
			{reg: 0xE0, val: 0xCD},
			{reg: 0xB0, val: 0x38},
			{delay: 10},
			{reg: 0xB0, val: 0x18},
		], defaultTempo);

		assert.ok(events[1], 'Missing event');
		assert.equal(events[1].type, Music.NoteOnEvent, 'Wrong event type');
		TestUtil.almostEqual(events[1].freq, 169.928);
		TestUtil.almostEqual(events[1].velocity, 1);

		assert.ok(events[2]);
		assert.equal(events[2].ticks, 10, 'Wrong delay value');

		assert.ok(events[3]);
		assert.equal(events[3].type, Music.NoteOffEvent, 'Wrong event type');

		assert.equal(events.length, 4, 'Incorrect number of events produced');

		assert.ok(patches[0], 'Failed to supply patch');
		assert.equal(patches[0].channelType, Music.ChannelType.OPL);
		assert.equal(patches[0].slot[0].enableTremolo, 0);
		assert.equal(patches[0].slot[0].attackRate, 0x4);
		assert.equal(patches[0].slot[0].decayRate, 0x5);
	});

	it('should handle fnum=0', function() {
		const { events } = UtilOPL.parseOPL([
			{reg: 0xA0, val: 0x00},
			{reg: 0xB0, val: 0x20},
			{delay: 10},
			{reg: 0xB0, val: 0x00},
		], defaultTempo);

		assert.ok(events[1], 'Missing event');
		assert.equal(events[1].type, Music.NoteOnEvent, 'Wrong event type');
		TestUtil.almostEqual(events[1].freq, 0);

		assert.ok(events[2]);
		assert.equal(events[2].ticks, 10, 'Wrong delay value');

		assert.ok(events[3]);
		assert.equal(events[3].type, Music.NoteOffEvent, 'Wrong event type');

		assert.equal(events.length, 4, 'Incorrect number of events produced');
	});

	describe('should handle percussive notes', function() {

		it('should handle hi-hat (HH)', function() {
			const { patches, events } = UtilOPL.parseOPL([
				{reg: 0xBD, val: 0x20},
				{reg: 0x20 + 0x11, val: 0x01},
				{reg: 0x40 + 0x11, val: 0x80},
				{reg: 0x60 + 0x11, val: 0x45},
				{reg: 0x80 + 0x11, val: 0x67},
				{reg: 0xA7, val: 0x89},
				{reg: 0xB7, val: 0x18},
				{reg: 0xC0 + 0x11, val: 0xAB},
				{reg: 0xE0 + 0x11, val: 0xCD},
				{reg: 0xBD, val: 0x21},
				{delay: 10},
				{reg: 0xBD, val: 0x20},
			], defaultTempo);

			assert.ok(events[1]);
			assert.equal(events[1].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[1].option, Music.ConfigurationEvent.Option.EnableRhythm, 'Wrong ConfigurationEvent option');
			assert.equal(events[1].value, true, 'Wrong ConfigurationEvent value');

			assert.ok(events[2], 'Missing event');
			assert.equal(events[2].type, Music.NoteOnEvent, 'Wrong event type');
			TestUtil.almostEqual(events[2].freq, 169.928);
			TestUtil.almostEqual(events[2].velocity, 1);
			assert.equal(events[2].custom.oplChannel, 7, 'Wrong source OPL channel');

			assert.ok(events[4], 'Missing event');
			assert.equal(events[4].type, Music.NoteOffEvent, 'Wrong event type');

			assert.ok(patches[0], 'Failed to supply patch');
			assert.equal(patches[0].channelType, Music.ChannelType.OPL);
			assert.ok(patches[0].slot[0], 'Slot/operator 0 settings missing from patch');
			assert.ok(!patches[0].slot[1], 'Slot/operator 1 settings incorrectly present in patch');
			assert.equal(patches[0].slot[0].attackRate, 0x4);
		});

		it('should handle top cymbal (CY)', function() {
			const { patches, events } = UtilOPL.parseOPL([
				{reg: 0xBD, val: 0x20},
				{reg: 0x20 + 0x15, val: 0x01},
				{reg: 0x40 + 0x15, val: 0x80},
				{reg: 0x60 + 0x15, val: 0x45},
				{reg: 0x80 + 0x15, val: 0x67},
				{reg: 0xA8, val: 0x89},
				{reg: 0xB8, val: 0x18},
				{reg: 0xC0 + 0x15, val: 0xAB},
				{reg: 0xE0 + 0x15, val: 0xCD},
				{reg: 0xBD, val: 0x22},
				{delay: 10},
				{reg: 0xBD, val: 0x20},
			], defaultTempo);

			assert.ok(events[1]);
			assert.equal(events[1].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[1].option, Music.ConfigurationEvent.Option.EnableRhythm, 'Wrong ConfigurationEvent option');
			assert.equal(events[1].value, true, 'Wrong ConfigurationEvent value');

			assert.ok(events[2], 'Missing event');
			assert.equal(events[2].type, Music.NoteOnEvent, 'Wrong event type');
			TestUtil.almostEqual(events[2].freq, 169.928);
			TestUtil.almostEqual(events[2].velocity, 1);
			assert.equal(events[2].custom.oplChannel, 8, 'Wrong source OPL channel');

			assert.ok(events[4], 'Missing event');
			assert.equal(events[4].type, Music.NoteOffEvent, 'Wrong event type');

			assert.ok(patches[0], 'Failed to supply patch');
			assert.equal(patches[0].channelType, Music.ChannelType.OPL);
			assert.ok(patches[0].slot[1], 'Slot/operator 1 settings missing from patch');
			assert.ok(!patches[0].slot[0], 'Slot/operator 0 settings incorrectly present in patch');
			assert.equal(patches[0].slot[1].attackRate, 0x4);
		});

		it('should handle tom-tom (TT)', function() {
			const { patches, events } = UtilOPL.parseOPL([
				{reg: 0xBD, val: 0x20},
				{reg: 0x20 + 0x12, val: 0x01},
				{reg: 0x40 + 0x12, val: 0x80},
				{reg: 0x60 + 0x12, val: 0x45},
				{reg: 0x80 + 0x12, val: 0x67},
				{reg: 0xA8, val: 0x89},
				{reg: 0xB8, val: 0x18},
				{reg: 0xC0 + 0x12, val: 0xAB},
				{reg: 0xE0 + 0x12, val: 0xCD},
				{reg: 0xBD, val: 0x24},
				{delay: 10},
				{reg: 0xBD, val: 0x20},
			], defaultTempo);

			assert.ok(events[1]);
			assert.equal(events[1].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[1].option, Music.ConfigurationEvent.Option.EnableRhythm, 'Wrong ConfigurationEvent option');
			assert.equal(events[1].value, true, 'Wrong ConfigurationEvent value');

			assert.ok(events[2], 'Missing event');
			assert.equal(events[2].type, Music.NoteOnEvent, 'Wrong event type');
			TestUtil.almostEqual(events[2].freq, 169.928);
			TestUtil.almostEqual(events[2].velocity, 1);
			assert.equal(events[2].custom.oplChannel, 8, 'Wrong source OPL channel');

			assert.ok(events[4], 'Missing event');
			assert.equal(events[4].type, Music.NoteOffEvent, 'Wrong event type');

			assert.ok(patches[0], 'Failed to supply patch');
			assert.equal(patches[0].channelType, Music.ChannelType.OPL);
			assert.ok(patches[0].slot[0], 'Slot/operator 0 settings missing from patch');
			assert.ok(!patches[0].slot[1], 'Slot/operator 1 settings incorrectly present in patch');
			assert.equal(patches[0].slot[0].attackRate, 0x4);
		});

		it('should handle snare drum (SD)', function() {
			const { patches, events } = UtilOPL.parseOPL([
				{reg: 0xBD, val: 0x20},
				{reg: 0x20 + 0x14, val: 0x01},
				{reg: 0x40 + 0x14, val: 0x80},
				{reg: 0x60 + 0x14, val: 0x45},
				{reg: 0x80 + 0x14, val: 0x67},
				{reg: 0xA7, val: 0x89},
				{reg: 0xB7, val: 0x18},
				{reg: 0xC0 + 0x14, val: 0xAB},
				{reg: 0xE0 + 0x14, val: 0xCD},
				{reg: 0xBD, val: 0x28},
				{delay: 10},
				{reg: 0xBD, val: 0x20},
			], defaultTempo);

			assert.ok(events[1]);
			assert.equal(events[1].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[1].option, Music.ConfigurationEvent.Option.EnableRhythm, 'Wrong ConfigurationEvent option');
			assert.equal(events[1].value, true, 'Wrong ConfigurationEvent value');

			assert.ok(events[2], 'Missing event');
			assert.equal(events[2].type, Music.NoteOnEvent, 'Wrong event type');
			TestUtil.almostEqual(events[2].freq, 169.928);
			TestUtil.almostEqual(events[2].velocity, 1);
			assert.equal(events[2].custom.oplChannel, 7, 'Wrong source OPL channel');

			assert.ok(events[4], 'Missing event');
			assert.equal(events[4].type, Music.NoteOffEvent, 'Wrong event type');

			assert.ok(patches[0], 'Failed to supply patch');
			assert.equal(patches[0].channelType, Music.ChannelType.OPL);
			assert.ok(patches[0].slot[1], 'Slot/operator 1 settings missing from patch');
			assert.ok(!patches[0].slot[0], 'Slot/operator 0 settings incorrectly present in patch');
			assert.equal(patches[0].slot[1].attackRate, 0x4);
		});

		it('should handle bass drum (BD)', function() {
			const { patches, events } = UtilOPL.parseOPL([
				{reg: 0xBD, val: 0x20},
				{reg: 0x20 + 0x10, val: 0x01},
				{reg: 0x40 + 0x10, val: 0x23},
				{reg: 0x60 + 0x10, val: 0x45},
				{reg: 0x80 + 0x10, val: 0x67},
				{reg: 0xC0 + 0x10, val: 0xAB},
				{reg: 0xE0 + 0x10, val: 0xCD},
				{reg: 0x20 + 0x13, val: 0x12},
				{reg: 0x40 + 0x13, val: 0x80},
				{reg: 0x60 + 0x13, val: 0x56},
				{reg: 0x80 + 0x13, val: 0x78},
				{reg: 0xA6, val: 0x89},
				{reg: 0xB6, val: 0x18},
				{reg: 0xC0 + 0x13, val: 0x9A},
				{reg: 0xE0 + 0x13, val: 0xBC},
				{reg: 0xBD, val: 0x30},
				{delay: 10},
				{reg: 0xBD, val: 0x20},
			], defaultTempo);

			assert.ok(events[1]);
			assert.equal(events[1].type, Music.ConfigurationEvent, 'Wrong event type');
			assert.equal(events[1].option, Music.ConfigurationEvent.Option.EnableRhythm, 'Wrong ConfigurationEvent option');
			assert.equal(events[1].value, true, 'Wrong ConfigurationEvent value');

			assert.ok(events[2], 'Missing event');
			assert.equal(events[2].type, Music.NoteOnEvent, 'Wrong event type');
			TestUtil.almostEqual(events[2].freq, 169.928);
			TestUtil.almostEqual(events[2].velocity, 1);
			assert.equal(events[2].custom.oplChannel, 6, 'Wrong source OPL channel');

			assert.ok(events[4], 'Missing event');
			assert.equal(events[4].type, Music.NoteOffEvent, 'Wrong event type');

			assert.ok(patches[0], 'Failed to supply patch');
			assert.equal(patches[0].channelType, Music.ChannelType.OPL);
			assert.ok(patches[0].slot[0], 'Slot/operator 0 settings missing from patch');
			assert.ok(patches[0].slot[1], 'Slot/operator 1 settings missing from patch');
			assert.equal(patches[0].slot[0].attackRate, 0x4);
			assert.equal(patches[0].slot[1].attackRate, 0x5);
		});

	});

	it('should handle tempo changes', function() {
		const { events } = UtilOPL.parseOPL([
			{reg: 0x01, val: 0x20},
			{delay: 10},
			{tempo: new Music.TempoEvent({usPerTick: 2000})},
			{reg: 0x01, val: 0x21}, // no-op
			{delay: 20},
			{tempo: new Music.TempoEvent({usPerTick: 3000})},
			{delay: 30},
			{tempo: new Music.TempoEvent({usPerTick: 4000})},
		], defaultTempo);

		assert.ok(events[0]);
		assert.equal(events[0].type, Music.TempoEvent, 'Wrong event type');
		assert.equal(events[0].usPerTick, 1000, 'Wrong tempo value');

		assert.ok(events[3]);
		assert.equal(events[3].type, Music.TempoEvent, 'Wrong event type');
		assert.equal(events[3].usPerTick, 2000, 'Wrong tempo value');

		assert.ok(events[5]);
		assert.equal(events[5].type, Music.TempoEvent, 'Wrong event type');
		assert.equal(events[5].usPerTick, 3000, 'Wrong tempo value');

		assert.ok(events[6]);
		assert.equal(events[6].ticks, 30, 'Wrong delay value');

		assert.ok(events[7]);
		assert.equal(events[7].type, Music.TempoEvent, 'Wrong event type');
		assert.equal(events[7].usPerTick, 4000, 'Wrong tempo value');

		assert.equal(events.length, 8, 'Incorrect number of events produced');
	});

	it('should ignore zero-delay keyons', function() {
		const { events } = UtilOPL.parseOPL([
			{reg: 0xB0, val: 0x20},
			{delay: 10},
			{reg: 0xB0, val: 0x00},
			{delay: 10},
			{reg: 0xB0, val: 0x20}, // useless keyon
			{reg: 0xB0, val: 0x00}, // immediately turned off again
			{delay: 10},
			{reg: 0xB0, val: 0x20},
			{reg: 0xB0, val: 0x00},
			{reg: 0xB0, val: 0x20},
			{reg: 0xB0, val: 0x00},
			{delay: 10},
		], defaultTempo);

		assert.ok(events[1], 'Missing event');
		assert.equal(events[1].type, Music.NoteOnEvent, 'Wrong event type');

		assert.ok(events[2]);
		assert.equal(events[2].type, Music.DelayEvent, 'Wrong event type');
		assert.equal(events[2].ticks, 10, 'Wrong delay value');

		assert.ok(events[3], 'Missing event');
		assert.equal(events[3].type, Music.NoteOffEvent, 'Wrong event type');

		assert.ok(events[4]);
		assert.equal(events[4].type, Music.DelayEvent, 'Wrong event type');
		assert.equal(events[4].ticks, 30, 'Wrong delay value');

		assert.equal(events.length, 5, 'Incorrect number of events produced');
	});

	it('should handle zero-delay keyoffs for melodic instruments', function() {
		const { events } = UtilOPL.parseOPL([
			{reg: 0xB0, val: 0x20},
			{delay: 10},
			{reg: 0xB0, val: 0x00},
			{reg: 0xB0, val: 0x20}, // immediate re-keyon
			{delay: 10},
			{reg: 0xB0, val: 0x00},
			{reg: 0xB0, val: 0x20}, // should be ignored (overridden below)
			{reg: 0xB0, val: 0x00},
			{reg: 0xB0, val: 0x20}, // another immediate re-keyon
			{delay: 10},
			{reg: 0xB0, val: 0x00},
		], defaultTempo);

		assert.ok(events[1], 'Missing event');
		assert.equal(events[1].type, Music.NoteOnEvent, 'Wrong event type');

		assert.ok(events[2]);
		assert.equal(events[2].type, Music.DelayEvent, 'Wrong event type');
		assert.equal(events[2].ticks, 10, 'Wrong delay value');

		assert.ok(events[3], 'Missing event');
		assert.equal(events[3].type, Music.NoteOffEvent, 'Wrong event type');

		assert.ok(events[4], 'Missing event');
		assert.equal(events[4].type, Music.NoteOnEvent, 'Wrong event type');

		assert.ok(events[5]);
		assert.equal(events[5].type, Music.DelayEvent, 'Wrong event type');
		assert.equal(events[5].ticks, 10, 'Wrong delay value');

		assert.ok(events[6], 'Missing event');
		assert.equal(events[6].type, Music.NoteOffEvent, 'Wrong event type');

		assert.ok(events[7], 'Missing event');
		assert.equal(events[7].type, Music.NoteOnEvent, 'Wrong event type');

		assert.ok(events[8]);
		assert.equal(events[8].type, Music.DelayEvent, 'Wrong event type');
		assert.equal(events[8].ticks, 10, 'Wrong delay value');

		assert.ok(events[9], 'Missing event');
		assert.equal(events[9].type, Music.NoteOffEvent, 'Wrong event type');

		assert.equal(events.length, 10, 'Incorrect number of events produced');
	});

	it('should handle zero-delay keyoffs for rhythm instruments', function() {
		const { events } = UtilOPL.parseOPL([
			{reg: 0xBD, val: 0x20},
			{reg: 0xBD, val: 0x21},
			{delay: 10},
			{reg: 0xBD, val: 0x20},
			{reg: 0xBD, val: 0x21}, // immediate re-keyon
			{delay: 10},
			{reg: 0xBD, val: 0x20},
			{reg: 0xBD, val: 0x21}, // should be ignored (overridden below)
			{reg: 0xBD, val: 0x20},
			{reg: 0xBD, val: 0x21}, // another immediate re-keyon
			{delay: 10},
			{reg: 0xBD, val: 0x20},
		], defaultTempo);

		assert.ok(events[1], 'Missing event');
		assert.equal(events[1].type, Music.ConfigurationEvent, 'Wrong event type');

		assert.ok(events[2], 'Missing event');
		assert.equal(events[2].type, Music.NoteOnEvent, 'Wrong event type');

		assert.ok(events[3]);
		assert.equal(events[3].type, Music.DelayEvent, 'Wrong event type');
		assert.equal(events[3].ticks, 10, 'Wrong delay value');

		assert.ok(events[4], 'Missing event');
		assert.equal(events[4].type, Music.NoteOffEvent, 'Wrong event type');

		assert.ok(events[5], 'Missing event');
		assert.equal(events[5].type, Music.NoteOnEvent, 'Wrong event type');

		assert.ok(events[6]);
		assert.equal(events[6].type, Music.DelayEvent, 'Wrong event type');
		assert.equal(events[6].ticks, 10, 'Wrong delay value');

		assert.ok(events[7], 'Missing event');
		assert.equal(events[7].type, Music.NoteOffEvent, 'Wrong event type');

		assert.ok(events[8], 'Missing event');
		assert.equal(events[8].type, Music.NoteOnEvent, 'Wrong event type');

		assert.ok(events[9]);
		assert.equal(events[9].type, Music.DelayEvent, 'Wrong event type');
		assert.equal(events[9].ticks, 10, 'Wrong delay value');

		assert.ok(events[10], 'Missing event');
		assert.equal(events[10].type, Music.NoteOffEvent, 'Wrong event type');

		assert.equal(events.length, 11, 'Incorrect number of events produced');
	});

}); // parseOPL() tests
