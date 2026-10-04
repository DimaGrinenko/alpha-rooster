'use client';
import type {ComponentProps} from 'react';
import {UiSurface} from './UiArt';
export default function ActionButton({children,className='',...props}:ComponentProps<'button'>){
 return <button className={'primary-button '+className} {...props}><UiSurface kind="button" className="button-surface"/>{children}</button>;
}
