import Clndr, {ClndrTemplateData} from '../';
import {UserEvent} from '@testing-library/user-event/index';

declare global {
	// Using "var" is necessary for the variables to show up on globalThis as per
	// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#type-checking-for-globalthis
	/* eslint-disable no-var */
	var user: UserEvent;
	var container: HTMLElement;
	var clndr: Clndr | null;
	var defaultTemplate: string;
	var provideRender: (template?: string) => (data: ClndrTemplateData) => string
}