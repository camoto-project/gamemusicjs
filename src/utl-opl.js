/*
 * OPL utility functions.
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

const Debug = require('./utl-debug.js')('utl-opl');
const Music = require('./music.js');

/**
 * Utility functions for OPL operations.
 */
class UtilOPL
{
	/**
	 * Is the given value a valid OPL register?
	 *
	 * @param {Number} reg
	 *   OPL register to check.
	 *
	 * @return {Boolean} true if register is valid, false if the number is not a
	 *   valid OPL register.
	 */
	static validRegister(reg) {
		return !(
			(reg == 0x06)
			|| (reg == 0x07)
			|| ((reg >= 0x09) && (reg <= 0x1F))
			|| ((reg >= 0x36) && (reg <= 0x3F))
			|| ((reg >= 0x56) && (reg <= 0x5F))
			|| ((reg >= 0x76) && (reg <= 0x7F))
			|| ((reg >= 0x96) && (reg <= 0x9F))
			|| ((reg >= 0xA9) && (reg <= 0xAF))
			|| ((reg >= 0xB9) && (reg <= 0xBC))
			|| ((reg >= 0xBE) && (reg <= 0xBF))
			|| ((reg >= 0xC9) && (reg <= 0xDF))
			|| (reg >= 0xF6)
		);
	}

	/**
	 * Convert a logarithmic volume into a gamemusicjs linear velocity.
	 *
	 * @param {Number} vol
	 *   Logarithmic volume value, with 0 being silent, and `max` being loudest.
	 *
	 * @param {Number} max
	 *   Maximum value of `vol`.
	 *
	 * @return Linear value between 0.0 and 1.0 inclusive, with 0 being silent
	 *   and 1 being loudest.
	 */
	static log_volume_to_lin_velocity(vol, max) {
		return (1 - Math.log(max + 1 - vol) / Math.log(max + 1));
	}

	/**
	 * Convert a gamemusicjs linear velocity into a logarithmic volume value.
	 *
	 * @param {Number} vel
	 *   Linear velocity, with 0.0 being silent, and 1.0 being loudest.
	 *
	 * @param {Number} max
	 *   Maximum value of the return value, when `vel` is 1.
	 *
	 * @return {Number} Logarithmic value between 0 and max inclusive.
	 */
	static lin_velocity_to_log_volume(vel, max) {
		return Math.round((max + 1) - Math.pow(max + 1, 1 - vel));
	}

	static fnumToFrequency(fnum, block, conversionFactor = 49716) {
		if ((block < 0) || (block >= 8)) {
			throw new Error(`Cannot convert OPL fnum to frequency: block ${block} is out of range (0..7).`);
		}
		if ((fnum < 0) || (fnum >= 1024)) {
			throw new Error(`Cannot convert OPL fnum to frequency: fnum ${fnum} is out of range (0..1023).`);
		}

		return (conversionFactor * fnum) * Math.pow(2, block - 20);
	}

	static frequencyToFnum(freq, curBlock, conversionFactor = 49716) {
		const debug = Debug.extend('frequencyToFnum');

		// Special case to avoid divide by zero
		if (freq === 0) {
			return {
				block: curBlock, // any block will work
				fnum: 0,
				clip: false,
			};
		}

		// Special case for frequencies too high to produce
		if (freq > 6208.431) {
			return {
				block: 7,
				fnum: 1023,
				clip: true,
			};
		}

		// Original formula
		const getFnum = (f, b) => Math.round(f * Math.pow(2, 20 - b) / conversionFactor);

		// Slightly more efficient version
		//const getFnum = (f, b) => ((f << (20 - b)) / conversionFactor + 0.5) >>> 0;

		if (curBlock <= 7) {
			// We've already got a block, see if we can use that
			const fnum = getFnum(freq, curBlock);
			if ((fnum > 100) && (fnum < 900)) {
				// Fits in the middle of the existing block pretty well, so let's keep it
				return {
					block: curBlock,
					fnum: fnum >>> 0,
					clip: false,
				};
			}
		}

		/// This formula will provide a pretty good estimate as to the best block to
		/// use for a given frequency.  It tries to use the lowest possible block
		/// number that is capable of representing the given frequency.  This is
		/// because as the block number increases, the precision decreases (i.e. there
		/// are larger steps between adjacent note frequencies.)  The 6M constant is
		/// the largest frequency (in milliHertz) that can be represented by the
		/// block/fnum system.
		//int invertedBlock = log2(6208431 / milliHertz);

		// Very low frequencies will produce very high inverted block numbers, but
		// as they can all be covered by inverted block 7 (block 0) we can just clip
		// the value.
		//if (invertedBlock > 7) invertedBlock = 7;
		//*block = 7 - invertedBlock;

		let block;

		// This is a bit more efficient and doesn't need log2() from math.h
		/*
		if (freq > 3104.215) *block = 7;
		else if (freq > 1552.107) *block = 6;
		else if (freq > 776.053) *block = 5;
		else if (freq > 388.026) *block = 4;
		else if (freq > 194.013) *block = 3;
		else if (freq > 97.006) *block = 2;
		else if (freq > 48.503) *block = 1;
		else *block = 0;
		*/
		// Do it based on octave instead
		if (freq > 2048) block = 7;
		else if (freq > 1024) block = 6;
		else if (freq > 512) block = 5;
		else if (freq > 256) block = 4;
		else if (freq > 128) block = 3;
		else if (freq > 64) block = 2;
		else if (freq > 32) block = 1;
		else block = 0;

		let fnum = getFnum(freq, block);

		let clip = false;
		if ((block === 7) && (fnum > 1023)) {
			debug(`Clipped ${freq} Hz due to block=7, fnum=${fnum}`);
			clip = true;
			fnum = 1023;
		}

		return {
			block: block,
			fnum: fnum >>> 0,
			clip: clip,
		};
	}

	/**
	 * Supplied with a channel, return the offset from a base OPL register for the
	 * first operator/slot (modulator).
	 *
	 * For example, channel 4's modulator is operator 7 which is at offset 0x09.
	 * Since 0x60 is the attack/decay function, register 0x69 will thus set the
	 * attack/decay for channel 4's modulator (slot 0).
	 *
	 * @param {Number} channel
	 *   OPL channel.  Channels go from 0 to 8 inclusive for OPL2/3, and 0 to 17
	 *   inclusive for OPL3.
	 *
	 * @param {Number} slot
	 *   Which slot (operator) to use.  0 is the modulator, 1 is the carrier, and
	 *   2 and 3 are used when the channel is in four-operator mode.
	 *
	 * @return {Number} Offset into OPL register map for the given channel's
	 *   slot/operator.  The offset has 0x100 added to it for offsets in the
	 *   second chip's register map (or OPL3 upper registers), which will only
	 *   be seen for channels >= 9.
	 */
	static oplOperatorOffset(channel, slot) {
		const chipOffset = 0x100 * (channel / 9 >>> 0);
		const chipChannel = channel % 9;
		return (
			chipOffset
			+ (chipChannel / 3 >>> 0) * 8
			+ (chipChannel % 3)
			+ slot * 3
			+ (slot / 2 >>> 0) * 2
		);
	}

	/**
	 * Extract the OPL settings into an object.
	 *
	 * @param {Array<Number>} regs
	 *   OPL register array, 512 elements (256 registers by two chips).
	 *
	 * @param {Number} channel
	 *   OPL channel to extract, 0..8 for OPL2/3 channels 1..9, 9..17 for OPL3
	 *   channels 10..18.
	 *
	 * For rhythm-mode, the caller will need to extract the relevant operator from
	 * the returned object's `slot[0]` or `slot[1]` property.
	 *
	 * @return {Object} Current channel settings.
	 */
	static getChannelSettings(regs, channel, slots) {
		const chipOffset = 0x100 * (channel / 9 >>> 0);
		const chipChannel = channel % 9;

		function getOp(chipOperOffset) {
			return {
				enableTremolo: (regs[UtilOPL.BASE_CHAR_MULT + chipOperOffset] >> 7) & 1,
				enableVibrato: (regs[UtilOPL.BASE_CHAR_MULT + chipOperOffset] >> 6) & 1,
				enableSustain: (regs[UtilOPL.BASE_CHAR_MULT + chipOperOffset] >> 5) & 1,
				enableKSR:     (regs[UtilOPL.BASE_CHAR_MULT + chipOperOffset] >> 4) & 1,
				freqMult:       regs[UtilOPL.BASE_CHAR_MULT + chipOperOffset] & 0x0F,
				scaleLevel:     regs[UtilOPL.BASE_SCAL_LEVL + chipOperOffset] >> 6,
				outputLevel:    regs[UtilOPL.BASE_SCAL_LEVL + chipOperOffset] & 0x3F,
				attackRate:     regs[UtilOPL.BASE_ATCK_DCAY + chipOperOffset] >> 4,
				decayRate:      regs[UtilOPL.BASE_ATCK_DCAY + chipOperOffset] & 0x0F,
				sustainRate:    regs[UtilOPL.BASE_SUST_RLSE + chipOperOffset] >> 4,
				releaseRate:    regs[UtilOPL.BASE_SUST_RLSE + chipOperOffset] & 0x0F,
				waveSelect:     regs[UtilOPL.BASE_WAVE      + chipOperOffset] & 0x07,
			};
		}

		const regOffset = chipOffset + chipChannel;

		let patch = new Music.Patch.OPL({
			slot: [],
			feedback: (regs[UtilOPL.BASE_FEED_CONN + regOffset] >> 1) & 0x07,
			connection: regs[UtilOPL.BASE_FEED_CONN + regOffset] & 1,
		});

		// If slot[1] == 2 then get slot 1 and store it in patch.slot[2].
		for (let s = 0; s < 4; s++) {
			if ((slots[s] < 0) || (slots[s] === undefined)) continue;
			const operatorOffset = this.oplOperatorOffset(channel, s);
			patch.slot[slots[s]] = getOp(operatorOffset);
		}

		return {
			fnum: ((regs[UtilOPL.BASE_KEYON_FREQ + regOffset] & 0x3) << 8)
				| regs[UtilOPL.BASE_FNUM_L + regOffset],
			block: ((regs[UtilOPL.BASE_KEYON_FREQ + regOffset] >> 2) & 0x7),
			noteOn: !!(regs[UtilOPL.BASE_KEYON_FREQ + regOffset] & 0x20),
			panLeft: !!(regs[UtilOPL.BASE_FEED_CONN + regOffset] & 0x10),
			panRight: !!(regs[UtilOPL.BASE_FEED_CONN + regOffset] & 0x20),
			patch: patch,
		};
	}

	// slots = [x, y] means load patch.slot[0] into slot[x] and patch.slot[1] into
	// slot[y].  This allows single-slot patches to be loaded into slot 0 or 1 for
	// rhythm mode.
	static setPatch(oplState, channel, slots, patch) {
		function setOp(chipOperOffset, op) {
			oplState[UtilOPL.BASE_CHAR_MULT + chipOperOffset] =
				(op.enableTremolo ? 0x80 : 0)
				| (op.enableVibrato ? 0x40 : 0)
				| (op.enableSustain ? 0x20 : 0)
				| (op.enableKSR ? 0x10 : 0)
				| (op.freqMult & 0x0F)
			;
			oplState[UtilOPL.BASE_SCAL_LEVL + chipOperOffset] =
				(op.scaleLevel & 0x03) << 6
				| (op.outputLevel & 0x3F)
			;
			oplState[UtilOPL.BASE_ATCK_DCAY + chipOperOffset] =
				(op.attackRate & 0x0F) << 4
				| (op.decayRate & 0x0F)
			;
			oplState[UtilOPL.BASE_SUST_RLSE + chipOperOffset] =
				(op.sustainRate & 0x0F) << 4
				| (op.releaseRate & 0x0F)
			;
			oplState[UtilOPL.BASE_WAVE + chipOperOffset] = op.waveSelect & 0x07;
		}

		for (let s = 0; s < 3; s++) {
			if (slots[s] >= 0) {
				if (!patch.slot[slots[s]]) {
					const hasSlots = Object.keys(patch.slot).join(', ');
					throw new Error(`Tried to assign patch ("${patch.title}") to `
						+ `slot/operator ${s} but this patch only has settings for `
						+ `operators [${hasSlots}].`);
				}
				const operatorOffset = this.oplOperatorOffset(channel, s);
				setOp(operatorOffset, patch.slot[slots[s]]);
			}
		}
		const chipOffset = 0x100 * (channel / 9 >>> 0);
		const chipChannel = channel % 9;
		const regOffset = chipOffset + chipChannel;
		oplState[UtilOPL.BASE_FEED_CONN + regOffset] =
			((patch.feedback & 0x07) << 1)
			| (patch.connection & 0x01)
		;
	}

	/**
	 * Find the given patch in a list of instruments, appending it if it's new.
	 *
	 * Postconditions: `patches` may have the new `target` patch appended to it.
	 *
	 * @param {Array<Patch>} patches
	 *   List of known patches.  If the target patch is found in this list the
	 *   index into this array is returned, otherwise `target` is appended onto
	 *   `patches` and the index of this newly added item is returned.
	 *
	 * @param {Patch} target
	 *   The patch being searched for.
	 *
	 * @return {Number} Index into `patches` where the instrument can be found.
	 */
	static findAddPatch(patches, target) {
		const debug = Debug.extend('findAddPatch');

		const idx = patches.findIndex(p => target.equalTo(p));
		if (idx >= 0) return idx;

		// Patch not found, add it.
		debug(`Found new patch: ${target}`);
		return patches.push(target) - 1;
	}

	/**
	 * Callback function for `UtilMusic.splitEvents()` for standard OPL split.
	 *
	 * If OPL data was parsed with `UtilOPL.parseOPL()` then when it is split into
	 * tracks with `UtilMusic.splitEvents()`, this function can be passed as the
	 * callback parameter.
	 *
	 * It will split events up into one OPL channel per track, taking into account
	 * OPL rhythm mode and four-operator channels.
	 */
	static standardTrackSplitConfig(ev) {
		let tc = new Music.TrackConfiguration({
			channelType: ev.custom.oplChannelType || Music.ChannelType.OPLT,
			channelIndex: ev.custom.oplChannelIndex || 1,
		});
		tc.trackIndex = ev.custom.oplChannelIndex || 1;
		if (ev.custom.oplChannelType === Music.ChannelType.OPLR) {
			// Bump the rhythm instruments to tracks following the usual 18 melodic
			// channels.  Empty tracks will be removed later.
			tc.trackIndex += 18;
		}
		return tc;
	}

}

/**
 * Type of rhythm-mode instrument.
 *
 * @enum {Number}
 */
UtilOPL.Rhythm = {
	/**
	 * Normal melodic instrument.
	 */
	NO: 0,

	/**
	 * Hi-hat.
	 */
	HH: 1,

	/**
	 * Top cymbal.
	 */
	CY: 2,

	/**
	 * Tom tom.
	 */
	TT: 3,

	/**
	 * Snare drum.
	 */
	SD: 4,

	/**
	 * Bass drum.
	 */
	BD: 5,
};

UtilOPL.Rhythm.toString = v => Object.keys(UtilOPL.Rhythm)[v] || '??';

UtilOPL.BASE_CHAR_MULT  = 0x20;
UtilOPL.BASE_SCAL_LEVL  = 0x40;
UtilOPL.BASE_ATCK_DCAY  = 0x60;
UtilOPL.BASE_SUST_RLSE  = 0x80;
UtilOPL.BASE_FNUM_L     = 0xA0;
UtilOPL.BASE_KEYON_FREQ = 0xB0;
UtilOPL.BASE_RHYTHM     = 0xBD;
UtilOPL.BASE_WAVE       = 0xE0;
UtilOPL.BASE_FEED_CONN  = 0xC0;

// Values for MusicHandler.metadata().caps.supportedEvents for songs that use
// the standard OPL parse()/generate() functions.
UtilOPL.oplSupportedEvents = [
  new Music.ConfigurationEvent({option: Music.ConfigurationEvent.Option.EmptyEvent}),
  new Music.ConfigurationEvent({option: Music.ConfigurationEvent.Option.EnableOPL3}),
  new Music.ConfigurationEvent({option: Music.ConfigurationEvent.Option.EnableDeepTremolo}),
  new Music.ConfigurationEvent({option: Music.ConfigurationEvent.Option.EnableDeepVibrato}),
  new Music.ConfigurationEvent({option: Music.ConfigurationEvent.Option.EnableRhythm}),
  new Music.ConfigurationEvent({option: Music.ConfigurationEvent.Option.EnableWaveSel}),
  new Music.DelayEvent(),
  new Music.EffectEvent({pitchbend: 1, volume: 1}), // both supported
  new Music.NoteOffEvent(),
  new Music.NoteOnEvent({frequency: 1, velocity: 1, instrument: 1}), // velocity supported
];

module.exports = UtilOPL;

// These must go after module.exports due to cyclic dependencies.
UtilOPL.generateOPL = require('./utl-opl-generate.js');
UtilOPL.parseOPL = require('./utl-opl-parse.js');
