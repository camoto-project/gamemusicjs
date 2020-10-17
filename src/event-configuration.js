/*
 * ConfigurationEvent class.
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

const Event = require('./event.js');

/**
 * Event for when a synthesizer is being programmed.
 *
 * These events are typically global and the channel is usually not important.
 *
 * @property {Music.ConfigurationEvent.Option} option
 *   Option being configured by this event.
 *
 * @property {Any} value
 *   Value being set.
 */
class ConfigurationEvent extends Event {
	constructor(params = {}) {
		super('ConfigurationEvent', ConfigurationEvent, params);

		this.option = params.option;
		this.value = params.value;
	}

	clone() {
		return new ConfigurationEvent({
			custom: this.custom,
			option: this.option,
			value: this.value,
		});
	}

	toString() {
		const optionName = Object.keys(ConfigurationEvent.Option).find(k => ConfigurationEvent.Option[k] === this.option) || '?';
		return `[ConfigurationEvent O:${this.option}/${optionName} V:${this.value}]`;
	}

	static optionNameToString(o) {
		return Object.keys(ConfigurationEvent.Option).find(k => ConfigurationEvent.Option[k] === o);
	}
};

/**
 * Option being modified by a ConfigurationEvent.
 *
 * @enum {Number}
 */
ConfigurationEvent.Option = {
	/**
	 * No operation.
	 *
	 * Dummy event that doesn't do anything.  Can be placed last in a file if
	 * there is a trailing delay.
	 */
	EmptyEvent: 0,

	/**
	 * Enable OPL3 mode (or limit to OPL2).
	 *
	 * Value: `true` for OPL3 mode, `false` for OPL2 mode.
	 */
	EnableOPL3: 1,

	/**
	 * Extend range of OPL tremolo.
	 *
	 * Value: bit0 = 1 to enable, 0 to disable
	 *        bit1 = 0-1 as chip index
	 */
	EnableDeepTremolo: 2,

	/**
	 * Extend range of OPL vibrato.
	 *
	 * Value: bit0 = 1 to enable, 0 to disable
	 *        bit1 = 0-1 as chip index
	 */
	EnableDeepVibrato: 3,

	/**
	 * Enable OPL rhythm mode.
	 *
	 * Value: `true` to enable, `false` to disable.
	 *
	 * This is used by the CMF handler and MIDI controller event 0x67.
	 */
	EnableRhythm: 4,

	/**
	 * Enable use of wave selection registers.
	 *
	 * Value: `true` to enable, `false` to disable.
	 */
	EnableWaveSel: 5,
};

module.exports = ConfigurationEvent;
