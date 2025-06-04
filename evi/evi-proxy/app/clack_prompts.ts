// This code is all lifted from @clack/prompts (94fee2a90148c5c09503e9b6d7179fa740f08d7ei)
// (I added support for AbortSignal https://github.com/bombshell-dev/clack/issues/337)
// MIT License
// Copyright (c) Nate Moore
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import { ConfirmPrompt, SelectKeyPrompt, TextPrompt } from '@clack/core';
import type { State } from '@clack/core';
import type { Readable, Writable } from 'node:stream';
import color from 'picocolors';
import isUnicodeSupported from 'is-unicode-supported';

export { isCancel } from '@clack/core';
interface CommonOptions {
	input?: Readable;
	output?: Writable;
}
export const unicode = isUnicodeSupported();
const unicodeOr = (c: string, fallback: string) => (unicode ? c : fallback);
const S_BAR = unicodeOr('│', '|');
const S_BAR_END = unicodeOr('└', '—');
const S_RADIO_ACTIVE = unicodeOr('●', '>');
const S_RADIO_INACTIVE = unicodeOr('○', ' ');
const S_STEP_ACTIVE = unicodeOr('◆', '*');
const S_STEP_CANCEL = unicodeOr('■', 'x');
const S_STEP_ERROR = unicodeOr('▲', 'x');
const S_STEP_SUBMIT = unicodeOr('◇', 'o');

const symbol = (state: State) => {
	switch (state) {
		case 'initial':
		case 'active':
			return color.cyan(S_STEP_ACTIVE);
		case 'cancel':
			return color.red(S_STEP_CANCEL);
		case 'error':
			return color.yellow(S_STEP_ERROR);
		case 'submit':
			return color.green(S_STEP_SUBMIT);
	}
};

export interface TextOptions extends CommonOptions {
	message: string;
	placeholder?: string;
	defaultValue?: string;
	initialValue?: string;
	validate?: (value: string) => string | Error | undefined;
	signal?: AbortSignal;
}

export const text = (opts: TextOptions) => {
	return new TextPrompt({
		validate: opts.validate,
		placeholder: opts.placeholder,
		defaultValue: opts.defaultValue,
		initialValue: opts.initialValue,
		output: opts.output,
		input: opts.input,
		signal: opts.signal,
		render() {
			const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;
			const placeholder = opts.placeholder
				? color.inverse(opts.placeholder[0]) + color.dim(opts.placeholder.slice(1))
				: color.inverse(color.hidden('_'));
			const value = !this.value ? placeholder : this.valueWithCursor;

			switch (this.state) {
				case 'error':
					return `${title.trim()}\n${color.yellow(S_BAR)}  ${value}\n${color.yellow(
						S_BAR_END
					)}  ${color.yellow(this.error)}\n`;
				case 'submit': {
					const displayValue = this.value === undefined ? '' : this.value;
					return `${title}${color.gray(S_BAR)}  ${color.dim(displayValue)}`;
				}
				case 'cancel':
					return `${title}${color.gray(S_BAR)}  ${color.strikethrough(
						color.dim(this.value ?? '')
					)}${this.value?.trim() ? `\n${color.gray(S_BAR)}` : ''}`;
				default:
					return `${title}${color.cyan(S_BAR)}  ${value}\n${color.cyan(S_BAR_END)}\n`;
			}
		},
	}).prompt() as Promise<string | symbol>;
};

export interface ConfirmOptions extends CommonOptions {
	message: string;
	active?: string;
	inactive?: string;
	initialValue?: boolean;
  signal?: AbortSignal;
}
export const confirm = (opts: ConfirmOptions) => {
	const active = opts.active ?? 'Yes';
	const inactive = opts.inactive ?? 'No';
	return new ConfirmPrompt({
		active,
		inactive,
		input: opts.input,
		output: opts.output,
    signal: opts.signal,
		initialValue: opts.initialValue ?? true,
		render() {
			const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;
			const value = this.value ? active : inactive;

			switch (this.state) {
				case 'submit':
					return `${title}${color.gray(S_BAR)}  ${color.dim(value)}`;
				case 'cancel':
					return `${title}${color.gray(S_BAR)}  ${color.strikethrough(
						color.dim(value)
					)}\n${color.gray(S_BAR)}`;
				default: {
					return `${title}${color.cyan(S_BAR)}  ${
						this.value
							? `${color.green(S_RADIO_ACTIVE)} ${active}`
							: `${color.dim(S_RADIO_INACTIVE)} ${color.dim(active)}`
					} ${color.dim('/')} ${
						!this.value
							? `${color.green(S_RADIO_ACTIVE)} ${inactive}`
							: `${color.dim(S_RADIO_INACTIVE)} ${color.dim(inactive)}`
					}\n${color.cyan(S_BAR_END)}\n`;
				}
			}
		},
	}).prompt() as Promise<boolean | symbol>;
};

type Primitive = Readonly<string | boolean | number>;

export interface SelectOptions<Value> extends CommonOptions {
	message: string;
	options: Option<Value>[];
	initialValue?: Value;
	maxItems?: number;
	signal?: AbortSignal;
}

export type Option<Value> = Value extends Primitive
	? {
			/**
			 * Internal data for this option.
			 */
			value: Value;
			/**
			 * The optional, user-facing text for this option.
			 *
			 * By default, the `value` is converted to a string.
			 */
			label?: string;
			/**
			 * An optional hint to display to the user when
			 * this option might be selected.
			 *
			 * By default, no `hint` is displayed.
			 */
			hint?: string;
		}
	: {
			/**
			 * Internal data for this option.
			 */
			value: Value;
			/**
			 * Required. The user-facing text for this option.
			 */
			label: string;
			/**
			 * An optional hint to display to the user when
			 * this option might be selected.
			 *
			 * By default, no `hint` is displayed.
			 */
			hint?: string;
		};

	export	const selectKey = <Value extends string>(opts: SelectOptions<Value>) => {
			const opt = (
				option: Option<Value>,
				state: 'inactive' | 'active' | 'selected' | 'cancelled' = 'inactive'
			) => {
				const label = option.label ?? String(option.value);
				if (state === 'selected') {
					return `${color.dim(label)}`;
				}
				if (state === 'cancelled') {
					return `${color.strikethrough(color.dim(label))}`;
				}
				if (state === 'active') {
					return `${color.bgCyan(color.gray(` ${option.value} `))} ${label} ${
						option.hint ? color.dim(`(${option.hint})`) : ''
					}`;
				}
				return `${color.gray(color.bgWhite(color.inverse(` ${option.value} `)))} ${label} ${
					option.hint ? color.dim(`(${option.hint})`) : ''
				}`;
			};
		
			return new SelectKeyPrompt({
				options: opts.options,
				input: opts.input,
				output: opts.output,
				initialValue: opts.initialValue,
				signal: opts.signal,
				render() {
					const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;
		
					switch (this.state) {
						case 'submit':
							return `${title}${color.gray(S_BAR)}  ${opt(
								this.options.find((opt) => opt.value === this.value) ?? opts.options[0],
								'selected'
							)}`;
						case 'cancel':
							return `${title}${color.gray(S_BAR)}  ${opt(this.options[0], 'cancelled')}\n${color.gray(
								S_BAR
							)}`;
						default: {
							return `${title}${color.cyan(S_BAR)}  ${this.options
								.map((option, i) => opt(option, i === this.cursor ? 'active' : 'inactive'))
								.join(`\n${color.cyan(S_BAR)}  `)}\n${color.cyan(S_BAR_END)}\n`;
						}
					}
				},
			}).prompt() as Promise<Value | symbol>;
		};
