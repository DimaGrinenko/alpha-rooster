'use client';
import type {ComponentProps} from 'react';
import {UiSurface,UiIcon} from './UiArt';
export const FEATURE_ATLAS='./assets/ui-surfaces-v15.webp';
export function FeatureArt({kind,className=''}:{kind:'panel'|'button'|'bonus';className?:string}){
 if(kind==='bonus')return <UiIcon name="bonus" className={'feature-art '+className}/>;
 return <UiSurface kind={kind} className={'feature-art '+className}/>;
}
export function FeatureButton({children,className='',...props}:ComponentProps<'button'>){
 return <button {...props} className={'feature-button '+className}><FeatureArt kind="button"/><span>{children}</span></button>;
}
